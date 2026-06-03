"""Bulk Document Review — analiza N documentos contra un checklist en paralelo."""
import asyncio
import logging
from app.core.supabase import get_supabase
from app.services.llm import _chat

logger = logging.getLogger(__name__)

_POINT_PROMPT = """En este documento legal argentino, respondé:

{punto}

Documento:
{content}

Respondé SOLO con JSON valido:
{{"presente": true/false, "fragmento": "cita textual o null", "pagina": numero_o_null, "explicacion": "una linea"}}"""


async def _analyze_point(content: str, punto: str) -> dict:
    prompt = _POINT_PROMPT.format(punto=punto, content=content[:6000])
    import json, re
    raw = _chat(prompt, fast=True).strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    try:
        return json.loads(raw)
    except Exception:
        return {"presente": None, "fragmento": None, "pagina": None, "explicacion": "Error al procesar"}


async def _process_document(doc_id: str, checklist: list[str]) -> dict:
    supabase = get_supabase()
    chunks = (
        supabase.table("chunks")
        .select("content, chunk_index")
        .eq("document_id", doc_id)
        .order("chunk_index")
        .execute()
    ).data or []
    content = "\n\n".join(c["content"] for c in chunks)

    doc = (
        supabase.table("documents")
        .select("filename")
        .eq("id", doc_id)
        .single()
        .execute()
    ).data or {}

    results = {}
    tasks = [_analyze_point(content, punto) for punto in checklist]
    answers = await asyncio.gather(*tasks, return_exceptions=True)
    for punto, answer in zip(checklist, answers):
        results[punto] = answer if isinstance(answer, dict) else {"presente": None, "fragmento": None, "pagina": None, "explicacion": str(answer)}

    return {
        "document_id": doc_id,
        "document_name": doc.get("filename", doc_id),
        "results": results,
    }


async def run_bulk_review(review_id: str, firm_id: str, document_ids: list[str], checklist: list[str]) -> None:
    supabase = get_supabase()

    def _update(status: str, results=None):
        payload = {"status": status}
        if results is not None:
            payload["results"] = results
        supabase.table("bulk_reviews").update(payload).eq("id", review_id).execute()

    try:
        _update("running")
        all_results = []
        batch_size = 20

        for i in range(0, len(document_ids), batch_size):
            batch = document_ids[i : i + batch_size]
            tasks = [_process_document(doc_id, checklist) for doc_id in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            all_results.extend(r for r in batch_results if isinstance(r, dict))
            logger.info('{"step":"bulk_progress","review":"%s","processed":%d,"total":%d}',
                        review_id, len(all_results), len(document_ids))

        _update("complete", results=all_results)
        logger.info('{"step":"bulk_complete","review":"%s","docs":%d}', review_id, len(all_results))

    except Exception as exc:
        logger.error('{"step":"bulk_error","review":"%s","error":"%s"}', review_id, str(exc))
        _update("failed")
