from typing import Any
from fastapi import APIRouter, Header, HTTPException
from app.core.supabase import get_supabase

router = APIRouter()


@router.get("")
async def list_alerts(
    x_firm_id: str = Header(...),
    status: str | None = None,
) -> dict[str, Any]:
    supabase = get_supabase()
    q = (
        supabase.table("alerts")
        .select("*, normativa_items(title, source, url, published_at)")
        .eq("firm_id", x_firm_id)
        .order("created_at", desc=True)
    )
    if status:
        q = q.eq("status", status)
    resp = q.execute()
    return {"data": resp.data, "error": None, "metadata": {"count": len(resp.data or [])}}


@router.patch("/{alert_id}")
async def update_alert_status(
    alert_id: str,
    status: str,
    x_firm_id: str = Header(...),
) -> dict[str, Any]:
    if status not in ("reviewed", "dismissed"):
        raise HTTPException(status_code=400, detail="Invalid status")
    supabase = get_supabase()
    resp = (
        supabase.table("alerts")
        .update({"status": status})
        .eq("id", alert_id)
        .eq("firm_id", x_firm_id)
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"data": resp.data[0], "error": None, "metadata": {}}


@router.post("/notify")
async def notify_alerts(x_firm_id: str = Header(...)) -> dict[str, Any]:
    """Trigger email digests for pending alerts (called by GitHub Actions)."""
    supabase = get_supabase()
    resp = (
        supabase.table("alerts")
        .select("*, normativa_items(title, source, url)")
        .eq("firm_id", x_firm_id)
        .eq("status", "pending")
        .execute()
    )
    pending = resp.data or []
    # Email sending via Resend would go here
    return {
        "data": {"notified": len(pending)},
        "error": None,
        "metadata": {},
    }
