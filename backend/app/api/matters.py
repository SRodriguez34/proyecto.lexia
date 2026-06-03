from typing import Any
from fastapi import APIRouter, HTTPException, Depends
from app.models.matter import MatterCreate, MatterUpdate
from app.core.supabase import get_supabase
from app.core.security import get_current_firm
from app.services.llm import generate_matter_summary

router = APIRouter()


@router.post("")
async def create_matter(
    body: MatterCreate, firm_id: str = Depends(get_current_firm)
) -> dict[str, Any]:
    supabase = get_supabase()
    resp = (
        supabase.table("matters")
        .insert({**body.model_dump(), "firm_id": firm_id})
        .execute()
    )
    return {"data": resp.data[0], "error": None, "metadata": {}}


@router.get("")
async def list_matters(firm_id: str = Depends(get_current_firm)) -> dict[str, Any]:
    supabase = get_supabase()
    resp = (
        supabase.table("matters")
        .select("*, documents(id, status, created_at)")
        .eq("firm_id", firm_id)
        .order("created_at", desc=True)
        .execute()
    )
    matters = []
    for m in resp.data or []:
        docs = m.pop("documents", [])
        m["document_count"] = len(docs)
        m["last_activity"] = max((d["created_at"] for d in docs), default=None)
        matters.append(m)
    return {"data": matters, "error": None, "metadata": {"count": len(matters)}}


@router.get("/{matter_id}")
async def get_matter(matter_id: str, firm_id: str = Depends(get_current_firm)) -> dict[str, Any]:
    supabase = get_supabase()
    resp = (
        supabase.table("matters")
        .select("*, documents(*)")
        .eq("id", matter_id)
        .eq("firm_id", firm_id)
        .single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Matter not found")
    return {"data": resp.data, "error": None, "metadata": {}}


@router.patch("/{matter_id}")
async def update_matter(
    matter_id: str, body: MatterUpdate, firm_id: str = Depends(get_current_firm)
) -> dict[str, Any]:
    supabase = get_supabase()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    resp = (
        supabase.table("matters")
        .update(updates)
        .eq("id", matter_id)
        .eq("firm_id", firm_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Matter not found")
    return {"data": resp.data[0], "error": None, "metadata": {}}


@router.get("/{matter_id}/summary")
async def get_matter_summary(matter_id: str, firm_id: str = Depends(get_current_firm)) -> dict[str, Any]:
    supabase = get_supabase()

    docs_resp = (
        supabase.table("documents")
        .select("id, filename")
        .eq("matter_id", matter_id)
        .eq("firm_id", firm_id)
        .eq("status", "indexed")
        .execute()
    )
    doc_ids = [d["id"] for d in (docs_resp.data or [])]
    if not doc_ids:
        return {
            "data": {"summary": "No hay documentos indexados en esta causa."},
            "error": None,
            "metadata": {},
        }

    chunks_resp = (
        supabase.table("chunks")
        .select("content, document_id")
        .in_("document_id", doc_ids)
        .order("chunk_index")
        .execute()
    )
    doc_name_map = {d["id"]: d["filename"] for d in docs_resp.data}
    content_parts = []
    for c in chunks_resp.data or []:
        doc_name = doc_name_map.get(c["document_id"], "Documento")
        content_parts.append(f"## {doc_name}\n{c['content']}")

    full_content = "\n\n".join(content_parts)
    summary = await generate_matter_summary(full_content)

    return {"data": {"summary": summary}, "error": None, "metadata": {"documents": len(doc_ids)}}
