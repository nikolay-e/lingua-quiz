import logging
from urllib.parse import urlparse

from core.config import CORS_ALLOWED_ORIGINS
from fastapi import HTTPException, Request, status

logger = logging.getLogger(__name__)


def validate_origin(request: Request) -> None:
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return

    origin = request.headers.get("Origin")
    referer = request.headers.get("Referer")

    if not origin and not referer:
        # Allow internal requests from localhost and Docker network
        if request.url.hostname in {"localhost", "127.0.0.1", "backend", "frontend"}:
            return
        logger.warning(f"Missing Origin/Referer for {request.method} {request.url.path}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Origin validation failed",
        )

    source = origin or (urlparse(referer).scheme + "://" + urlparse(referer).netloc if referer else None)

    if not source:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Origin validation failed",
        )

    allowed_origins_set = set(CORS_ALLOWED_ORIGINS)
    if "*" not in allowed_origins_set and source not in allowed_origins_set:
        logger.warning(f"Invalid origin {source} for {request.method} {request.url.path}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Origin validation failed",
        )
