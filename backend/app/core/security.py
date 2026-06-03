import secrets
import jwt
from fastapi import HTTPException, Header, Depends
from app.core.config import get_settings


async def verify_internal_key(x_internal_key: str = Header(...)) -> None:
    """Validate requests from internal callers (e.g. GitHub Actions)."""
    settings = get_settings()
    if not settings.internal_api_key:
        raise HTTPException(status_code=500, detail="Internal API key not configured")
    if not secrets.compare_digest(x_internal_key, settings.internal_api_key):
        raise HTTPException(status_code=403, detail="Forbidden")


async def get_current_firm(authorization: str = Header(...)) -> str:
    """Extract firm_id from Supabase JWT."""
    settings = get_settings()

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.removeprefix("Bearer ")

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")

    firm_id = (payload.get("user_metadata") or {}).get("firm_id") or payload.get("firm_id")
    if not firm_id:
        raise HTTPException(status_code=403, detail="firm_id not found in token")

    return firm_id
