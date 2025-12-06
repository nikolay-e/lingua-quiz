import logging

from core.database import query_db
from core.error_handler import handle_api_errors
from core.security import get_current_user
from fastapi import APIRouter, Depends, HTTPException, Request, status
from generated.schemas import VocabularyItemResponse, WordListResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Vocabulary"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/word-lists", response_model=list[WordListResponse])
@limiter.limit("100/minute")
@handle_api_errors("Get word lists")
def get_word_lists(request: Request, current_user: dict = Depends(get_current_user)) -> list[WordListResponse]:
    logger.debug(f"Fetching word lists for user: {current_user['username']}")
    active_version_id = query_db("SELECT get_active_version_id()", one=True)
    if not active_version_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No active content version found",
        )

    version_id = active_version_id["get_active_version_id"]

    lists = query_db(
        """SELECT list_name, COUNT(*) as word_count
           FROM vocabulary_items
           WHERE version_id = %s AND is_active = TRUE
           GROUP BY list_name
           ORDER BY list_name""",
        (version_id,),
    )
    return [WordListResponse.model_validate(dict(item)) for item in lists]


@router.get("/translations", response_model=list[VocabularyItemResponse])
@limiter.limit("100/minute")
@handle_api_errors("Get translations")
def get_translations(request: Request, list_name: str, current_user: dict = Depends(get_current_user)) -> list[VocabularyItemResponse]:
    active_version_id = query_db("SELECT get_active_version_id()", one=True)
    if not active_version_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No active content version found",
        )

    version_id = active_version_id["get_active_version_id"]

    translations = query_db(
        """SELECT id, source_text, source_language, target_text, target_language,
                  list_name, source_usage_example, target_usage_example
           FROM vocabulary_items
           WHERE list_name = %s AND version_id = %s AND is_active = TRUE
           ORDER BY source_text""",
        (list_name, version_id),
    )

    return [VocabularyItemResponse.model_validate({**dict(t), "id": str(t["id"])}) for t in translations]
