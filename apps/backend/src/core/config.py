import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)  # Standard logger used during config loading

# Database configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", 5432))
DB_NAME = os.getenv("POSTGRES_DB", "linguaquiz_db")
DB_USER = os.getenv("POSTGRES_USER", "linguaquiz_user")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "password")
DB_POOL_MIN_SIZE = int(os.getenv("DB_POOL_MIN_SIZE", "10"))
DB_POOL_MAX_SIZE = int(os.getenv("DB_POOL_MAX_SIZE", "30"))

# TTS Database configuration (shared across environments)
TTS_DB_HOST = os.getenv("TTS_DB_HOST", DB_HOST)
TTS_DB_PORT = int(os.getenv("TTS_DB_PORT", DB_PORT))
TTS_DB_NAME = os.getenv("TTS_DB_NAME", DB_NAME)
TTS_DB_USER = os.getenv("TTS_DB_USER", DB_USER)
TTS_DB_PASSWORD = os.getenv("TTS_DB_PASSWORD", DB_PASSWORD)
TTS_DB_POOL_MIN_SIZE = int(os.getenv("TTS_DB_POOL_MIN_SIZE", "2"))
TTS_DB_POOL_MAX_SIZE = int(os.getenv("TTS_DB_POOL_MAX_SIZE", "10"))

# Words Database configuration (shared across environments)
WORDS_DB_HOST = os.getenv("WORDS_DB_HOST", DB_HOST)
WORDS_DB_PORT = int(os.getenv("WORDS_DB_PORT", DB_PORT))
WORDS_DB_NAME = os.getenv("WORDS_DB_NAME", "linguaquiz_words")
WORDS_DB_USER = os.getenv("WORDS_DB_USER", DB_USER)
WORDS_DB_PASSWORD = os.getenv("WORDS_DB_PASSWORD", DB_PASSWORD)
WORDS_DB_POOL_MIN_SIZE = int(os.getenv("WORDS_DB_POOL_MIN_SIZE", "5"))
WORDS_DB_POOL_MAX_SIZE = int(os.getenv("WORDS_DB_POOL_MAX_SIZE", "20"))

# JWT configuration


def _load_jwt_secret() -> str:
    secret_file = Path(os.getenv("JWT_SECRET_FILE", "/run/secrets/jwt-secret"))
    if secret_file.exists():
        try:
            secret = secret_file.read_text(encoding="utf-8").strip()
            if secret:
                # nosemgrep: python.lang.security.audit.logging.logger-credential-leak.python-logger-credential-disclosure
                logger.info("Loaded JWT_SECRET from file: %s", secret_file)  # Only logs file path, not secret
                return secret
        except Exception as e:
            # nosemgrep: python.lang.security.audit.logging.logger-credential-leak.python-logger-credential-disclosure
            logger.error("Failed to read JWT_SECRET from file %s: %s", secret_file, e)  # Only logs file path, not secret

    secret = os.getenv("JWT_SECRET")  # type: ignore[assignment]
    if secret:
        # nosemgrep: python.lang.security.audit.logging.logger-credential-leak.python-logger-credential-disclosure
        logger.warning(  # Only logs file path, not secret
            "Using JWT_SECRET from environment variable. For production, use Kubernetes Secrets mounted at %s",
            secret_file,
        )
        return secret

    raise RuntimeError(f"JWT_SECRET not found. Provide via file ({secret_file}) or JWT_SECRET env var")


JWT_SECRET = _load_jwt_secret()
JWT_ACCESS_TOKEN_EXPIRES_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", "15"))
JWT_REFRESH_TOKEN_EXPIRES_DAYS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES_DAYS", "7"))
JWT_EXPIRES_IN = f"{JWT_ACCESS_TOKEN_EXPIRES_MINUTES}m"

# Server configuration
PORT = int(os.getenv("PORT", 9000))

# CORS configuration
CORS_ALLOWED_ORIGINS = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:8080,http://localhost:5173,https://lingua-quiz.nikolay-eremeev.com,https://test-lingua-quiz.nikolay-eremeev.com",
).split(",")

if "*" in CORS_ALLOWED_ORIGINS:
    logger.warning("CORS is open to all origins (*) - this is insecure for production!")

# Rate limiting configuration
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
if not RATE_LIMIT_ENABLED:
    logger.warning("Rate limiting is DISABLED - this is insecure for production!")

# Application version (injected at Docker build time)
APP_VERSION = os.getenv("APP_VERSION", "dev")
APP_ENVIRONMENT = os.getenv("APP_ENVIRONMENT", "development")

# Logging configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
if LOG_LEVEL not in ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"):
    LOG_LEVEL = "INFO"

LOG_JSON_FORMAT = os.getenv("LOG_JSON_FORMAT", "false").lower() in ("true", "1", "yes")
if APP_ENVIRONMENT in ("production", "staging"):
    LOG_JSON_FORMAT = True

# Slow query threshold (milliseconds)
SLOW_QUERY_THRESHOLD_MS = int(os.getenv("SLOW_QUERY_THRESHOLD_MS", "100"))
