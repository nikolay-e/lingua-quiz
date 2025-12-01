import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

# Database configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", 5432))
DB_NAME = os.getenv("POSTGRES_DB", "linguaquiz_db")
DB_USER = os.getenv("POSTGRES_USER", "linguaquiz_user")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "password")
DB_POOL_MIN_SIZE = int(os.getenv("DB_POOL_MIN_SIZE", "10"))
DB_POOL_MAX_SIZE = int(os.getenv("DB_POOL_MAX_SIZE", "30"))

# JWT configuration


def _load_jwt_secret() -> str:
    secret_file = Path(os.getenv("JWT_SECRET_FILE", "/run/secrets/jwt-secret"))
    if secret_file.exists():
        try:
            secret = secret_file.read_text(encoding="utf-8").strip()
            if secret:
                logger.info("Loaded JWT_SECRET from file: %s", secret_file)
                return secret
        except Exception as e:
            logger.error("Failed to read JWT_SECRET from file %s: %s", secret_file, e)

    secret = os.getenv("JWT_SECRET")  # type: ignore[assignment]
    if secret:
        logger.warning(
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
