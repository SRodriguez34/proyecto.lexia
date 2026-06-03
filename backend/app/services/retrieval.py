import logging
from typing import Any

import voyageai
import cohere

from app.core.config import get_settings
from app.core.supabase import get_supabase
from app.models.chunk import ChunkWithScore
from app.services.cache import get_cached_embedding, store_embedding

logger = logging.getLogger(__name__)

# Diccionario de sinónimos jurídicos argentinos — expande queries coloquiales
_LEGAL_SYNONYMS: dict[str, list[str]] = {
    "despido": ["rescisión laboral", "art 245 LCT", "indemnización por despido"],
    "prescripción": ["caducidad", "art 2560 CCyC", "plazo de prescripción"],
    "contrato": ["acuerdo", "convenio", "locación"],
    "locación": ["alquiler", "arrendamiento", "art 1187 CCyC"],
    "honorarios": ["aranceles", "retribución profesional"],
    "embargo": ["medida cautelar", "inhibición general de bienes"],
    "apelación": ["recurso de apelación", "segunda instancia"],
    "demanda": ["acción judicial", "presentación judicial"],
    "prueba": ["evidencia", "elementos probatorios", "ofrecimiento de prueba"],
    "sentencia": ["fallo", "resolución judicial", "decisión"],
    "indemnización": ["resarcimiento", "reparación de daños"],
    "multa": ["sanción", "penalidad", "punición"],
    "acreedor": ["titular del crédito", "parte acreedora"],
    "deudor": ["obligado", "parte deudora"],
    "poder": ["mandato", "representación", "apoderamiento"],
    "sociedad": ["persona jurídica", "empresa", "SRL", "SA"],
    "quiebra": ["concurso preventivo", "insolvencia", "LCQ"],
    "fuero laboral": ["CNAT", "juzgado laboral", "tribunal del trabajo"],
    "CCyC": ["Código Civil y Comercial", "ley 26994"],
    "LCT": ["Ley de Contrato de Trabajo", "ley 20744"],
}


def expand_query(query: str) -> str:
    """Agrega sinónimos jurídicos argentinos a la query para mejorar recall."""
    q_lower = query.lower()
    expansions = []
    for term, synonyms in _LEGAL_SYNONYMS.items():
        if term in q_lower:
            expansions.extend(synonyms[:2])
    if expansions:
        return f"{query} {' '.join(expansions)}"
    return query


def _embed_query(query: str) -> list[float]:
    cached = get_cached_embedding(query)
    if cached:
        return cached
    settings = get_settings()
    client = voyageai.Client(api_key=settings.voyage_api_key)
    result = client.embed([query], model=settings.embedding_model, input_type="query")
    embedding = result.embeddings[0]
    store_embedding(query, embedding)
    return embedding


def _semantic_search(
    embedding: list[float], firm_id: str, matter_id: str | None, top_k: int
) -> list[dict[str, Any]]:
    supabase = get_supabase()
    # Use Supabase RPC for vector similarity
    params: dict[str, Any] = {
        "query_embedding": embedding,
        "firm_id_param": firm_id,
        "match_count": top_k,
    }
    if matter_id:
        params["matter_id_param"] = matter_id
        rpc_fn = "match_chunks_by_matter"
    else:
        rpc_fn = "match_chunks"

    resp = supabase.rpc(rpc_fn, params).execute()
    return resp.data or []


def _keyword_search(
    query: str, firm_id: str, matter_id: str | None, top_k: int
) -> list[dict[str, Any]]:
    supabase = get_supabase()
    params: dict[str, Any] = {
        "query_text": query,
        "firm_id_param": firm_id,
        "match_count": top_k,
    }
    if matter_id:
        params["matter_id_param"] = matter_id
        rpc_fn = "keyword_search_chunks_by_matter"
    else:
        rpc_fn = "keyword_search_chunks"

    resp = supabase.rpc(rpc_fn, params).execute()
    return resp.data or []


def _reciprocal_rank_fusion(
    semantic: list[dict], keyword: list[dict], k: int = 60
) -> list[dict[str, Any]]:
    scores: dict[str, float] = {}
    chunk_data: dict[str, dict] = {}

    for rank, item in enumerate(semantic):
        cid = item["id"]
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (k + rank + 1)
        chunk_data[cid] = item

    for rank, item in enumerate(keyword):
        cid = item["id"]
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (k + rank + 1)
        chunk_data[cid] = item

    sorted_ids = sorted(scores.keys(), key=lambda cid: scores[cid], reverse=True)
    results = []
    for cid in sorted_ids:
        item = {**chunk_data[cid], "rrf_score": scores[cid]}
        results.append(item)
    return results


def _rerank(query: str, candidates: list[dict]) -> list[ChunkWithScore]:
    settings = get_settings()
    client = cohere.Client(api_key=settings.cohere_api_key)

    documents = [c["content"] for c in candidates]
    response = client.rerank(
        model=settings.rerank_model,
        query=query,
        documents=documents,
        top_n=settings.rerank_top_n,
    )

    results = []
    for hit in response.results:
        candidate = candidates[hit.index]
        results.append(
            ChunkWithScore(
                id=candidate["id"],
                document_id=candidate["document_id"],
                content=candidate["content"],
                metadata=candidate.get("metadata", {}),
                score=hit.relevance_score,
            )
        )
    return results


async def hybrid_search(
    query: str,
    firm_id: str,
    matter_id: str | None = None,
    scope: str = "matter",
    materia: str | None = None,
    top_k: int = 20,
) -> list[ChunkWithScore]:
    settings = get_settings()

    # scope="firm" overrides matter_id to search across all firm docs
    effective_matter_id = matter_id if scope == "matter" else None

    expanded = expand_query(query)
    embedding = _embed_query(expanded)

    semantic_results = _semantic_search(embedding, firm_id, effective_matter_id, top_k)
    keyword_results = _keyword_search(expanded, firm_id, effective_matter_id, top_k)

    logger.info(
        '{"step": "search", "semantic_hits": %d, "keyword_hits": %d}',
        len(semantic_results), len(keyword_results),
    )

    fused = _reciprocal_rank_fusion(semantic_results, keyword_results, k=settings.rrf_k)

    # F2.5: filter by materia if specified
    if materia:
        fused = [c for c in fused if c.get("metadata", {}).get("materia") == materia or c.get("materia") == materia] or fused

    candidates = fused[: settings.retrieval_top_k]

    if not candidates:
        return []

    reranked = _rerank(query, candidates)
    return reranked
