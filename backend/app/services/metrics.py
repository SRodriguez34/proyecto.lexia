import logging
from datetime import datetime, timezone
from typing import Literal

from app.core.supabase import get_supabase

logger = logging.getLogger(__name__)

EventType = Literal["query", "document_indexed", "alert_generated", "login"]


def track_event(firm_id: str, event_type: EventType, metadata: dict | None = None) -> None:
    try:
        supabase = get_supabase()
        supabase.table("usage_events").insert({
            "firm_id": firm_id,
            "event_type": event_type,
            "metadata": metadata or {},
        }).execute()
    except Exception:
        logger.warning('{"step":"metrics_error","firm_id":"%s","event":"%s"}', firm_id, event_type)


def get_usage_summary(firm_id: str) -> dict:
    supabase = get_supabase()

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    events = (
        supabase.table("usage_events")
        .select("event_type, created_at")
        .eq("firm_id", firm_id)
        .gte("created_at", month_start)
        .execute()
    ).data or []

    counts: dict[str, int] = {}
    for e in events:
        counts[e["event_type"]] = counts.get(e["event_type"], 0) + 1

    firm = supabase.table("firms").select("name,plan,plan_limits,usage_current,created_at").eq("id", firm_id).single().execute().data or {}

    documents_total = (
        supabase.table("documents")
        .select("id", count="exact")
        .eq("firm_id", firm_id)
        .neq("status", "deleted")
        .execute()
    ).count or 0

    matters_active = (
        supabase.table("matters")
        .select("id", count="exact")
        .eq("firm_id", firm_id)
        .eq("status", "active")
        .execute()
    ).count or 0

    queries_this_month = counts.get("query", 0)
    docs_indexed_this_month = counts.get("document_indexed", 0)
    hours_saved = round(queries_this_month * 0.5 + docs_indexed_this_month * 1.5, 1)

    return {
        "firm_name": firm.get("name"),
        "plan": firm.get("plan"),
        "plan_limits": firm.get("plan_limits", {}),
        "this_month": {
            "queries": queries_this_month,
            "documents_indexed": docs_indexed_this_month,
            "alerts_generated": counts.get("alert_generated", 0),
            "logins": counts.get("login", 0),
            "estimated_hours_saved": hours_saved,
        },
        "totals": {
            "documents": documents_total,
            "active_matters": matters_active,
        },
    }
