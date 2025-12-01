from collections.abc import Callable
from functools import wraps
import logging
from typing import Any, TypeVar

from fastapi import HTTPException

T = TypeVar("T")

logger = logging.getLogger(__name__)


def handle_api_errors(
    operation_name: str,
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator to handle common API errors consistently across all endpoints.

    Args:
        operation_name: Human-readable name of the operation for logging

    Returns:
        Decorated function with error handling

    Example:
        @router.post("/login")
        @handle_api_errors("Login")
        async def login_user(...) -> TokenResponse:
            # Business logic only, no try/except needed
            ...
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> T:
            try:
                return await func(*args, **kwargs)  # type: ignore[misc,no-any-return]
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"{operation_name} error: {e}", exc_info=True)
                raise HTTPException(
                    status_code=500,
                    detail=f"{operation_name} failed",
                )

        @wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> T:
            try:
                return func(*args, **kwargs)
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"{operation_name} error: {e}", exc_info=True)
                raise HTTPException(
                    status_code=500,
                    detail=f"{operation_name} failed",
                )

        import inspect

        if inspect.iscoroutinefunction(func):
            return async_wrapper  # type: ignore
        return sync_wrapper  # type: ignore

    return decorator
