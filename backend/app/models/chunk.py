from pydantic import BaseModel
from typing import Any
from datetime import datetime


class Chunk(BaseModel):
    id: str
    document_id: str
    firm_id: str
    content: str
    chunk_index: int
    metadata: dict[str, Any]
    created_at: datetime


class ChunkWithScore(BaseModel):
    id: str
    document_id: str
    content: str
    metadata: dict[str, Any]
    score: float
