from typing import Any
from fastapi import APIRouter, HTTPException, Depends

from app.models.firm import OnboardingStepRequest
from app.services.onboarding import update_onboarding_step
from app.core.security import get_current_firm
from app.core.supabase import get_supabase

router = APIRouter()


@router.get("/status")
async def get_onboarding_status(firm_id: str = Depends(get_current_firm)) -> dict[str, Any]:
    supabase = get_supabase()
    firm = (
        supabase.table("firms")
        .select("onboarding_completed, onboarding_step, materia_principal, provincia")
        .eq("id", firm_id)
        .single()
        .execute()
    )
    if not firm.data:
        raise HTTPException(status_code=404, detail="Firma no encontrada")
    return {"data": firm.data, "error": None, "metadata": {}}


@router.patch("/step")
async def save_onboarding_step(
    body: OnboardingStepRequest,
    firm_id: str = Depends(get_current_firm),
) -> dict[str, Any]:
    updates: dict = {}
    if body.provincia is not None:
        updates["provincia"] = body.provincia
    if body.materia_principal is not None:
        updates["materia_principal"] = body.materia_principal
    if body.completed:
        updates["onboarding_completed"] = True

    update_onboarding_step(firm_id, body.step, updates)

    return {"data": {"step": body.step, "saved": True}, "error": None, "metadata": {}}
