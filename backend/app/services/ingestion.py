import logging
import tempfile
import os
from typing import Any
from pathlib import Path

import voyageai
from unstructured.partition.auto import partition
from unstructured.documents.elements import Title, NarrativeText, ListItem, Table

from app.core.config import get_settings
from app.core.supabase import get_supabase

logger = logging.getLogger(__name__)


def _estimate_tokens(text: str) -> int:
    return len(text) // 4


def _build_legal_chunks(elements: list) -> list[dict[str, Any]]:
    """Group unstructured elements into legal-aware chunks."""
    settings = get_settings()
    chunks: list[dict[str, Any]] = []
    current_content: list[str] = []
    current_metadata: dict[str, Any] = {}
    current_tokens = 0

    def flush_chunk():
        nonlocal current_content, current_metadata, current_tokens
        if not current_content:
            return
        content = "\n".join(current_content)
        tokens = _estimate_tokens(content)
        if tokens >= settings.chunk_min_tokens:
            chunks.append({"content": content, "metadata": {**current_metadata}})
        current_content = []
        current_metadata = {}
        current_tokens = 0

    for el in elements:
        if not isinstance(el, (Title, NarrativeText, ListItem, Table)):
            continue

        text = str(el).strip()
        if not text:
            continue

        el_tokens = _estimate_tokens(text)
        el_metadata = el.metadata.to_dict() if hasattr(el, "metadata") else {}

        is_title = isinstance(el, Title)

        # A new title signals a new clause/section — flush previous chunk
        if is_title and current_content:
            flush_chunk()

        # If adding this element exceeds max, flush first
        if current_tokens + el_tokens > settings.chunk_max_tokens and current_content:
            flush_chunk()

        if is_title:
            clause = _extract_clause_number(text)
            current_metadata = {
                "clause_number": clause,
                "section": text,
                "page": el_metadata.get("page_number"),
                "element_type": "section_header",
            }

        current_content.append(text)
        current_tokens += el_tokens
        if not current_metadata:
            current_metadata = {
                "clause_number": None,
                "section": None,
                "page": el_metadata.get("page_number"),
                "element_type": type(el).__name__,
            }

    flush_chunk()
    return chunks


def _extract_clause_number(text: str) -> str | None:
    import re
    patterns = [
        r"(?:ARTÍCULO|Artículo|Art\.?)\s+(\d+[°º]?)",
        r"(?:CLÁUSULA|Cláusula)\s+(\w+)",
        r"^(\d+[\.\)])",
    ]
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return m.group(1)
    return None


def _embed_batch(texts: list[str]) -> list[list[float]]:
    settings = get_settings()
    client = voyageai.Client(api_key=settings.voyage_api_key)
    batch_size = 128
    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        result = client.embed(batch, model=settings.embedding_model, input_type="document")
        all_embeddings.extend(result.embeddings)

    return all_embeddings


async def ingest_document(
    file_bytes: bytes,
    filename: str,
    firm_id: str,
    matter_id: str | None = None,
) -> str:
    """Full ingestion pipeline. Returns the document_id."""
    settings = get_settings()
    supabase = get_supabase()
    file_type = Path(filename).suffix.lower().lstrip(".")

    # Insert document record
    doc_resp = (
        supabase.table("documents")
        .insert({
            "firm_id": firm_id,
            "matter_id": matter_id,
            "filename": filename,
            "file_type": file_type,
            "status": "processing",
        })
        .execute()
    )
    document_id: str = doc_resp.data[0]["id"]
    logger.info('{"step": "created_document", "document_id": "%s"}', document_id)

    try:
        # STEP 1 — Parse
        with tempfile.NamedTemporaryFile(suffix=f".{file_type}", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            elements = partition(filename=tmp_path)
        finally:
            os.unlink(tmp_path)

        logger.info(
            '{"step": "parsed", "document_id": "%s", "elements": %d}',
            document_id, len(elements),
        )

        # STEP 2 — Legal-aware chunking
        raw_chunks = _build_legal_chunks(elements)
        if not raw_chunks:
            raise ValueError("No usable chunks extracted from document")

        logger.info(
            '{"step": "chunked", "document_id": "%s", "chunks": %d}',
            document_id, len(raw_chunks),
        )

        # STEP 3 — Embed
        texts = [c["content"] for c in raw_chunks]
        embeddings = _embed_batch(texts)

        # STEP 4a — Build parent chunks (group by clause/section for broader context)
        section_groups: dict[str, list[int]] = {}
        for i, chunk in enumerate(raw_chunks):
            section_key = chunk["metadata"].get("clause_number") or chunk["metadata"].get("section") or f"section_{i}"
            section_groups.setdefault(section_key, []).append(i)

        parent_id_map: dict[str, str] = {}
        for section_key, indices in section_groups.items():
            parent_content = "\n\n".join(raw_chunks[j]["content"] for j in indices)
            p_resp = supabase.table("parent_chunks").insert({
                "document_id": document_id,
                "firm_id": firm_id,
                "content": parent_content,
                "chunk_index": indices[0],
                "metadata": {"section": section_key, "child_count": len(indices)},
            }).execute()
            if p_resp.data:
                parent_id_map[section_key] = p_resp.data[0]["id"]

        # STEP 4b — Store child chunks with parent_chunk_id
        rows = [
            {
                "document_id": document_id,
                "firm_id": firm_id,
                "content": raw_chunks[i]["content"],
                "embedding": embeddings[i],
                "chunk_index": i,
                "metadata": raw_chunks[i]["metadata"],
                "parent_chunk_id": parent_id_map.get(
                    raw_chunks[i]["metadata"].get("clause_number")
                    or raw_chunks[i]["metadata"].get("section")
                    or f"section_{i}"
                ),
            }
            for i in range(len(raw_chunks))
        ]

        for i in range(0, len(rows), 500):
            supabase.table("chunks").insert(rows[i : i + 500]).execute()

        supabase.table("documents").update({"status": "indexed"}).eq("id", document_id).execute()
        logger.info('{"step": "indexed", "document_id": "%s"}', document_id)

    except Exception as exc:
        supabase.table("documents").update({"status": "failed"}).eq("id", document_id).execute()
        logger.error(
            '{"step": "failed", "document_id": "%s", "error": "%s"}',
            document_id, str(exc),
        )
        raise RuntimeError(f"Ingestion failed at document {document_id}: {exc}") from exc

    return document_id
