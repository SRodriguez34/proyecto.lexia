"""Tests for route_request() — verifies that each of the 8 message types
is classified into the correct flow."""
import asyncio
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# One representative message per intent type
_CASES: list[tuple[str, str, str]] = [
    # (message, mocked_intent, expected_flow)
    (
        "¿Qué dice la cláusula 5 del contrato sobre el plazo de entrega?",
        "consulta_documento",
        "flujo-rag",
    ),
    (
        "Quiero subir este PDF al expediente laboral de García",
        "ingesta",
        "flujo-ingesta",
    ),
    (
        "Haceme un resumen completo de la causa Rodríguez vs Empresa SA",
        "resumen_causa",
        "flujo-resumen",
    ),
    (
        "Extraé todos los plazos y vencimientos del contrato de locación",
        "extraccion_plazos",
        "flujo-plazos",
    ),
    (
        "¿Hay alguna nueva ley laboral publicada esta semana que afecte mis contratos?",
        "normativa",
        "flujo-normativa",
    ),
    (
        "Redactá una cláusula de confidencialidad para un contrato de software",
        "redaccion",
        "flujo-redaccion",
    ),
    (
        "Compará este contrato de alquiler con el modelo anterior y decime las diferencias",
        "comparacion",
        "flujo-comparacion",
    ),
    (
        "¿Cómo hago para subir documentos a la plataforma?",
        "soporte",
        "flujo-soporte",
    ),
]


def _run(coro):
    """Run a coroutine synchronously (avoids pytest-asyncio dependency)."""
    return asyncio.run(coro)


@pytest.mark.parametrize("message,mocked_intent,expected_flow", _CASES)
def test_route_returns_correct_flow(message: str, mocked_intent: str, expected_flow: str):
    """route_request must return the matching flow name in metadata for each intent."""
    from app.api.query import RouteRequest, route_request

    dummy_answer = "Respuesta de prueba."

    with (
        patch("app.api.query.classify_intent", new=AsyncMock(return_value=mocked_intent)),
        patch("app.api.query._gather_context", new=AsyncMock(return_value="")),
        patch("app.api.query.generate_with_skill", new=AsyncMock(return_value=dummy_answer)),
    ):
        response = _run(
            route_request(
                body=RouteRequest(message=message),
                x_firm_id="firm-test-123",
            )
        )

    assert response["error"] is None
    assert response["metadata"]["flow"] == expected_flow
    assert response["metadata"]["intent"] == mocked_intent


@pytest.mark.parametrize("message,mocked_intent,expected_flow", _CASES)
def test_route_data_shape(message: str, mocked_intent: str, expected_flow: str):
    """Every flow must return the standard {data, error, metadata} envelope."""
    from app.api.query import RouteRequest, route_request

    with (
        patch("app.api.query.classify_intent", new=AsyncMock(return_value=mocked_intent)),
        patch("app.api.query._gather_context", new=AsyncMock(return_value="")),
        patch("app.api.query.generate_with_skill", new=AsyncMock(return_value="ok")),
    ):
        response = _run(
            route_request(
                body=RouteRequest(message=message),
                x_firm_id="firm-test-123",
            )
        )

    assert "data" in response
    assert "error" in response
    assert "metadata" in response
    assert "answer" in response["data"]
    assert "query_id" in response["data"]
    # query_id must be a valid UUID
    uuid.UUID(response["data"]["query_id"])


def test_ingesta_never_calls_llm():
    """Ingesta classified messages must redirect without calling generate_with_skill."""
    from app.api.query import RouteRequest, route_request

    generate_mock = MagicMock()

    with (
        patch("app.api.query.classify_intent", new=AsyncMock(return_value="ingesta")),
        patch("app.api.query.generate_with_skill", generate_mock),
    ):
        response = _run(
            route_request(
                body=RouteRequest(message="Subí este PDF"),
                x_firm_id="firm-test-123",
            )
        )

    generate_mock.assert_not_called()
    assert response["metadata"]["flow"] == "flujo-ingesta"
    assert "endpoint" in response["data"]["answer"].lower() or "document" in response["data"]["answer"].lower()


def test_unknown_intent_falls_back_to_soporte():
    """An unrecognized intent from the LLM must fall back to 'soporte'."""
    from app.api.query import RouteRequest, route_request

    with (
        patch("app.api.query.classify_intent", new=AsyncMock(return_value="soporte")),
        patch("app.api.query._gather_context", new=AsyncMock(return_value="")),
        patch("app.api.query.generate_with_skill", new=AsyncMock(return_value="ok")),
    ):
        response = _run(
            route_request(
                body=RouteRequest(message="algo extraño"),
                x_firm_id="firm-test-123",
            )
        )

    assert response["metadata"]["flow"] == "flujo-soporte"
