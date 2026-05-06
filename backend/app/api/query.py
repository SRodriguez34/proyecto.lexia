import uuid
import logging
from typing import Any
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.services.retrieval import hybrid_search
from app.services.llm import generate_hyde, synthesize_answer
from app.core.supabase import get_supabase

router = APIRouter()
logger = logging.getLogger(__name__)


class QueryRequest(BaseModel):
    query: str
    matter_id: str | None = None
    use_hyde: bool = False


@router.post("")
async def query_documents(
    body: QueryRequest,
    x_firm_id: str = Header(...),
) -> dict[str, Any]:
    search_query = body.query

    if body.use_hyde:
        hypothetical = await generate_hyde(body.query)
        search_query = hypothetical
        logger.info('{"step": "hyde_generated", "query": "%s"}', body.query)

    chunks = await hybrid_search(
        query=search_query,
        firm_id=x_firm_id,
        matter_id=body.matter_id,
    )

    if not chunks:
        return {
            "data": {
                "answer": "No encontré documentos relevantes para responder esta consulta.",
                "sources": [],
                "query_id": str(uuid.uuid4()),
            },
            "error": None,
            "metadata": {},
        }

    supabase = get_supabase()
    doc_ids = list({c.document_id for c in chunks})
    docs_resp = supabase.table("documents").select("id, filename").in_("id", doc_ids).execute()
    doc_names = {d["id"]: d["filename"] for d in (docs_resp.data or [])}

    chunks_for_synthesis = [
        {
            "content": c.content,
            "metadata": c.metadata,
            "document_name": doc_names.get(c.document_id, "Documento desconocido"),
        }
        for c in chunks
    ]

    answer = await synthesize_answer(body.query, chunks_for_synthesis)

    sources = [
        {
            "document_name": doc_names.get(c.document_id, "Documento desconocido"),
            "chunk_content": c.content[:200] + "..." if len(c.content) > 200 else c.content,
            "clause_number": c.metadata.get("clause_number"),
            "relevance_score": round(c.score, 4),
        }
        for c in chunks
    ]

    return {
        "data": {
            "answer": answer,
            "sources": sources,
            "query_id": str(uuid.uuid4()),
        },
        "error": None,
        "metadata": {"chunks_retrieved": len(chunks), "hyde_used": body.use_hyde},
    }
