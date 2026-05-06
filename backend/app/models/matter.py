from pydantic import BaseModel
from datetime import datetime
from typing import Literal


class MatterCreate(BaseModel):
    caratula: str
    client_name: str
    matter_type: str
    status: Literal["active", "closed", "suspended"] = "active"


class MatterUpdate(BaseModel):
    caratula: str | None = None
    client_name: str | None = None
    matter_type: str | None = None
    status: Literal["active", "closed", "suspended"] | None = None


class MatterResponse(BaseModel):
    id: str
    firm_id: str
    caratula: str
    client_name: str
    matter_type: str
    status: str
    created_at: datetime
