from typing import Any
from fastapi import APIRouter, Depends

from app.services.metrics import get_usage_summary
from app.core.security import get_current_firm

router = APIRouter()


@router.get("/usage")
async def usage_stats(firm_id: str = Depends(get_current_firm)) -> dict[str, Any]:
    summary = get_usage_summary(firm_id)
    return {"data": summary, "error": None, "metadata": {}}
