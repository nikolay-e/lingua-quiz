#!/usr/bin/env python3
from collections.abc import Sequence
import datetime

from api.v2 import admin, auth, config, progress, speech, tts, version, vocabulary
from core.config import APP_VERSION, CORS_ALLOWED_ORIGINS, LOG_JSON_FORMAT, LOG_LEVEL, PORT
from core.csrf import validate_origin
from core.database import query_db
from core.json_encoder import CustomJSONResponse
from core.logging import configure_logging, get_logger
from core.rate_limit import limiter
from core.request_logging import RequestLoggingMiddleware
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from generated.schemas import HealthResponse, VersionResponse
from pydantic import ValidationError
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

configure_logging(log_level=LOG_LEVEL, json_format=LOG_JSON_FORMAT)
logger = get_logger(__name__)


def rate_limit_exceeded_handler(request: Request, exc: Exception) -> JSONResponse:
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
async def reject_null_bytes(request: Request, call_next):
    if "\x00" in str(request.url):
        return JSONResponse(status_code=400, content={"detail": "Invalid characters in request"})
    response = await call_next(request)
    return response


@app.middleware("http")
async def csrf_protection(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        try:
            validate_origin(request)
        except HTTPException as exc:
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
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
    permissions_policy = "geolocation=(), microphone=(self), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
    response.headers["Permissions-Policy"] = permissions_policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
    csp_policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    response.headers["Content-Security-Policy"] = csp_policy
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

app.include_router(auth.router)
app.include_router(vocabulary.router)
app.include_router(progress.router)
app.include_router(tts.router)
app.include_router(admin.router)
app.include_router(version.router)
app.include_router(config.router)
app.include_router(speech.router)


@app.get("/api/health", tags=["Health"])
async def health_check() -> HealthResponse:
    try:
        query_db("SELECT 1", one=True)
        return HealthResponse(
            status="ok",
            database="connected",
            timestamp=datetime.datetime.now(datetime.UTC).isoformat(),
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed",
        )


@app.get("/api/version", tags=["Health"])
async def get_version() -> VersionResponse:
    return VersionResponse(version=APP_VERSION)


SECURITY_HEADERS = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Cross-Origin-Embedder-Policy": "credentialless",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
}


def _secure_json_response(status_code: int, content: dict) -> JSONResponse:
    return JSONResponse(status_code=status_code, content=content, headers=SECURITY_HEADERS)


def _sanitize_validation_errors(errors: Sequence[dict] | list) -> list[dict]:
    return [{"loc": e.get("loc"), "type": e.get("type"), "msg": e.get("msg")} for e in errors]


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(request: Request, exc: RequestValidationError):
    logger.warning(
        "Request validation error",
        extra={
            "path": request.url.path,
            "method": request.method,
            "errors": _sanitize_validation_errors(exc.errors()),
        },
    )
    return _secure_json_response(status.HTTP_422_UNPROCESSABLE_ENTITY, {"detail": _sanitize_validation_errors(exc.errors())})


@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    logger.warning(
        "Validation error",
        extra={
            "path": request.url.path,
            "method": request.method,
            "errors": _sanitize_validation_errors(exc.errors()),
        },
    )
    return _secure_json_response(status.HTTP_422_UNPROCESSABLE_ENTITY, {"detail": _sanitize_validation_errors(exc.errors())})


@app.exception_handler(404)
async def not_found_handler(_request: Request, _exc):
    return _secure_json_response(status.HTTP_404_NOT_FOUND, {"error": "Resource not found"})


@app.exception_handler(500)
async def internal_server_error_handler(request: Request, exc):
    logger.error("Unhandled error", extra={"path": request.url.path, "method": request.method})
    return _secure_json_response(status.HTTP_500_INTERNAL_SERVER_ERROR, {"error": "An error occurred"})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)  # nosec B104  # nosonar - Docker container requires binding to all interfaces
