"""Deep Research argentino — investigación jurídica multi-paso agéntica."""
import asyncio
import logging
import json
import re
from datetime import datetime, timezone

import cohere

from app.core.config import get_settings
from app.core.supabase import get_supabase
from app.services.retrieval import hybrid_search, _embed_query, _rerank
from app.services.llm import _chat
from app.models.chunk import ChunkWithScore

logger = logging.getLogger(__name__)

_PLAN_PROMPT = """Sos un abogado argentino senior especializado en investigación jurídica.
Generá un plan de investigación de máximo 5 pasos para responder esta consulta:

{query}

Cada paso debe especificar:
- source: "saij" | "infoleg" | "documentos_estudio"
- search_terms: lista de 2-3 términos de búsqueda en español legal argentino
- expected_info: qué información se espera encontrar

Devolvé SOLO un array JSON válido. Sin texto adicional.
Ejemplo: [{{"step": 1, "source": "saij", "search_terms": ["despido", "LCT art 245"], "expected_info": "Jurisprudencia sobre indemnización"}}]"""

_SYNTHESIS_PROMPT = """Sos un abogado argentino senior. Redactá un memo de investigación jurídica profesional.

CONSULTA: {query}

FUENTES ENCONTRADAS:
{sources_text}

El memo debe tener esta estructura exacta en markdown:
## Resumen ejecutivo
(3-5 líneas con la conclusión principal)

## Análisis jurídico
(Análisis por cada punto investigado, con referencias a las fuentes)

## Jurisprudencia relevante
(Fallos y resoluciones encontrados, con tribunal y fecha)

## Normativa aplicable
(Leyes, decretos y resoluciones relevantes)

## Conclusiones y recomendaciones
(Puntos accionables para el abogado)

## Fuentes citadas
(Lista numerada de todas las fuentes usadas)

IMPORTANTE: Citá ÚNICAMENTE las fuentes proporcionadas. No inventes jurisprudencia ni artículos."""


async def _execute_step(
    step: dict, firm_id: str, query: str
) -> list[ChunkWithScore]:
    source = step.get("source", "documentos_estudio")
    search_terms = " ".join(step.get("search_terms", [query]))

    if source == "documentos_estudio":
        return await hybrid_search(query=search_terms, firm_id=firm_id, scope="firm")

    if source in ("saij", "infoleg"):
        supabase = get_supabase()
        embedding = _embed_query(search_terms)
        resp = supabase.rpc(
            "match_normativa",
            {"query_embedding": embedding, "match_count": 10},
        ).execute()
        results = resp.data or []
        if not results:
            return []
        return [
            ChunkWithScore(
                id=r["id"],
                document_id=r["id"],
                content=r.get("content", ""),
                metadata={"source": r.get("source"), "title": r.get("title"), "url": r.get("url")},
                score=r.get("similarity", 0.5),
            )
            for r in results
        ]

    return []


async def run_research(session_id: str, firm_id: str, query: str) -> None:
    supabase = get_supabase()

    def _update(status: str, **kwargs):
        supabase.table("research_sessions").update(
            {"status": status, **kwargs}
        ).eq("id", session_id).execute()

    try:
        _update("planning")

        plan_raw = _chat(_PLAN_PROMPT.format(query=query), fast=False)
        plan_raw = re.sub(r"^```(?:json)?\s*", "", plan_raw.strip())
        plan_raw = re.sub(r"\s*```$", "", plan_raw)
        plan = json.loads(plan_raw)
        _update("running", plan=plan)

        logger.info('{"step":"deep_research_plan","session":"%s","steps":%d}', session_id, len(plan))

        # Execute all steps in parallel
        tasks = [_execute_step(step, firm_id, query) for step in plan[:5]]
        step_results = await asyncio.gather(*tasks, return_exceptions=True)

        all_chunks: list[ChunkWithScore] = []
        for r in step_results:
            if isinstance(r, list):
                all_chunks.extend(r)

        if not all_chunks:
            _update("failed", result_memo="No se encontraron fuentes relevantes para esta consulta.")
            return

        # Deduplicate by content hash
        seen = set()
        unique_chunks = []
        for c in all_chunks:
            key = c.content[:100]
            if key not in seen:
                seen.add(key)
                unique_chunks.append(c)

        # Global rerank across all sources
        reranked = _rerank(query, [
            {"id": c.id, "document_id": c.document_id, "content": c.content, "metadata": c.metadata}
            for c in unique_chunks
        ])
        top_sources = reranked[:15]

        sources_text = "\n\n".join(
            f"[{i+1}] {c.metadata.get('title', c.metadata.get('document_name', 'Fuente'))}"
            f" ({c.metadata.get('source', 'documento_estudio')})\n{c.content[:500]}"
            for i, c in enumerate(top_sources)
        )

        memo = _chat(_SYNTHESIS_PROMPT.format(query=query, sources_text=sources_text), fast=False)

        sources_json = [
            {
                "rank": i + 1,
                "title": c.metadata.get("title", c.metadata.get("document_name", "Fuente")),
                "source": c.metadata.get("source", "documento_estudio"),
                "url": c.metadata.get("url"),
                "relevance": round(c.score, 4),
                "excerpt": c.content[:300],
            }
            for i, c in enumerate(top_sources)
        ]

        _update(
            "complete",
            result_memo=memo,
            sources=sources_json,
            completed_at=datetime.now(timezone.utc).isoformat(),
        )
        logger.info('{"step":"deep_research_complete","session":"%s","sources":%d}', session_id, len(sources_json))

    except Exception as exc:
        logger.error('{"step":"deep_research_error","session":"%s","error":"%s"}', session_id, str(exc))
        _update("failed", result_memo=f"Error durante la investigación: {exc}")
