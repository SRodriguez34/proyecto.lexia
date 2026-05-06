import logging
import google.generativeai as genai
from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _get_model(fast: bool = False):
    settings = get_settings()
    genai.configure(api_key=settings.google_api_key)
    model_name = settings.llm_flash if fast else settings.llm_pro
    return genai.GenerativeModel(model_name)


async def generate_hyde(query: str) -> str:
    """Generate a hypothetical document excerpt for HyDE."""
    model = _get_model(fast=True)
    prompt = (
        f"Sos un abogado argentino experto. Genera un párrafo breve de un "
        f"documento legal argentino que respondería esta pregunta: {query}. "
        f"Solo el párrafo, sin explicaciones."
    )
    response = model.generate_content(prompt)
    return response.text


async def synthesize_answer(query: str, chunks: list[dict]) -> str:
    """Synthesize a RAG answer from retrieved chunks."""
    model = _get_model(fast=False)

    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        doc_name = chunk.get("document_name", "Documento desconocido")
        clause = chunk.get("metadata", {}).get("clause_number", "")
        clause_ref = f" — {clause}" if clause else ""
        context_parts.append(f"[{i}] {doc_name}{clause_ref}:\n{chunk['content']}")

    context = "\n\n".join(context_parts)

    system_prompt = (
        "Sos un asistente legal especializado en derecho argentino. "
        "Respondé ÚNICAMENTE basándote en los fragmentos de documentos proporcionados. "
        "Citá siempre la fuente (nombre del documento y número de cláusula si existe). "
        "Si la información no está en los fragmentos, decí explícitamente que no podés "
        "responderlo con la documentación disponible. Nunca inventes artículos o jurisprudencia."
    )

    full_prompt = f"{system_prompt}\n\nFragmentos:\n{context}\n\nPregunta: {query}"
    response = model.generate_content(full_prompt)
    return response.text


async def generate_matter_summary(content: str) -> str:
    model = _get_model(fast=False)
    prompt = (
        "Analizá todos los documentos de esta causa legal argentina y generá "
        "un resumen estructurado con: 1) Descripción de la causa y partes "
        "involucradas 2) Estado actual y últimas actuaciones 3) Plazos críticos "
        "identificados 4) Riesgos o puntos de atención 5) Próximos pasos "
        "recomendados. Formato: markdown con headers claros.\n\n"
        f"Documentos:\n{content}"
    )
    response = model.generate_content(prompt)
    return response.text


async def extract_deadlines_from_text(content: str) -> list[dict]:
    import json
    import re
    model = _get_model(fast=True)
    prompt = (
        "Analizá este documento legal argentino y extraé TODOS los plazos, "
        "fechas y vencimientos mencionados. Para cada uno devolvé JSON con: "
        "{description: str, date: str | null, days_from_signing: int | null, "
        "is_critical: bool, legal_reference: str | null}. "
        "Solo devolvé el array JSON, sin texto adicional.\n\n"
        f"Documento:\n{content}"
    )
    response = model.generate_content(prompt)
    text = response.text.strip()
    # Strip markdown code fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)
