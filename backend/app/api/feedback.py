from typing import Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.core.security import get_current_firm
from app.services.feedback import save_feedback

router = APIRouter()


class FeedbackRequest(BaseModel):
    query_id: str
    query_text: str
    retrieved_chunk_ids: list[str]
    rating: int
    comment: str | None = None


@router.post("", status_code=201)
async def submit_feedback(
    body: FeedbackRequest,
    firm_id: str = Depends(get_current_firm),
) -> dict[str, Any]:
    if body.rating not in (1, -1):
        raise HTTPException(400, "rating debe ser 1 o -1")
    save_feedback(
        firm_id=firm_id,
        query_id=body.query_id,
        query_text=body.query_text,
        retrieved_chunk_ids=body.retrieved_chunk_ids,
        rating=body.rating,
        comment=body.comment,
    )
    return {"data": {"saved": True}, "error": None, "metadata": {}}
