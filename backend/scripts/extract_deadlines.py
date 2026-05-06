"""Script run by GitHub Actions to extract deadlines from an indexed document."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from backend.app.services.deadlines import extract_deadlines


async def main() -> None:
    document_id = os.environ["DOCUMENT_ID"]

    deadlines = await extract_deadlines(document_id)
    critical = [d for d in deadlines if d.get("is_critical")]
    print(
        f'{{"step": "done", "document_id": "{document_id}", '
        f'"deadlines": {len(deadlines)}, "critical": {len(critical)}}}'
    )
    if critical:
        print("CRITICAL DEADLINES FOUND:")
        for d in critical:
            print(f"  - {d['description']} ({d.get('date') or d.get('days_from_signing', '?')} días)")
        sys.exit(2)  # Non-zero to trigger alert workflow


if __name__ == "__main__":
    asyncio.run(main())
