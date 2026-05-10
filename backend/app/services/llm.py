import logging
import json
import re

# ── LLM PROVIDER: xAI (Grok) ──────────────────────────────────────────────────
# Grok expone una API compatible con OpenAI, por eso usamos el SDK de openai
# apuntando a https://api.x.ai/v1.
#
# PARA VOLVER A GEMINI (plan pago):
#   1. Comentar el import de openai y descomentar el de google.generativeai
#   2. Comentar la función _get_client() y descomentar _get_model()
#   3. En cada función, comentar el bloque "# GROK" y descomentar "# GEMINI"
#   4. En config.py: reemplazar xai_api_key por google_api_key
#   5. En requirements.txt: reemplazar openai por google-generativeai==0.8.4
#   6. En .env: reemplazar XAI_API_KEY por GOOGLE_API_KEY
# ──────────────────────────────────────────────────────────────────────────────

# GROK — SDK openai apuntando al endpoint de xAI
from openai import OpenAI

# GEMINI (descomentar para volver):
# import google.generativeai as genai

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
})


# GROK — cliente OpenAI-compatible apuntando a xAI
def _get_client() -> OpenAI:
    settings = get_settings()
    return OpenAI(
        api_key=settings.xai_api_key,
        base_url="https://api.x.ai/v1",
    )

# GEMINI — descomentar para volver:
# def _get_model(fast: bool = False):
#     settings = get_settings()
#     genai.configure(api_key=settings.google_api_key)
#     model_name = settings.llm_flash if fast else settings.llm_pro
#     return genai.GenerativeModel(model_name)


def _model_name(fast: bool = False) -> str:
    settings = get_settings()
    return settings.llm_flash if fast else settings.llm_pro


def _chat(prompt: str, fast: bool = False) -> str:
    """Llamada unificada al LLM. Reemplaza model.generate_content() de Gemini."""
    # GROK — chat completions vía API compatible con OpenAI
    client = _get_client()
    response = client.chat.completions.create(
        model=_model_name(fast=fast),
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content

    # GEMINI (descomentar para volver):
    # model = _get_model(fast=fast)
    # return model.generate_content(prompt).text


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
        "normativa | redaccion | comparacion | soporte. "
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
