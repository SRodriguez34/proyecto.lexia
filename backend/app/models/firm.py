from typing import Literal
from pydantic import BaseModel, EmailStr

Plan = Literal["trial", "solo", "estudio", "enterprise"]

PLAN_LIMITS: dict[str, dict] = {
    "trial":      {"documents_per_month": 20,  "queries_per_month": 100,  "users": 1},
    "solo":       {"documents_per_month": 100, "queries_per_month": 500,  "users": 1},
    "estudio":    {"documents_per_month": 500, "queries_per_month": 2000, "users": 10},
    "enterprise": {"documents_per_month": -1,  "queries_per_month": -1,   "users": -1},
}


class RegisterRequest(BaseModel):
    email: str
    password: str
    firm_name: str


class InviteRequest(BaseModel):
    email: str


class OnboardingStepRequest(BaseModel):
    step: int
    provincia: str | None = None
    materia_principal: str | None = None
    completed: bool = False
