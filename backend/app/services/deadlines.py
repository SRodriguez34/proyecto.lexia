import logging
from app.core.supabase import get_supabase
from app.services.llm import extract_deadlines_from_text

logger = logging.getLogger(__name__)


async def extract_deadlines(document_id: str) -> list[dict]:
    supabase = get_supabase()

    chunks_resp = (
        supabase.table("chunks")
        .select("content")
        .eq("document_id", document_id)
        .order("chunk_index")
        .execute()
    )
    if not chunks_resp.data:
        return []

    full_text = "\n\n".join(c["content"] for c in chunks_resp.data)
    deadlines = await extract_deadlines_from_text(full_text)

    existing_meta_resp = (
        supabase.table("documents")
        .select("metadata")
        .eq("id", document_id)
        .single()
        .execute()
    )
    existing_meta = existing_meta_resp.data.get("metadata", {}) if existing_meta_resp.data else {}
    existing_meta["deadlines"] = deadlines

    supabase.table("documents").update({"metadata": existing_meta}).eq("id", document_id).execute()
    logger.info(
        '{"step": "deadlines_extracted", "document_id": "%s", "count": %d}',
        document_id, len(deadlines),
    )
    return deadlines
