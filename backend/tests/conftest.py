"""Stub out external SDK packages so tests run without installed dependencies."""
import sys
from types import ModuleType
from unittest.mock import MagicMock


def _stub(name: str) -> MagicMock:
    mock = MagicMock()
    mock.__name__ = name
    mock.__spec__ = None
    return mock


_STUBS = [
    "voyageai",
    "cohere",
    "google.generativeai",
    "google",
    "supabase",
    "pydantic_settings",
    "jose",
    "passlib",
    "passlib.context",
    "unstructured",
]

for _pkg in _STUBS:
    if _pkg not in sys.modules:
        sys.modules[_pkg] = _stub(_pkg)

# pydantic_settings.BaseSettings must be a real class for Pydantic models to inherit from it
import pydantic

class _BaseSettings(pydantic.BaseModel):
    model_config = pydantic.ConfigDict(extra="ignore")

_ps = sys.modules["pydantic_settings"]
_ps.BaseSettings = _BaseSettings
_ps.SettingsConfigDict = dict

# google.generativeai is used as `genai.configure(...)` and `genai.GenerativeModel(...)`
import google.generativeai  # noqa: E402 — already stubbed above, just referencing
