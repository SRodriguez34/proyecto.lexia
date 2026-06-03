import logging
import json
import re

# ── LLM PROVIDER: Google Gemini ───────────────────────────────────────────────
# Proveedor activo: Gemini 2.5 Pro (síntesis) + Gemini 2.0 Flash (clasificación)
# API key con prepago — google_api_key en config / GOOGLE_API_KEY en .env
#
# PARA CAMBIAR A GROK (xAI, API compatible con OpenAI):
#   1. Comentar el import de google.generativeai y descomentar el de openai
#   2. Comentar _get_model() y descomentar _get_client()
#   3. En _chat(): comentar bloque GEMINI y descomentar bloque GROK
#   4. En config.py: reemplazar google_api_key por xai_api_key
#   5. En requirements.txt: reemplazar google-generativeai por openai>=1.30.0
#   6. En .env: reemplazar GOOGLE_API_KEY por XAI_API_KEY
# ──────────────────────────────────────────────────────────────────────────────

# GEMINI
import google.generativeai as genai

# GROK (descomentar para cambiar):
# from openai import OpenAI

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_VALID_INTENTS = frozenset({
    "consulta_documento",
    "ingesta",
    "resumen_causa",
    "extraccion_plazos",
    "normativa",
    "redaccion",
    "comparacion",
    "soporte",
    "deep_research",
    "bulk_review",
    "workflow_template",
})


# GEMINI — configura y devuelve el modelo generativo
def _get_model(fast: bool = False):
    settings = get_settings()
    genai.configure(api_key=settings.google_api_key)
    model_name = settings.llm_flash if fast else settings.llm_pro
    return genai.GenerativeModel(model_name)

# GROK (descomentar para cambiar):
# def _get_client() -> OpenAI:
#     settings = get_settings()
#     return OpenAI(api_key=settings.xai_api_key, base_url="https://api.x.ai/v1")


def _chat(prompt: str, fast: bool = False) -> str:
    """Llamada unificada al LLM activo."""
    # GEMINI
    model = _get_model(fast=fast)
    return model.generate_content(prompt).text

    # GROK (descomentar para cambiar):
    # client = _get_client()
    # settings = get_settings()
    # model_name = settings.llm_flash if fast else settings.llm_pro
    # response = client.chat.completions.create(
    #     model=model_name,
    #     messages=[{"role": "user", "content": prompt}],
    # )
    # return response.choices[0].message.content


async def generate_hyde(query: str) -> str:
    """Genera un documento hipotético para HyDE."""
    prompt = (
        f"Sos un abogado argentino experto. Genera un párrafo breve de un "
        f"documento legal argentino que respondería esta pregunta: {query}. "
        f"Solo el párrafo, sin explicaciones."
    )
    return _chat(prompt, fast=True)


async def synthesize_answer(query: str, chunks: list[dict]) -> str:
    """Sintetiza una respuesta RAG a partir de los chunks recuperados."""
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        doc_name = chunk.get("document_name", "Documento desconocido")
        clause = chunk.get("metadata", {}).get("clause_number", "")
        clause_ref = f" — {clause}" if clause else ""
        context_parts.append(f"[{i}] {doc_name}{clause_ref}:\n{chunk['content']}")

    context = "\n\n".join(context_parts)
    prompt = (
        "Sos un asistente legal especializado en derecho argentino. "
        "Respondé ÚNICAMENTE basándote en los fragmentos de documentos proporcionados. "
        "Citá siempre la fuente (nombre del documento y número de cláusula si existe). "
        "Si la información no está en los fragmentos, decí explícitamente que no podés "
        "responderlo con la documentación disponible. Nunca inventes artículos o jurisprudencia."
        f"\n\nFragmentos:\n{context}\n\nPregunta: {query}"
    )
    return _chat(prompt, fast=False)


async def generate_matter_summary(content: str) -> str:
    prompt = (
        "Analizá todos los documentos de esta causa legal argentina y generá "
        "un resumen estructurado con: 1) Descripción de la causa y partes "
        "involucradas 2) Estado actual y últimas actuaciones 3) Plazos críticos "
        "identificados 4) Riesgos o puntos de atención 5) Próximos pasos "
        "recomendados. Formato: markdown con headers claros.\n\n"
        f"Documentos:\n{content}"
    )
    return _chat(prompt, fast=False)


async def classify_intent(message: str) -> str:
    """Clasifica el mensaje en uno de los 8 intents de routing."""
    prompt = (
        "Clasificá esta solicitud en una categoría: "
        "consulta_documento | ingesta | resumen_causa | extraccion_plazos | "
        "normativa | redaccion | comparacion | soporte | "
        "deep_research | bulk_review | workflow_template. "
        "Solo devolvé la categoría, sin explicación.\n\n"
        f"Solicitud: {message}"
    )
    intent = _chat(prompt, fast=True).strip().lower()
    if intent not in _VALID_INTENTS:
        logger.warning('{"step": "classify_intent", "raw": "%s", "fallback": "soporte"}', intent)
        return "soporte"
    return intent


async def generate_with_skill(
    message: str,
    skill_content: str,
    context: str = "",
    fast: bool = False,
) -> str:
    """Genera una respuesta usando el skill.md como system prompt."""
    parts = [skill_content]
    if context:
        parts.append(f"\nContexto disponible:\n{context}")
    parts.append(f"\nSolicitud del usuario: {message}")
    return _chat("\n".join(parts), fast=fast)


async def extract_deadlines_from_text(content: str) -> list[dict]:
    prompt = (
        "Analizá este documento legal argentino y extraé TODOS los plazos, "
        "fechas y vencimientos mencionados. Para cada uno devolvé JSON con: "
        "{description: str, date: str | null, days_from_signing: int | null, "
        "is_critical: bool, legal_reference: str | null}. "
        "Solo devolvé el array JSON, sin texto adicional.\n\n"
        f"Documento:\n{content}"
    )
    text = _chat(prompt, fast=True).strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)
