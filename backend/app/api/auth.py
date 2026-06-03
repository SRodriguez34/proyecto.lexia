from typing import Any
from fastapi import APIRouter, HTTPException, Depends

from app.models.firm import RegisterRequest, InviteRequest
from app.services.onboarding import create_firm_and_user, verify_email_token
from app.services.email import send_verification_email, send_welcome_email
from app.core.security import get_current_firm
from app.core.supabase import get_supabase

router = APIRouter()


@router.post("/register", status_code=201)
async def register(body: RegisterRequest) -> dict[str, Any]:
    supabase = get_supabase()

    existing = supabase.table("users").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Email ya registrado")

    result = create_firm_and_user(body.email, body.password, body.firm_name)

    await send_verification_email(body.email, result["token"], body.firm_name)

    return {
        "data": {"message": "Registro exitoso. Revisá tu email para verificar tu cuenta."},
        "error": None,
        "metadata": {"firm_id": result["firm_id"]},
    }


@router.post("/verify/{token}")
async def verify_email(token: str) -> dict[str, Any]:
    try:
        firm_id = verify_email_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    supabase = get_supabase()
    inv = supabase.table("invitations").select("email").eq("token", token).single().execute()
    if inv.data:
        firm = supabase.table("firms").select("name").eq("id", firm_id).single().execute()
        firm_name = (firm.data or {}).get("name", "")
        await send_welcome_email(inv.data["email"], firm_name)

    return {
        "data": {"message": "Email verificado. Ya podés ingresar a LEXIA."},
        "error": None,
        "metadata": {},
    }


@router.get("/me")
async def me(firm_id: str = Depends(get_current_firm)) -> dict[str, Any]:
    supabase = get_supabase()
    firm = (
        supabase.table("firms")
        .select("id, name, plan, plan_limits, usage_current, onboarding_completed, onboarding_step, created_at")
        .eq("id", firm_id)
        .single()
        .execute()
    )
    if not firm.data:
        raise HTTPException(status_code=404, detail="Firma no encontrada")
    return {"data": firm.data, "error": None, "metadata": {}}


@router.post("/firms/invite", status_code=201)
async def invite_user(
    body: InviteRequest,
    firm_id: str = Depends(get_current_firm),
) -> dict[str, Any]:
    import secrets
    from datetime import datetime, timedelta, timezone

    supabase = get_supabase()
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=72)

    supabase.table("invitations").insert({
        "firm_id": firm_id,
        "email": body.email,
        "token": token,
        "expires_at": expires.isoformat(),
    }).execute()

    firm = supabase.table("firms").select("name").eq("id", firm_id).single().execute()
    firm_name = (firm.data or {}).get("name", "")
    await send_verification_email(body.email, token, firm_name)

    return {
        "data": {"message": f"Invitación enviada a {body.email}"},
        "error": None,
        "metadata": {},
    }
