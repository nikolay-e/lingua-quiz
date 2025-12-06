import logging

from core.database import execute_write_transaction, get_active_version, query_db, serialize_rows
from core.error_handler import handle_api_errors
from core.security import get_current_user
from fastapi import APIRouter, Depends, Request
from generated.schemas import BulkProgressUpdateRequest, ProgressUpdateRequest, UserProgressResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/user", tags=["Progress"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/progress", response_model=list[UserProgressResponse])
@limiter.limit("100/minute")
@handle_api_errors("Get user progress")
def get_user_progress(
    request: Request,
    list_name: str | None = None,
    current_user: dict = Depends(get_current_user),
) -> list[UserProgressResponse]:
    if list_name:
        version_id = get_active_version()
        progress = query_db(
            """SELECT up.vocabulary_item_id, up.level, up.queue_position,
                      up.correct_count, up.incorrect_count, up.consecutive_correct,
                      up.last_practiced_at as last_practiced,
                      vi.source_text, vi.source_language, vi.target_language
               FROM user_progress up
               JOIN vocabulary_items vi ON up.vocabulary_item_id = vi.id
               WHERE up.user_id = %s AND vi.list_name = %s AND vi.version_id = %s AND vi.is_active = TRUE
               ORDER BY up.last_practiced_at DESC""",
            (current_user["user_id"], list_name, version_id),
        )
    else:
        progress = query_db(
            """SELECT up.vocabulary_item_id, up.level, up.queue_position,
                      up.correct_count, up.incorrect_count, up.consecutive_correct,
                      up.last_practiced_at as last_practiced,
                      vi.source_text, vi.source_language, vi.target_language
               FROM user_progress up
               JOIN vocabulary_items vi ON up.vocabulary_item_id = vi.id
               WHERE up.user_id = %s
               ORDER BY up.last_practiced_at DESC""",
            (current_user["user_id"],),
        )

    return serialize_rows(progress, UserProgressResponse) or []


@router.post("/progress")
@limiter.limit("200/minute")
@handle_api_errors("Save user progress")
def save_user_progress(
    request: Request,
    progress_data: ProgressUpdateRequest,
    current_user: dict = Depends(get_current_user),
) -> dict[str, str]:
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
