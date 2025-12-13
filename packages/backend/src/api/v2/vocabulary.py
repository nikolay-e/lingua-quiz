import logging
from typing import TYPE_CHECKING

from core.config import RATE_LIMIT_ENABLED
from core.database import get_active_version, query_words_db, serialize_rows
from core.error_handler import handle_api_errors
from core.security import get_current_user
from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

if TYPE_CHECKING:
    from generated.schemas import VocabularyItemResponse, WordListResponse
else:
    try:
        from generated.schemas import VocabularyItemResponse, WordListResponse
    except ImportError:
        import os

        if os.getenv("FAIL_ON_MISSING_GENERATED", "false").lower() == "true":
            raise

        from pydantic import BaseModel

        logging.warning(
            "generated.schemas not found in vocabulary.py. "
            "Run 'make generate-all' to generate Pydantic models from OpenAPI schema. "
            "Using placeholder models with no validation."
        )

        class _PlaceholderModel(BaseModel):
            class Config:
                extra = "allow"

        VocabularyItemResponse = WordListResponse = _PlaceholderModel  # type: ignore

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Vocabulary"])
limiter = Limiter(key_func=get_remote_address, enabled=RATE_LIMIT_ENABLED)


@router.get("/word-lists", response_model=list[WordListResponse])
@limiter.limit("100/minute")
@handle_api_errors("Get word lists")
def get_word_lists(
    request: Request,
    current_user: dict = Depends(get_current_user),
    version_id: int = Depends(get_active_version),
) -> list[WordListResponse]:
    logger.debug(f"Fetching word lists for user: {current_user['username']}")
    lists = query_words_db(
        """SELECT list_name, COUNT(*) as word_count
           FROM vocabulary_items
           WHERE version_id = %s AND is_active = TRUE
           GROUP BY list_name
           ORDER BY list_name""",
        (version_id,),
    )
    return serialize_rows(lists, WordListResponse) or []


@router.get("/translations", response_model=list[VocabularyItemResponse])
@limiter.limit("100/minute")
@handle_api_errors("Get translations")
def get_translations(
    request: Request,
    list_name: str,
    current_user: dict = Depends(get_current_user),
    version_id: int = Depends(get_active_version),
) -> list[VocabularyItemResponse]:
    translations = query_words_db(
        """SELECT id, source_text, source_language, target_text, target_language,
                  list_name, source_usage_example, target_usage_example
           FROM vocabulary_items
           WHERE list_name = %s AND version_id = %s AND is_active = TRUE
           ORDER BY source_text""",
        (list_name, version_id),
    )

    return serialize_rows(translations, VocabularyItemResponse) or []
