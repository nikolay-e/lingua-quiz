from collections.abc import Callable
import logging

from core.logging import (
    RequestTimer,
    clear_request_context,
    generate_request_id,
    request_id_var,
    user_id_var,
)
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("lingua_quiz.request")

SKIP_PATHS = {"/api/health", "/api/version", "/docs", "/redoc", "/openapi.json"}


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID") or generate_request_id()
        request_id_var.set(request_id)

        timer = RequestTimer()
        timer.start()

        try:
            response = await call_next(request)
        except Exception as e:
            duration_ms = timer.elapsed_ms()
            self._log_request(request, 500, duration_ms, request_id, error=str(e))
            clear_request_context()
            raise

        duration_ms = timer.elapsed_ms()

        response.headers["X-Request-ID"] = request_id

        if request.url.path not in SKIP_PATHS:
            self._log_request(request, response.status_code, duration_ms, request_id)

        clear_request_context()
        return response

    def _log_request(
        self,
        request: Request,
        status_code: int,
        duration_ms: float,
        request_id: str,
        error: str | None = None,
    ) -> None:
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "")[:100]
        user_id = user_id_var.get("")

        extra = {
            "method": request.method,
            "path": request.url.path,
            "status_code": status_code,
            "duration_ms": round(duration_ms, 2),
            "client_ip": client_ip,
            "user_agent": user_agent,
            "user_id": user_id if user_id else None,
        }

        if status_code >= 500:
            log_level = logging.ERROR
        elif status_code >= 400:
            log_level = logging.WARNING
        else:
            log_level = logging.INFO

        message = f"{request.method} {request.url.path}"
        if error:
            message = f"{message} - {error}"

        logger.log(log_level, message, extra=extra)
