from core.database import get_active_version, query_words_db, serialize_rows
from core.error_handler import handle_api_errors
from core.logging import get_logger
from core.security import require_admin
from fastapi import APIRouter, Depends, HTTPException, Query, status
from generated.schemas import VocabularyItemDetailResponse

VOCABULARY_READONLY_MESSAGE = "Vocabulary is managed via repository files. Edit data/vocabularies/*.json and redeploy."

logger = get_logger(__name__)
router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/vocabulary/search", response_model=list[VocabularyItemDetailResponse])
@handle_api_errors("Search vocabulary")
def search_vocabulary(
    query: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(50, ge=1, le=500),
    current_admin: dict = Depends(require_admin),
    version_id: int = Depends(get_active_version),
) -> list[VocabularyItemDetailResponse]:
    logger.info(
        "Admin vocabulary search",
        extra={"admin": current_admin["username"], "query": query, "limit": limit},
    )
    results = query_words_db(
        """SELECT id, source_text, source_language, target_text, target_language,
                  list_name, difficulty_level, source_usage_example, target_usage_example,
                  is_active,
                  TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
                  TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at,
                  ts_rank(
                    to_tsvector('simple', source_text || ' ' || target_text),
                    plainto_tsquery('simple', %s)
                  ) AS rank
           FROM vocabulary_items
           WHERE version_id = %s
             AND (
               to_tsvector('simple', source_text) @@ plainto_tsquery('simple', %s)
               OR to_tsvector('simple', target_text) @@ plainto_tsquery('simple', %s)
               OR similarity(source_text, %s) > 0.3
               OR similarity(target_text, %s) > 0.3
             )
           ORDER BY is_active DESC, rank DESC, source_text
           LIMIT %s""",
        (query, version_id, query, query, query, query, limit),
    )

    return serialize_rows(results, VocabularyItemDetailResponse) or []


@router.get("/vocabulary/{item_id}", response_model=VocabularyItemDetailResponse)
@handle_api_errors("Get vocabulary item")
def get_vocabulary_item(
    item_id: str,
    current_admin: dict = Depends(require_admin),
) -> VocabularyItemDetailResponse:
    item = query_words_db(
        """SELECT id, source_text, source_language, target_text, target_language,
                  list_name, difficulty_level, source_usage_example, target_usage_example,
                  is_active,
                  TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
                  TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
           FROM vocabulary_items
           WHERE id = %s""",
        (item_id,),
        one=True,
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vocabulary item not found",
        )

    return serialize_rows(item, VocabularyItemDetailResponse, one=True)


@router.post("/vocabulary", status_code=status.HTTP_405_METHOD_NOT_ALLOWED)
def create_vocabulary_item() -> dict[str, str]:
    raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail=VOCABULARY_READONLY_MESSAGE)


@router.put("/vocabulary/{item_id}", status_code=status.HTTP_405_METHOD_NOT_ALLOWED)
def update_vocabulary_item(item_id: str) -> dict[str, str]:
    raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail=VOCABULARY_READONLY_MESSAGE)


@router.delete("/vocabulary/{item_id}", status_code=status.HTTP_405_METHOD_NOT_ALLOWED)
def delete_vocabulary_item(item_id: str) -> dict[str, str]:
    raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail=VOCABULARY_READONLY_MESSAGE)


@router.get("/vocabulary", response_model=list[VocabularyItemDetailResponse])
@handle_api_errors("List vocabulary")
def list_vocabulary(
    list_name: str | None = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_admin: dict = Depends(require_admin),
    version_id: int = Depends(get_active_version),
) -> list[VocabularyItemDetailResponse]:
    if list_name:
        results = query_words_db(
            """SELECT id, source_text, source_language, target_text, target_language,
                      list_name, difficulty_level, source_usage_example, target_usage_example,
                      is_active,
                      TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
                      TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
               FROM vocabulary_items
               WHERE version_id = %s AND list_name = %s
               ORDER BY source_text
               LIMIT %s OFFSET %s""",
            (version_id, list_name, limit, offset),
        )
    else:
        results = query_words_db(
            """SELECT id, source_text, source_language, target_text, target_language,
                      list_name, difficulty_level, source_usage_example, target_usage_example,
                      is_active,
                      TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
                      TO_CHAR(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
               FROM vocabulary_items
               WHERE version_id = %s
               ORDER BY list_name, source_text
               LIMIT %s OFFSET %s""",
            (version_id, limit, offset),
        )

    return serialize_rows(results, VocabularyItemDetailResponse) or []
