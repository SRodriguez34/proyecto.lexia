from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Supabase
    supabase_url: str
    supabase_service_key: str

    # AI APIs
    voyage_api_key: str
    google_api_key: str
    cohere_api_key: str

    # App
    jwt_secret: str
    environment: str = "development"

    # Email
    resend_api_key: str = ""

    # RAG
    embedding_model: str = "voyage-law-2"
    embedding_dimensions: int = 1024
    llm_pro: str = "gemini-2.5-pro"
    llm_flash: str = "gemini-2.0-flash"
    rerank_model: str = "rerank-multilingual-v3.0"
    chunk_max_tokens: int = 800
    chunk_min_tokens: int = 50
    rrf_k: int = 60
    retrieval_top_k: int = 20
    rerank_top_n: int = 5


@lru_cache
def get_settings() -> Settings:
    return Settings()
