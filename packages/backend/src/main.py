#!/usr/bin/env python3
import datetime

from api.v2 import admin, auth, progress, tts, version, vocabulary
from core.config import APP_VERSION, CORS_ALLOWED_ORIGINS, LOG_JSON_FORMAT, LOG_LEVEL, PORT, RATE_LIMIT_ENABLED
from core.csrf import validate_origin
from core.database import query_db
from core.json_encoder import CustomJSONResponse
from core.logging import configure_logging, get_logger
from core.request_logging import RequestLoggingMiddleware
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from generated.schemas import HealthResponse, VersionResponse
from pydantic import ValidationError
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

configure_logging(log_level=LOG_LEVEL, json_format=LOG_JSON_FORMAT)
logger = get_logger(__name__)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    client_ip = get_remote_address(request)
    logger.warning(
        "Rate limit exceeded",
        extra={
            "client_ip": client_ip,
            "path": request.url.path,
            "method": request.method,
            "limit": str(exc.detail) if hasattr(exc, "detail") else "unknown",
        },
    )
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please try again later."},
    )


app = FastAPI(
    title="LinguaQuiz API",
    description="Language learning quiz backend with automated spaced repetition",
    version=APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    default_response_class=CustomJSONResponse,
)

app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def csrf_protection(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        validate_origin(request)
    response = await call_next(request)
    return response


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["Cross-Origin-Embedder-Policy"] = "credentialless"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    permissions_policy = "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
    response.headers["Permissions-Policy"] = permissions_policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


limiter = Limiter(key_func=get_remote_address, enabled=RATE_LIMIT_ENABLED)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

app.include_router(auth.router)
app.include_router(vocabulary.router)
app.include_router(progress.router)
app.include_router(tts.router)
app.include_router(admin.router)
app.include_router(version.router)


@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    try:
        query_db("SELECT 1", one=True)
        return HealthResponse(
            status="ok",
            database="connected",
            timestamp=datetime.datetime.utcnow().isoformat(),
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed",
        )


@app.get("/api/version", response_model=VersionResponse, tags=["Health"])
async def get_version():
    return VersionResponse(version=APP_VERSION)


@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"error": "Resource not found"})


@app.exception_handler(500)
async def internal_server_error_handler(request: Request, exc):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error"},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)  # nosec B104
