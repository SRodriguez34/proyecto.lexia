"""Embedding cache — evita re-embeder queries frecuentes."""
import hashlib
import logging
from datetime import datetime, timezone

from app.core.supabase import get_supabase

logger = logging.getLogger(__name__)


def get_cached_embedding(query: str) -> list[float] | None:
    try:
        supabase = get_supabase()
        query_hash = hashlib.sha256(query.encode()).hexdigest()
        resp = (
            supabase.table("embedding_cache")
            .select("embedding, hit_count")
            .eq("query_hash", query_hash)
            .single()
            .execute()
        )
        if resp.data:
            supabase.table("embedding_cache").update({
                "hit_count": (resp.data.get("hit_count") or 0) + 1,
                "last_used_at": datetime.now(timezone.utc).isoformat(),
            }).eq("query_hash", query_hash).execute()
            return resp.data["embedding"]
    except Exception:
        pass
    return None


def store_embedding(query: str, embedding: list[float]) -> None:
    try:
        supabase = get_supabase()
        query_hash = hashlib.sha256(query.encode()).hexdigest()
        supabase.table("embedding_cache").upsert({
            "query_hash": query_hash,
            "query_text": query,
            "embedding": embedding,
            "hit_count": 1,
            "last_used_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as exc:
        logger.debug('{"step":"cache_store_error","error":"%s"}', str(exc))
