import uuid
import logging
import pathlib
from typing import Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.services.retrieval import hybrid_search
from app.services.llm import generate_hyde, synthesize_answer, classify_intent, generate_with_skill
from app.core.supabase import get_supabase
from app.core.security import get_current_firm

router = APIRouter()
logger = logging.getLogger(__name__)

_SKILLS_DIR = pathlib.Path(__file__).parents[2] / "lexia-skills"

# (flow_directory, use_fast_model)
_FLOW_MAP: dict[str, tuple[str, bool]] = {
    "consulta_documento": ("flujo-rag",           False),
    "resumen_causa":      ("flujo-resumen",        False),
    "extraccion_plazos":  ("flujo-plazos",         True),
    "normativa":          ("flujo-normativa",      True),
    "redaccion":          ("flujo-redaccion",      False),
    "comparacion":        ("flujo-comparacion",    False),
    "soporte":            ("flujo-soporte",        True),
    "deep_research":      ("flujo-deep-research",  False),
    "bulk_review":        ("flujo-bulk-review",    True),
    "workflow_template":  ("flujo-templates",      True),
}


class QueryRequest(BaseModel):
    query: str
    matter_id: str | None = None
    use_hyde: bool = False
    scope: str = "matter"
    materia: str | None = None


class RouteRequest(BaseModel):
    message: str
    matter_id: str | None = None
    document_id: str | None = None


@router.post("")
async def query_documents(
    body: QueryRequest,
    firm_id: str = Depends(get_current_firm),
) -> dict[str, Any]:
    search_query = body.query

    if body.use_hyde:
        hypothetical = await generate_hyde(body.query)
        search_query = hypothetical
        logger.info('{"step": "hyde_generated", "query": "%s"}', body.query)

    chunks = await hybrid_search(
        query=search_query,
        firm_id=firm_id,
        matter_id=body.matter_id,
        scope=body.scope,
        materia=body.materia,
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


def _load_skill(flow_name: str) -> str:
    skill_path = _SKILLS_DIR / flow_name / "skill.md"
    if skill_path.exists():
        return skill_path.read_text(encoding="utf-8")
    logger.warning('{"step": "load_skill", "flow": "%s", "missing": true}', flow_name)
    return f"Sos un asistente legal especializado en derecho argentino. Flujo: {flow_name}."


async def _gather_context(
    intent: str,
    firm_id: str,
    matter_id: str | None,
    document_id: str | None,
    message: str,
) -> str:
    supabase = get_supabase()

    if intent == "consulta_documento":
        chunks = await hybrid_search(query=message, firm_id=firm_id, matter_id=matter_id)
        return "\n\n".join(f"[{i + 1}] {c.content}" for i, c in enumerate(chunks))

    if intent == "resumen_causa":
        if not matter_id:
            return ""
        docs = (
            supabase.table("documents")
            .select("id")
            .eq("matter_id", matter_id)
            .eq("firm_id", firm_id)
            .execute()
        )
        doc_ids = [d["id"] for d in (docs.data or [])]
        if not doc_ids:
            return ""
        rows = (
            supabase.table("chunks")
            .select("content, chunk_index")
            .in_("document_id", doc_ids)
            .order("chunk_index")
            .execute()
        )
        return "\n\n".join(r["content"] for r in (rows.data or []))

    if intent == "extraccion_plazos":
        if not document_id:
            return ""
        rows = (
            supabase.table("chunks")
            .select("content, chunk_index")
            .eq("document_id", document_id)
            .order("chunk_index")
            .execute()
        )
        return "\n\n".join(r["content"] for r in (rows.data or []))

    if intent == "normativa":
        rows = (
            supabase.table("normativa_items")
            .select("title, summary, published_at, source_url")
            .order("published_at", desc=True)
            .limit(3)
            .execute()
        )
        parts = []
        for item in (rows.data or []):
            parts.append(
                f"**{item.get('title', '')}** ({item.get('published_at', '')})\n"
                f"{item.get('summary', '')}\n"
                f"Fuente: {item.get('source_url', '')}"
            )
        return "\n\n".join(parts)

    # redaccion, comparacion, soporte: no external context needed
    return ""


@router.post("/route")
async def route_request(
    body: RouteRequest,
    firm_id: str = Depends(get_current_firm),
) -> dict[str, Any]:
    intent = await classify_intent(body.message)
    logger.info('{"step": "route_request", "intent": "%s"}', intent)

    # Ingesta never runs from chat — it has a dedicated upload endpoint
    if intent == "ingesta":
        return {
            "data": {
                "answer": (
                    "Para subir documentos usá el endpoint de carga de documentos "
                    "(POST /documents). Desde el chat no se pueden procesar archivos."
                ),
                "sources": [],
                "query_id": str(uuid.uuid4()),
            },
            "error": None,
            "metadata": {"flow": "flujo-ingesta", "intent": intent},
        }

    flow_name, use_fast = _FLOW_MAP.get(intent, _FLOW_MAP["soporte"])
    skill_content = _load_skill(flow_name)

    context = await _gather_context(
        intent=intent,
        firm_id=firm_id,
        matter_id=body.matter_id,
        document_id=body.document_id,
        message=body.message,
    )

    answer = await generate_with_skill(
        message=body.message,
        skill_content=skill_content,
        context=context,
        fast=use_fast,
    )

    return {
        "data": {
            "answer": answer,
            "sources": [],
            "query_id": str(uuid.uuid4()),
        },
        "error": None,
        "metadata": {
            "flow": flow_name,
            "intent": intent,
            "context_length": len(context),
        },
    }
