from contextvars import ContextVar
import logging
import re
import sys
import time
from typing import Any, ClassVar
import uuid

request_id_var: ContextVar[str] = ContextVar("request_id", default="")
user_id_var: ContextVar[str] = ContextVar("user_id", default="")

SENSITIVE_PATTERNS = [
    (re.compile(r"(password[\"']?\s*[:=]\s*[\"']?)[^\"'\s,}]+", re.IGNORECASE), r"\1***"),
    (re.compile(r"(secret[\"']?\s*[:=]\s*[\"']?)[^\"'\s,}]+", re.IGNORECASE), r"\1***"),
    (re.compile(r"(token[\"']?\s*[:=]\s*[\"']?)[^\"'\s,}]+", re.IGNORECASE), r"\1***"),
    (re.compile(r"(api[_-]?key[\"']?\s*[:=]\s*[\"']?)[^\"'\s,}]+", re.IGNORECASE), r"\1***"),
    (re.compile(r"(authorization[\"']?\s*[:=]\s*[\"']?)[^\"'\s,}]+", re.IGNORECASE), r"\1***"),
    (re.compile(r"(bearer\s+)[^\s\"']+", re.IGNORECASE), r"\1***"),
    (re.compile(r"(basic\s+)[^\s\"']+", re.IGNORECASE), r"\1***"),
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"), "***@***.***"),
]


def mask_sensitive_data(message: str) -> str:
    for pattern, replacement in SENSITIVE_PATTERNS:
        message = pattern.sub(replacement, message)
    return message


class SensitiveDataFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = mask_sensitive_data(record.msg)
        if record.args:
            record.args = tuple(mask_sensitive_data(str(arg)) if isinstance(arg, str) else arg for arg in record.args)
        return True


class ContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get("")
        record.user_id = user_id_var.get("")
        return True


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        import json

        log_data: dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        request_id = getattr(record, "request_id", "")
        if request_id:
            log_data["request_id"] = request_id

        user_id = getattr(record, "user_id", "")
        if user_id:
            log_data["user_id"] = user_id

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        extra_fields = {"method", "path", "status_code", "duration_ms", "client_ip", "user_agent"}
        for field in extra_fields:
            value = getattr(record, field, None)
            if value is not None:
                log_data[field] = value

        return json.dumps(log_data, default=str)


class ConsoleFormatter(logging.Formatter):
    COLORS: ClassVar[dict[str, str]] = {
        "DEBUG": "\033[36m",
        "INFO": "\033[32m",
        "WARNING": "\033[33m",
        "ERROR": "\033[31m",
        "CRITICAL": "\033[35m",
    }
    RESET: ClassVar[str] = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, "")
        request_id = getattr(record, "request_id", "")
        user_id = getattr(record, "user_id", "")

        context_parts = []
        if request_id:
            context_parts.append(f"req={request_id[:8]}")
        if user_id:
            context_parts.append(f"user={user_id}")

        context_str = f" [{' '.join(context_parts)}]" if context_parts else ""

        extra_parts = []
        for field in ["method", "path", "status_code", "duration_ms"]:
            value = getattr(record, field, None)
            if value is not None:
                extra_parts.append(f"{field}={value}")
        extra_str = f" ({', '.join(extra_parts)})" if extra_parts else ""

        formatted = f"{self.formatTime(record)} {color}{record.levelname:8}{self.RESET} {record.name}{context_str} - {record.getMessage()}{extra_str}"

        if record.exc_info:
            formatted += "\n" + self.formatException(record.exc_info)

        return formatted


def configure_logging(log_level: str = "INFO", json_format: bool = False) -> None:
    root_logger = logging.getLogger()

    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)

    if json_format:
        handler.setFormatter(JSONFormatter(datefmt="%Y-%m-%dT%H:%M:%S%z"))
    else:
        handler.setFormatter(ConsoleFormatter(datefmt="%Y-%m-%d %H:%M:%S"))

    handler.addFilter(SensitiveDataFilter())
    handler.addFilter(ContextFilter())

    root_logger.addHandler(handler)
    root_logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def bind_request_context(request_id: str | None = None, user_id: str | None = None) -> None:
    if request_id:
        request_id_var.set(request_id)
    if user_id:
        user_id_var.set(user_id)


def clear_request_context() -> None:
    request_id_var.set("")
    user_id_var.set("")


def generate_request_id() -> str:
    return str(uuid.uuid4())


class RequestTimer:
    def __init__(self) -> None:
        self.start_time: float = 0

    def start(self) -> None:
        self.start_time = time.perf_counter()

    def elapsed_ms(self) -> float:
        return (time.perf_counter() - self.start_time) * 1000
