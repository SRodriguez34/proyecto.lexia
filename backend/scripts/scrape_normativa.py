"""Scrapes InfoLEG and SAIJ, embeds new items, and generates firm alerts."""
import asyncio
import os
import sys
import json
import hashlib
from datetime import datetime

import httpx
from bs4 import BeautifulSoup
import voyageai

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from backend.app.core.supabase import get_supabase

INFOLEG_RSS = "http://servicios.infoleg.gob.ar/infolegInternet/RSS/rss.xml"
SAIJ_URL = "https://www.saij.gob.ar/boletin-oficial"
SIMILARITY_THRESHOLD = 0.75


def _scrape_infoleg() -> list[dict]:
    items = []
    try:
        resp = httpx.get(INFOLEG_RSS, timeout=30, follow_redirects=True)
        soup = BeautifulSoup(resp.text, "xml")
        for item in soup.find_all("item"):
            title = item.find("title")
            desc = item.find("description")
            link = item.find("link")
            pub = item.find("pubDate")
            items.append({
                "source": "infoleg",
                "title": title.text.strip() if title else "",
                "content": desc.text.strip() if desc else "",
                "url": link.text.strip() if link else None,
                "published_at": pub.text.strip() if pub else None,
            })
    except Exception as exc:
        print(f'{{"step": "scrape_error", "source": "infoleg", "error": "{exc}"}}')
    return items


def _scrape_saij() -> list[dict]:
    """Scrape SAIJ legislación reciente via su buscador público."""
    items = []
    # SAIJ search endpoint for recent nacional legislation
    SAIJ_API = "https://www.saij.gob.ar/buscador/busqueda-avanzada"
    params = {
        "tipo-novedad": "D,L,R",   # Decretos, Leyes, Resoluciones
        "cant": "20",
        "pag": "1",
    }
    try:
        resp = httpx.get(SAIJ_API, params=params, timeout=30, follow_redirects=True,
                         headers={"User-Agent": "Mozilla/5.0 (compatible; LexiaBot/1.0)"})
        soup = BeautifulSoup(resp.text, "html.parser")
        # Parse search results list
        for article in soup.select("article.resultado, li.resultado, div.resultado-buscador"):
            title_tag = article.select_one("h2 a, h3 a, .titulo a")
            desc_tag  = article.select_one(".resumen, .descripcion, p")
            date_tag  = article.select_one(".fecha, time, .date")
            if not title_tag:
                continue
            href = title_tag.get("href", "")
            url  = f"https://www.saij.gob.ar{href}" if href.startswith("/") else href
            items.append({
                "source": "saij",
                "title": title_tag.get_text(strip=True),
                "content": desc_tag.get_text(strip=True) if desc_tag else "",
                "url": url or None,
                "published_at": date_tag.get_text(strip=True) if date_tag else None,
            })
    except Exception as exc:
        print(f'{{"step": "scrape_error", "source": "saij", "error": "{exc}"}}')

    # Fallback: Boletín Oficial API (argentina.gob.ar)
    if not items:
        items.extend(_scrape_boletin_oficial())

    return items


def _scrape_boletin_oficial() -> list[dict]:
    """Scrape normas del Boletín Oficial via argentina.gob.ar."""
    items = []
    try:
        today = datetime.utcnow()
        url = (
            "https://www.boletinoficial.gob.ar/normas/buscar"
            f"?q=&categoria=&seccion=primera&desde={today.strftime('%d/%m/%Y')}"
            "&hasta=&page=0&size=20"
        )
        resp = httpx.get(url, timeout=30, follow_redirects=True,
                         headers={"Accept": "application/json",
                                  "User-Agent": "Mozilla/5.0 (compatible; LexiaBot/1.0)"})
        if resp.headers.get("content-type", "").startswith("application/json"):
            data = resp.json()
            for norma in (data.get("normas") or data.get("content") or []):
                items.append({
                    "source": "saij",
                    "title": norma.get("titulo") or norma.get("title") or "",
                    "content": norma.get("descripcion") or norma.get("sumario") or "",
                    "url": norma.get("url") or norma.get("link"),
                    "published_at": norma.get("fecha") or norma.get("date"),
                })
    except Exception as exc:
        print(f'{{"step": "scrape_error", "source": "boletin_oficial", "error": "{exc}"}}')
    return items


def _fingerprint(item: dict) -> str:
    return hashlib.sha256(f"{item['source']}:{item['title']}:{item['url']}".encode()).hexdigest()


def _embed_texts(texts: list[str]) -> list[list[float]]:
    api_key = os.environ["VOYAGE_API_KEY"]
    client = voyageai.Client(api_key=api_key)
    result = client.embed(texts, model="voyage-law-2", input_type="document")
    return result.embeddings


async def main() -> None:
    supabase = get_supabase()

    raw_items = _scrape_infoleg() + _scrape_saij()
    print(f'{{"step": "scraped", "total": {len(raw_items)}}}')

    # Deduplicate against existing normativa_items
    new_items = []
    for item in raw_items:
        fp = _fingerprint(item)
        existing = (
            supabase.table("normativa_items")
            .select("id")
            .eq("url", item.get("url", fp))
            .execute()
        )
        if not existing.data:
            item["_fingerprint"] = fp
            new_items.append(item)

    if not new_items:
        print('{"step": "no_new_items"}')
        return

    texts = [f"{i['title']}\n{i['content']}" for i in new_items]
    embeddings = _embed_texts(texts)

    inserted_ids = []
    for item, emb in zip(new_items, embeddings):
        resp = (
            supabase.table("normativa_items")
            .insert({
                "source": item["source"],
                "title": item["title"],
                "content": item["content"],
                "url": item.get("url"),
                "published_at": item.get("published_at"),
                "embedding": emb,
            })
            .execute()
        )
        inserted_ids.append(resp.data[0]["id"])

    print(f'{{"step": "inserted", "count": {len(inserted_ids)}}}')

    # Match against all firm chunks and create alerts
    alerts_created = 0
    for norm_id, emb in zip(inserted_ids, embeddings):
        matches = (
            supabase.rpc(
                "match_chunks_for_normativa",
                {"query_embedding": emb, "similarity_threshold": SIMILARITY_THRESHOLD, "match_count": 50},
            ).execute()
        )
        if not matches.data:
            continue

        # Group by firm
        firm_chunks: dict[str, list] = {}
        for chunk in matches.data:
            firm_id = chunk["firm_id"]
            firm_chunks.setdefault(firm_id, []).append(chunk)

        for firm_id, chunks in firm_chunks.items():
            doc_ids = list({c["document_id"] for c in chunks})
            supabase.table("alerts").insert({
                "firm_id": firm_id,
                "normativa_item_id": norm_id,
                "affected_documents": doc_ids,
                "status": "pending",
            }).execute()
            alerts_created += 1

    print(f'{{"step": "alerts_created", "count": {alerts_created}}}')


if __name__ == "__main__":
    asyncio.run(main())
