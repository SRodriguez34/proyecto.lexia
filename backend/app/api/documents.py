from fastapi import APIRouter, UploadFile, File, Header, HTTPException
from typing import Any
from app.services.ingestion import ingest_document
from app.core.supabase import get_supabase

router = APIRouter()

ALLOWED_TYPES = {"pdf", "docx", "doc"}


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    x_firm_id: str = Header(...),
    matter_id: str | None = None,
) -> dict[str, Any]:
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    contents = await file.read()
    document_id = await ingest_document(
        file_bytes=contents,
        filename=file.filename or "document",
        firm_id=x_firm_id,
        matter_id=matter_id,
    )
    return {"data": {"document_id": document_id}, "error": None, "metadata": {}}


@router.get("")
async def list_documents(x_firm_id: str = Header(...)) -> dict[str, Any]:
    supabase = get_supabase()
    resp = (
        supabase.table("documents")
        .select("*, matters(caratula, client_name)")
        .eq("firm_id", x_firm_id)
        .neq("status", "deleted")
        .order("created_at", desc=True)
        .execute()
    )
    return {"data": resp.data, "error": None, "metadata": {"count": len(resp.data)}}


@router.delete("/{document_id}")
async def delete_document(
    document_id: str, x_firm_id: str = Header(...)
) -> dict[str, Any]:
    supabase = get_supabase()
    resp = (
        supabase.table("documents")
        .update({"status": "deleted"})
        .eq("id", document_id)
        .eq("firm_id", x_firm_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"data": {"deleted": True}, "error": None, "metadata": {}}
