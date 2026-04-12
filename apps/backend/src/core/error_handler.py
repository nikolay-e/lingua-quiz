from collections.abc import Callable
from functools import wraps
from typing import Any, TypeVar

from core.logging import get_logger
from fastapi import HTTPException
import psycopg2

T = TypeVar("T")

logger = get_logger(__name__)

GENERIC_ERROR = "An error occurred"


def handle_api_errors(
    operation_name: str,
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> T:
            try:
                return await func(*args, **kwargs)  # type: ignore[misc,no-any-return]
            except HTTPException:
                raise
            except (psycopg2.DataError, psycopg2.IntegrityError, psycopg2.OperationalError, ValueError, TypeError) as e:
                logger.warning(f"{operation_name} bad input: {e}")
                raise HTTPException(status_code=400, detail=GENERIC_ERROR)
            except Exception as e:
                logger.error(f"{operation_name} error: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail=GENERIC_ERROR)

        @wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> T:
            try:
                return func(*args, **kwargs)
            except HTTPException:
                raise
            except (psycopg2.DataError, psycopg2.IntegrityError, psycopg2.OperationalError, ValueError, TypeError) as e:
                logger.warning(f"{operation_name} bad input: {e}")
                raise HTTPException(status_code=400, detail=GENERIC_ERROR)
            except Exception as e:
                logger.error(f"{operation_name} error: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail=GENERIC_ERROR)

        import inspect

        if inspect.iscoroutinefunction(func):
            return async_wrapper  # type: ignore
        return sync_wrapper  # type: ignore

    return decorator
