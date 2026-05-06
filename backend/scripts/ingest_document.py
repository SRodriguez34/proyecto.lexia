"""Script run by GitHub Actions to ingest a document from a URL."""
import asyncio
import os
import sys
import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from backend.app.services.ingestion import ingest_document


async def main() -> None:
    document_url = os.environ["DOCUMENT_URL"]
    document_name = os.environ["DOCUMENT_NAME"]
    firm_id = os.environ["FIRM_ID"]
    matter_id = os.environ.get("MATTER_ID") or None

    print(f'{{"step": "download", "url": "{document_url}"}}')
    async with httpx.AsyncClient(follow_redirects=True, timeout=120) as client:
        resp = await client.get(document_url)
        resp.raise_for_status()
        file_bytes = resp.content

    document_id = await ingest_document(
        file_bytes=file_bytes,
        filename=document_name,
        firm_id=firm_id,
        matter_id=matter_id,
    )
    print(f'{{"step": "done", "document_id": "{document_id}"}}')


if __name__ == "__main__":
    asyncio.run(main())
