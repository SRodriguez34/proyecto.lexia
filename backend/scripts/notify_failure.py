"""Notify a firm of an ingestion failure via Supabase alert."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from backend.app.core.supabase import get_supabase


def main() -> None:
    firm_id = os.environ.get("FIRM_ID")
    if not firm_id:
        print("FIRM_ID not set, skipping notification")
        return

    supabase = get_supabase()
    supabase.table("alerts").insert({
        "firm_id": firm_id,
        "normativa_item_id": None,
        "affected_documents": [],
        "status": "pending",
    }).execute()
    print(f'{{"step": "failure_notified", "firm_id": "{firm_id}"}}')


if __name__ == "__main__":
    main()
