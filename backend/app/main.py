import time
import logging
from collections import defaultdict
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import documents, query, matters, alerts, auth, onboarding, analytics, research, bulk, feedback, templates
from app.core.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s"}',
)
logger = logging.getLogger(__name__)

app = FastAPI(title="LEXIA API", version="0.1.0")

_settings = get_settings()
_allowed_origins = [o.strip() for o in _settings.allowed_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# In-memory rate limiter: 100 req/min per firm_id
_request_counts: dict[str, list[float]] = defaultdict(list)

RATE_LIMIT = 100
RATE_WINDOW = 60.0


@app.middleware("http")
async def rate_limit_and_log(request: Request, call_next):
    firm_id = request.headers.get("X-Firm-ID", "anonymous")
    now = time.time()

    window_start = now - RATE_WINDOW
    _request_counts[firm_id] = [t for t in _request_counts[firm_id] if t > window_start]
    if len(_request_counts[firm_id]) >= RATE_LIMIT:
        return JSONResponse(status_code=429, content={"error": "Rate limit exceeded", "data": None})
    _request_counts[firm_id].append(now)

    start = time.time()
    response = await call_next(request)
    latency_ms = round((time.time() - start) * 1000, 2)

    logger.info(
        '{"firm_id": "%s", "method": "%s", "path": "%s", "status": %d, "latency_ms": %s}',
        firm_id, request.method, request.url.path, response.status_code, latency_ms,
    )

    response.headers["X-Firm-ID"] = firm_id
    return response


app.include_router(documents.router, prefix="/documents", tags=["documents"])
app.include_router(query.router, prefix="/query", tags=["query"])
app.include_router(matters.router, prefix="/matters", tags=["matters"])
app.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(onboarding.router, prefix="/onboarding", tags=["onboarding"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
app.include_router(research.router, prefix="/research", tags=["research"])
app.include_router(bulk.router, prefix="/bulk", tags=["bulk"])
app.include_router(feedback.router, prefix="/feedback", tags=["feedback"])
app.include_router(templates.router, prefix="/templates", tags=["templates"])


@app.get("/health")
async def health():
    return {"status": "ok"}
