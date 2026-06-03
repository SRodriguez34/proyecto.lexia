"""Indexa jurisprudencia pública argentina (SAIJ) con firm_id='public'."""
import asyncio
import os
import sys
import hashlib

import httpx
from bs4 import BeautifulSoup
import voyageai

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from backend.app.core.supabase import get_supabase

PUBLIC_FIRM_ID = "00000000-0000-0000-0000-000000000001"
VOYAGE_API_KEY = os.environ["VOYAGE_API_KEY"]

SAIJ_JURISPRUDENCIA_URLS = [
    "https://www.saij.gob.ar/jurisprudencia?tipo-contenido=Jurisprudencia&jurisdiccion=Nacional&cant=50",
    "https://www.saij.gob.ar/jurisprudencia?tipo-contenido=Jurisprudencia&jurisdiccion=Nacional&cant=50&pag=2",
]

CSJN_URL = "https://sjconsulta.csjn.gov.ar/sjconsulta/documentos/verDocumentoById.html"


def _fingerprint(title: str, url: str) -> str:
    return hashlib.sha256(f"{title}:{url}".encode()).hexdigest()


def _scrape_saij_jurisprudencia(url: str) -> list[dict]:
    items = []
    try:
        resp = httpx.get(url, timeout=30, follow_redirects=True,
                         headers={"User-Agent": "Mozilla/5.0 (compatible; LexiaBot/1.0)"})
        soup = BeautifulSoup(resp.text, "html.parser")
        for article in soup.select("article, li.resultado, div.resultado-buscador, .result-item"):
            title_tag = article.select_one("h2 a, h3 a, .titulo a, a.titulo")
            sumario_tag = article.select_one(".sumario, .resumen, .descripcion, p")
            date_tag = article.select_one(".fecha, time, .date, .fecha-publicacion")
            tribunal_tag = article.select_one(".tribunal, .organismo, .fuente")
            if not title_tag:
                continue
            href = title_tag.get("href", "")
            url_full = f"https://www.saij.gob.ar{href}" if href.startswith("/") else href
            items.append({
                "title": title_tag.get_text(strip=True),
                "content": sumario_tag.get_text(strip=True) if sumario_tag else "",
                "url": url_full,
                "published_at": date_tag.get_text(strip=True) if date_tag else None,
                "tribunal": tribunal_tag.get_text(strip=True) if tribunal_tag else None,
            })
        print(f'{{"step":"scraped_saij","url":"{url}","items":{len(items)}}}')
    except Exception as exc:
        print(f'{{"step":"scrape_error","url":"{url}","error":"{exc}"}}')
    return items


def _embed_texts(texts: list[str]) -> list[list[float]]:
    client = voyageai.Client(api_key=VOYAGE_API_KEY)
    result = client.embed(texts, model="voyage-law-2", input_type="document")
    return result.embeddings


async def main() -> None:
    supabase = get_supabase()

    all_items = []
    for url in SAIJ_JURISPRUDENCIA_URLS:
        all_items.extend(_scrape_saij_jurisprudencia(url))

    print(f'{{"step":"total_scraped","count":{len(all_items)}}}')
    if not all_items:
        print('{"step":"no_items_found"}')
        return

    # Deduplicate against existing normativa_items
    new_items = []
    for item in all_items:
        fp = _fingerprint(item["title"], item.get("url", ""))
        existing = supabase.table("normativa_items").select("id").eq("url", item.get("url", fp)).execute()
        if not existing.data:
            new_items.append(item)

    if not new_items:
        print('{"step":"no_new_items"}')
        return

    print(f'{{"step":"new_items","count":{len(new_items)}}}')

    texts = [f"{i['title']}\n{i['content']}" for i in new_items]
    batch_size = 64
    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        all_embeddings.extend(_embed_texts(texts[i : i + batch_size]))

    inserted = 0
    for item, emb in zip(new_items, all_embeddings):
        content = item["content"]
        if item.get("tribunal"):
            content = f"Tribunal: {item['tribunal']}\n{content}"
        try:
            supabase.table("normativa_items").insert({
                "source": "saij",
                "title": item["title"],
                "content": content or item["title"],
                "url": item.get("url"),
                "published_at": item.get("published_at"),
                "embedding": emb,
            }).execute()
            inserted += 1
        except Exception as exc:
            print(f'{{"step":"insert_error","title":"{item["title"][:50]}","error":"{exc}"}}')

    print(f'{{"step":"jurisprudencia_indexed","count":{inserted}}}')


if __name__ == "__main__":
    asyncio.run(main())
