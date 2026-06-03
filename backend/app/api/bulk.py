import asyncio
import json
from typing import Any
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.security import get_current_firm
from app.core.supabase import get_supabase
from app.services.bulk_review import run_bulk_review

router = APIRouter()


class BulkStartRequest(BaseModel):
    document_ids: list[str]
    checklist: list[str]


@router.post("/start", status_code=201)
async def start_bulk(
    body: BulkStartRequest,
    background_tasks: BackgroundTasks,
    firm_id: str = Depends(get_current_firm),
) -> dict[str, Any]:
    if not body.document_ids:
        raise HTTPException(400, "Se requiere al menos un documento")
    if not body.checklist:
        raise HTTPException(400, "Se requiere al menos un punto del checklist")
    if len(body.document_ids) > 500:
        raise HTTPException(400, "Máximo 500 documentos por sesión")
    if len(body.checklist) > 20:
        raise HTTPException(400, "Máximo 20 puntos en el checklist")

    supabase = get_supabase()
    resp = supabase.table("bulk_reviews").insert({
        "firm_id": firm_id,
        "document_ids": body.document_ids,
        "checklist": body.checklist,
        "status": "queued",
    }).execute()
    review = resp.data[0]
    review_id = review["id"]

    background_tasks.add_task(
        run_bulk_review, review_id, firm_id, body.document_ids, body.checklist
    )

    return {"data": {"review_id": review_id, "status": "queued"}, "error": None, "metadata": {}}


@router.get("/{review_id}/status")
async def bulk_status_sse(
    review_id: str,
    firm_id: str = Depends(get_current_firm),
):
    supabase = get_supabase()

    async def event_stream():
        for _ in range(60):
            resp = (
                supabase.table("bulk_reviews")
                .select("status, results")
                .eq("id", review_id)
                .eq("firm_id", firm_id)
                .single()
                .execute()
            )
            if not resp.data:
                yield f"data: {json.dumps({'error': 'Not found'})}\n\n"
                return
            data = resp.data
            processed = len(data.get("results") or [])
            yield f"data: {json.dumps({'status': data['status'], 'processed': processed})}\n\n"
            if data["status"] in ("complete", "failed"):
                return
            await asyncio.sleep(3)

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/{review_id}/results")
async def bulk_results(
    review_id: str,
    firm_id: str = Depends(get_current_firm),
) -> dict[str, Any]:
    supabase = get_supabase()
    resp = (
        supabase.table("bulk_reviews")
        .select("*")
        .eq("id", review_id)
        .eq("firm_id", firm_id)
        .single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(404, "Revisión no encontrada")
    return {"data": resp.data, "error": None, "metadata": {}}


@router.get("/{review_id}/export")
async def bulk_export_csv(
    review_id: str,
    firm_id: str = Depends(get_current_firm),
):
    supabase = get_supabase()
    resp = (
        supabase.table("bulk_reviews")
        .select("checklist, results")
        .eq("id", review_id)
        .eq("firm_id", firm_id)
        .single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(404, "Revisión no encontrada")

    checklist = resp.data["checklist"]
    results = resp.data.get("results") or []

    import csv, io
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Documento"] + checklist)
    for row in results:
        doc_name = row.get("document_name", row.get("document_id", ""))
        cols = []
        for punto in checklist:
            r = row.get("results", {}).get(punto, {})
            cols.append("SI" if r.get("presente") else ("NO" if r.get("presente") is False else "?"))
        writer.writerow([doc_name] + cols)

    csv_content = output.getvalue()
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=bulk-{review_id[:8]}.csv"},
    )


@router.get("")
async def list_bulk_reviews(firm_id: str = Depends(get_current_firm)) -> dict[str, Any]:
    supabase = get_supabase()
    resp = (
        supabase.table("bulk_reviews")
        .select("id, status, created_at")
        .eq("firm_id", firm_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return {"data": resp.data, "error": None, "metadata": {}}
