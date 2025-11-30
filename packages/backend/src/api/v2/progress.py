import logging

from core.database import execute_write_transaction, query_db
from core.security import get_current_user
from fastapi import APIRouter, Depends, HTTPException, Request, status
from schemas.progress import BulkProgressUpdateRequest, ProgressUpdateRequest, UserProgressResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from utils import convert_keys_to_camel_case

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/user", tags=["Progress"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/progress", response_model=list[UserProgressResponse])
@limiter.limit("100/minute")
async def get_user_progress(
    request: Request,
    list_name: str | None = None,
    current_user: dict = Depends(get_current_user),
) -> list[UserProgressResponse]:
    try:
        if list_name:
            active_version_id = query_db("SELECT get_active_version_id()", one=True)
            if not active_version_id:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="No active content version found",
                )

            version_id = active_version_id["get_active_version_id"]

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

        result = []
        for p in progress:
            item_dict = dict(p)
            item_dict["vocabulary_item_id"] = str(item_dict["vocabulary_item_id"])
            if item_dict.get("last_practiced"):
                item_dict["last_practiced"] = item_dict["last_practiced"].isoformat()
            result.append(convert_keys_to_camel_case(item_dict))

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user progress: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch progress",
        )


@router.post("/progress")
@limiter.limit("200/minute")
async def save_user_progress(
    request: Request,
    progress_data: ProgressUpdateRequest,
    current_user: dict = Depends(get_current_user),
) -> dict[str, str]:
    try:
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating progress: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update progress",
        )


@router.post("/progress/bulk")
@limiter.limit("100/minute")
async def save_bulk_progress(
    request: Request,
    bulk_data: BulkProgressUpdateRequest,
    current_user: dict = Depends(get_current_user),
) -> dict[str, str]:
    try:
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error bulk updating progress: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to bulk update progress",
        )
