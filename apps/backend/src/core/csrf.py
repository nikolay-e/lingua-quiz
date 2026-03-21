from urllib.parse import urlparse

from core.config import CORS_ALLOWED_ORIGINS
from core.logging import get_logger
from fastapi import HTTPException, Request, status

logger = get_logger(__name__)

ORIGIN_VALIDATION_FAILED = "Origin validation failed"


def validate_origin(request: Request) -> None:
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return

    origin = request.headers.get("Origin")
    referer = request.headers.get("Referer")

    if not origin and not referer:
        if request.url.hostname in {"localhost", "127.0.0.1", "backend", "frontend"}:
            return
        logger.warning(f"Missing Origin/Referer for {request.method} {request.url.path}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ORIGIN_VALIDATION_FAILED,
        )

    source = origin or (urlparse(referer).scheme + "://" + urlparse(referer).netloc if referer else None)

    if not source:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ORIGIN_VALIDATION_FAILED,
        )

    allowed_origins_set = set(CORS_ALLOWED_ORIGINS)
    if "*" not in allowed_origins_set and source not in allowed_origins_set:
        logger.warning(f"Invalid origin {source} for {request.method} {request.url.path}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ORIGIN_VALIDATION_FAILED,
        )
