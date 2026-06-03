from typing import Any
import jwt
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel

from app.core.security import get_current_firm
from app.core.config import get_settings
from app.services.templates import (
    list_templates, get_template, create_template, clone_template, delete_template
)

router = APIRouter()


class TemplateCreate(BaseModel):
    name: str
    description: str | None = None
    materia: str | None = None
    checklist: list[dict]
    is_public: bool = False


def _get_user_id(authorization: str = Header(...)) -> str:
    settings = get_settings()
    token = authorization.removeprefix("Bearer ")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"],
                             options={"verify_aud": False})
        return payload.get("sub", "unknown")
    except Exception:
        return "unknown"


@router.get("")
async def get_templates(firm_id: str = Depends(get_current_firm)) -> dict[str, Any]:
    templates = list_templates(firm_id)
    return {"data": templates, "error": None, "metadata": {"count": len(templates)}}


@router.post("", status_code=201)
async def create_new_template(
    body: TemplateCreate,
    firm_id: str = Depends(get_current_firm),
    user_id: str = Depends(_get_user_id),
) -> dict[str, Any]:
    if not body.checklist:
        raise HTTPException(400, "El checklist no puede estar vacío")
    if len(body.checklist) > 50:
        raise HTTPException(400, "Máximo 50 puntos por template")
    t = create_template(firm_id, user_id, body.name, body.description,
                        body.materia, body.checklist, body.is_public)
    return {"data": t, "error": None, "metadata": {}}


@router.post("/{template_id}/clone", status_code=201)
async def clone_existing_template(
    template_id: str,
    firm_id: str = Depends(get_current_firm),
    user_id: str = Depends(_get_user_id),
) -> dict[str, Any]:
    try:
        t = clone_template(template_id, firm_id, user_id)
    except ValueError as exc:
        raise HTTPException(404, str(exc))
    return {"data": t, "error": None, "metadata": {}}


@router.delete("/{template_id}")
async def remove_template(
    template_id: str,
    firm_id: str = Depends(get_current_firm),
) -> dict[str, Any]:
    deleted = delete_template(template_id, firm_id)
    if not deleted:
        raise HTTPException(404, "Template no encontrado o sin permiso")
    return {"data": {"deleted": True}, "error": None, "metadata": {}}
