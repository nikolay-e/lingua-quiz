import logging
from typing import TYPE_CHECKING

from core.config import RATE_LIMIT_ENABLED
from core.database import execute_write_transaction, get_active_version, query_db, query_words_db, serialize_rows
from core.error_handler import handle_api_errors
from core.logging import get_logger
from core.security import get_current_user
from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

if TYPE_CHECKING:
    from generated.schemas import BulkProgressUpdateRequest, ProgressUpdateRequest, UserProgressResponse
else:
    try:
        from generated.schemas import BulkProgressUpdateRequest, ProgressUpdateRequest, UserProgressResponse
    except ImportError:
        import os

        if os.getenv("FAIL_ON_MISSING_GENERATED", "false").lower() == "true":
            raise

        from pydantic import BaseModel

        logging.warning(
            "generated.schemas not found in progress.py. "
            "Run 'make generate-all' to generate Pydantic models from OpenAPI schema. "
            "Using placeholder models with no validation."
        )

        class _PlaceholderModel(BaseModel):
            class Config:
                extra = "allow"

        BulkProgressUpdateRequest = ProgressUpdateRequest = UserProgressResponse = _PlaceholderModel  # type: ignore

logger = get_logger(__name__)
router = APIRouter(prefix="/api/user", tags=["Progress"])
limiter = Limiter(key_func=get_remote_address, enabled=RATE_LIMIT_ENABLED)


@router.get("/progress", response_model=list[UserProgressResponse])
@limiter.limit("100/minute")
@handle_api_errors("Get user progress")
def get_user_progress(
    request: Request,
    list_name: str | None = None,
    current_user: dict = Depends(get_current_user),
) -> list[UserProgressResponse]:
    logger.debug(
        "Fetching user progress",
        extra={"user_id": current_user["user_id"], "list_name": list_name},
    )
    progress_data = query_db(
        """SELECT vocabulary_item_id, level, queue_position,
                  correct_count, incorrect_count, consecutive_correct,
                  TO_CHAR(last_practiced_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as last_practiced
           FROM user_progress
           WHERE user_id = %s
           ORDER BY last_practiced_at DESC""",
        (current_user["user_id"],),
    )

    if not progress_data:
        return []

    vocab_item_ids = [item["vocabulary_item_id"] for item in progress_data]
    placeholders = ", ".join(["%s"] * len(vocab_item_ids))

    if list_name:
        version_id = get_active_version()
        vocab_items = query_words_db(
            f"""SELECT id, source_text, source_language, target_language, list_name
               FROM vocabulary_items
               WHERE id IN ({placeholders}) AND list_name = %s AND version_id = %s AND is_active = TRUE""",  # nosec B608
            (*tuple(vocab_item_ids), list_name, version_id),
        )
    else:
        vocab_items = query_words_db(
            f"""SELECT id, source_text, source_language, target_language, list_name
               FROM vocabulary_items
               WHERE id IN ({placeholders}) AND is_active = TRUE""",  # nosec B608
            tuple(vocab_item_ids),
        )

    vocab_map = {str(item["id"]): item for item in vocab_items}

    combined_results = []
    for progress_item in progress_data:
        vocab_id = str(progress_item["vocabulary_item_id"])
        if vocab_id in vocab_map:
            vocab_item = vocab_map[vocab_id]
            combined_results.append(
                {
                    **progress_item,
                    "source_text": vocab_item["source_text"],
                    "source_language": vocab_item["source_language"],
                    "target_language": vocab_item["target_language"],
                }
            )

    return serialize_rows(combined_results, UserProgressResponse) or []


@router.post("/progress")
@limiter.limit("200/minute")
@handle_api_errors("Save user progress")
def save_user_progress(
    request: Request,
    progress_data: ProgressUpdateRequest,
    current_user: dict = Depends(get_current_user),
) -> dict[str, str]:
    logger.debug(
        "Saving single progress",
        extra={
            "user_id": current_user["user_id"],
            "vocabulary_item_id": progress_data.vocabulary_item_id,
            "level": progress_data.level,
        },
    )
    execute_write_transaction(
        """INSERT INTO user_progress
               (user_id, vocabulary_item_id, level, queue_position, correct_count, incorrect_count, last_practiced_at)
               VALUES (%s, %s, %s, %s, %s, %s, NOW())
               ON CONFLICT (user_id, vocabulary_item_id)
               DO UPDATE SET
                   level = EXCLUDED.level,
                   queue_position = EXCLUDED.queue_position,
                   correct_count = EXCLUDED.correct_count,
                   incorrect_count = EXCLUDED.incorrect_count,
                   last_practiced_at = EXCLUDED.last_practiced_at""",
        (
            current_user["user_id"],
            progress_data.vocabulary_item_id,
            progress_data.level,
            progress_data.queue_position,
            progress_data.correct_count,
            progress_data.incorrect_count,
        ),
    )

    return {"message": "Progress updated successfully"}


@router.post("/progress/bulk")
@limiter.limit("100/minute")
@handle_api_errors("Save bulk progress")
def save_bulk_progress(
    request: Request,
    bulk_data: BulkProgressUpdateRequest,
    current_user: dict = Depends(get_current_user),
) -> dict[str, str]:
    item_count = len(bulk_data.items) if bulk_data.items else 0
    logger.info(
        "Saving bulk progress",
        extra={"user_id": current_user["user_id"], "item_count": item_count},
    )
    if not bulk_data.items:
        return {"message": "No items to update"}

    values_placeholders = []
    params = []

    for item in bulk_data.items:
        values_placeholders.append("(%s, %s, %s, %s, %s, %s, NOW())")
        params.extend(
            [
                current_user["user_id"],
                item.vocabulary_item_id,
                item.level,
                item.queue_position,
                item.correct_count,
                item.incorrect_count,
            ]
        )

    query = f"""
        INSERT INTO user_progress
        (user_id, vocabulary_item_id, level, queue_position, correct_count, incorrect_count, last_practiced_at)
        VALUES {", ".join(values_placeholders)}
        ON CONFLICT (user_id, vocabulary_item_id)
        DO UPDATE SET
            level = EXCLUDED.level,
            queue_position = EXCLUDED.queue_position,
            correct_count = EXCLUDED.correct_count,
            incorrect_count = EXCLUDED.incorrect_count,
            last_practiced_at = EXCLUDED.last_practiced_at
    """  # nosec B608

    execute_write_transaction(query, tuple(params))

    return {"message": f"Successfully updated {len(bulk_data.items)} progress items"}
