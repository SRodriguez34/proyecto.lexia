from pydantic import BaseModel, Field
from typing import Any
from datetime import datetime
import uuid


class DocumentCreate(BaseModel):
    firm_id: str
    matter_id: str | None = None
    filename: str
    file_type: str


class DocumentResponse(BaseModel):
    id: str
    firm_id: str
    matter_id: str | None
    filename: str
    file_type: str
    status: str
    metadata: dict[str, Any]
    created_at: datetime
