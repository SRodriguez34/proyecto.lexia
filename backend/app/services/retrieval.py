import logging
from typing import Any

import voyageai
import cohere

from app.core.config import get_settings
from app.core.supabase import get_supabase
from app.models.chunk import ChunkWithScore

logger = logging.getLogger(__name__)


def _embed_query(query: str) -> list[float]:
    settings = get_settings()
    client = voyageai.Client(api_key=settings.voyage_api_key)
    result = client.embed([query], model=settings.embedding_model, input_type="query")
    return result.embeddings[0]


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
    top_k: int = 20,
) -> list[ChunkWithScore]:
    settings = get_settings()

    embedding = _embed_query(query)

    semantic_results = _semantic_search(embedding, firm_id, matter_id, top_k)
    keyword_results = _keyword_search(query, firm_id, matter_id, top_k)

    logger.info(
        '{"step": "search", "semantic_hits": %d, "keyword_hits": %d}',
        len(semantic_results), len(keyword_results),
    )

    fused = _reciprocal_rank_fusion(semantic_results, keyword_results, k=settings.rrf_k)
    candidates = fused[: settings.retrieval_top_k]

    if not candidates:
        return []

    reranked = _rerank(query, candidates)
    return reranked
