from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.core.exceptions import http_exception_handler, validation_exception_handler
from app.api import auth, webhooks, events, endpoints, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup / shutdown lifecycle.
    Add DB health checks, cache warming, etc. here in production.
    """
    yield


app = FastAPI(
    title="HookLens API",
    description="Webhook reliability and failure-triage platform.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Middleware ─────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Exception handlers ─────────────────────────────────────────────────────────

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# ── Routes ─────────────────────────────────────────────────────────────────────

app.include_router(auth.router,      prefix="/api/v1/auth",      tags=["Auth"])
app.include_router(webhooks.router,  prefix="/api/v1/webhooks",  tags=["Webhooks"])
app.include_router(events.router,    prefix="/api/v1/events",    tags=["Events"])
app.include_router(endpoints.router, prefix="/api/v1/endpoints", tags=["Endpoints"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])


@app.get("/health", tags=["System"])
def health_check():
    """Liveness probe — load balancers and Docker HEALTHCHECK hit this."""
    return {"status": "ok", "service": "hooklens-api"}
