import secrets
import logging
from datetime import datetime, timedelta, timezone

from app.core.supabase import get_supabase
from app.models.firm import PLAN_LIMITS

logger = logging.getLogger(__name__)


def create_firm_and_user(email: str, password: str, firm_name: str) -> dict:
    supabase = get_supabase()

    firm_resp = supabase.table("firms").insert({
        "name": firm_name,
        "plan": "trial",
        "plan_limits": PLAN_LIMITS["trial"],
        "usage_current": {"documents_this_month": 0, "queries_this_month": 0},
        "onboarding_completed": False,
        "onboarding_step": 0,
    }).execute()
    firm = firm_resp.data[0]
    firm_id = firm["id"]

    user = supabase.auth.admin.create_user({
        "email": email,
        "password": password,
        "user_metadata": {"firm_id": firm_id},
        "email_confirm": False,
    })
    user_id = user.user.id

    supabase.table("users").insert({
        "id": user_id,
        "firm_id": firm_id,
        "email": email,
        "role": "admin",
    }).execute()

    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=24)
    supabase.table("invitations").insert({
        "firm_id": firm_id,
        "email": email,
        "token": token,
        "expires_at": expires.isoformat(),
    }).execute()

    logger.info('{"step":"firm_created","firm_id":"%s","email":"%s"}', firm_id, email)
    return {"firm_id": firm_id, "user_id": user_id, "token": token, "firm_name": firm_name}


def verify_email_token(token: str) -> str:
    supabase = get_supabase()

    resp = supabase.table("invitations").select("*").eq("token", token).single().execute()
    if not resp.data:
        raise ValueError("Token inválido")

    inv = resp.data
    if inv["accepted_at"]:
        raise ValueError("Token ya utilizado")

    expires = datetime.fromisoformat(inv["expires_at"])
    if datetime.now(timezone.utc) > expires:
        raise ValueError("Token expirado")

    supabase.table("invitations").update(
        {"accepted_at": datetime.now(timezone.utc).isoformat()}
    ).eq("token", token).execute()

    user_resp = supabase.table("users").select("id").eq("email", inv["email"]).single().execute()
    if user_resp.data:
        supabase.auth.admin.update_user_by_id(
            user_resp.data["id"], {"email_confirm": True}
        )

    logger.info('{"step":"email_verified","firm_id":"%s"}', inv["firm_id"])
    return inv["firm_id"]


def update_onboarding_step(firm_id: str, step: int, updates: dict) -> None:
    supabase = get_supabase()
    payload = {"onboarding_step": step, **updates}
    supabase.table("firms").update(payload).eq("id", firm_id).execute()
