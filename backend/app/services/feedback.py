from app.core.supabase import get_supabase


def save_feedback(
    firm_id: str,
    query_id: str,
    query_text: str,
    retrieved_chunk_ids: list[str],
    rating: int,
    comment: str | None = None,
) -> None:
    supabase = get_supabase()
    supabase.table("query_feedback").insert({
        "firm_id": firm_id,
        "query_id": query_id,
        "query_text": query_text,
        "retrieved_chunk_ids": retrieved_chunk_ids,
        "rating": rating,
        "comment": comment,
    }).execute()
