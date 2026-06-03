from typing import Any
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel

from app.core.security import get_current_firm
from app.core.supabase import get_supabase
from app.services.deep_research import run_research

router = APIRouter()


class ResearchRequest(BaseModel):
    query: str
    materia: str | None = None


@router.post("/start", status_code=201)
async def start_research(
    body: ResearchRequest,
    background_tasks: BackgroundTasks,
    firm_id: str = Depends(get_current_firm),
) -> dict[str, Any]:
    if len(body.query.split()) < 5:
        raise HTTPException(
            status_code=400,
            detail="La consulta debe tener al menos 5 palabras para iniciar una investigación profunda.",
        )

    supabase = get_supabase()
    resp = supabase.table("research_sessions").insert({
        "firm_id": firm_id,
        "query": body.query,
        "status": "planning",
    }).execute()
    session = resp.data[0]
    session_id = session["id"]

    background_tasks.add_task(run_research, session_id, firm_id, body.query)

    return {
        "data": {"session_id": session_id, "status": "planning"},
        "error": None,
        "metadata": {"query": body.query},
    }


@router.get("/{session_id}")
async def get_research_status(
    session_id: str,
    firm_id: str = Depends(get_current_firm),
) -> dict[str, Any]:
    supabase = get_supabase()
    resp = (
        supabase.table("research_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("firm_id", firm_id)
        .single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Sesión de investigación no encontrada")
    return {"data": resp.data, "error": None, "metadata": {}}


@router.get("")
async def list_research_sessions(
    firm_id: str = Depends(get_current_firm),
) -> dict[str, Any]:
    supabase = get_supabase()
    resp = (
        supabase.table("research_sessions")
        .select("id, query, status, created_at, completed_at")
        .eq("firm_id", firm_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return {"data": resp.data, "error": None, "metadata": {"count": len(resp.data or [])}}
