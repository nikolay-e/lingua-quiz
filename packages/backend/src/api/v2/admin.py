import json
import logging
from typing import TYPE_CHECKING

from core.database import execute_write_transaction, get_active_version, query_db, serialize_rows
from core.error_handler import handle_api_errors
from core.security import require_admin
from fastapi import APIRouter, Depends, HTTPException, Query, status

if TYPE_CHECKING:
    from generated.schemas import VocabularyItemCreate, VocabularyItemDetailResponse, VocabularyItemUpdate
else:
    try:
        from generated.schemas import VocabularyItemCreate, VocabularyItemDetailResponse, VocabularyItemUpdate
    except ImportError:
        import os

        if os.getenv("FAIL_ON_MISSING_GENERATED", "false").lower() == "true":
            raise

        from pydantic import BaseModel

        logging.warning(
            "generated.schemas not found in admin.py. "
            "Run 'make generate-all' to generate Pydantic models from OpenAPI schema. "
            "Using placeholder models with no validation."
        )

        class _PlaceholderModel(BaseModel):
            class Config:
                extra = "allow"

        VocabularyItemCreate = VocabularyItemDetailResponse = VocabularyItemUpdate = _PlaceholderModel  # type: ignore

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/vocabulary/search", response_model=list[VocabularyItemDetailResponse])
@handle_api_errors("Search vocabulary")
def search_vocabulary(
    query: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(50, ge=1, le=500),
    current_admin: dict = Depends(require_admin),
    version_id: int = Depends(get_active_version),
) -> list[VocabularyItemDetailResponse]:
    results = query_db(
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
    item = query_db(
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


@router.post("/vocabulary", status_code=status.HTTP_201_CREATED)
@handle_api_errors("Create vocabulary item")
def create_vocabulary_item(
    item_data: VocabularyItemCreate,
    current_admin: dict = Depends(require_admin),
    version_id: int = Depends(get_active_version),
) -> dict[str, str]:
    result = execute_write_transaction(
        """INSERT INTO vocabulary_items
           (version_id, source_text, source_language, target_text, target_language,
            list_name, difficulty_level, source_usage_example, target_usage_example)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
           RETURNING id""",
        (
            version_id,
            item_data.source_text,
            item_data.source_language,
            item_data.target_text,
            item_data.target_language,
            item_data.list_name,
            item_data.difficulty_level,
            item_data.source_usage_example,
            item_data.target_usage_example,
        ),
        fetch_results=True,
        one=True,
    )

    execute_write_transaction(
        """INSERT INTO content_changelog
           (version_id, change_type, vocabulary_item_id, new_values, changed_by)
           VALUES (%s, 'ADD', %s, %s::jsonb, %s)""",
        (
            version_id,
            result["id"],
            json.dumps(
                {
                    "source_text": item_data.source_text,
                    "target_text": item_data.target_text,
                }
            ),
            current_admin["username"],
        ),
    )

    return {"message": "Vocabulary item created", "id": result["id"]}


def _collect_field_updates(
    item_data: VocabularyItemUpdate,
    existing_item: dict,
) -> tuple[
    list[str],
    list[str | bool],
    dict[str, str | bool | None],
    dict[str, str | bool | None],
]:
    update_fields: list[str] = []
    update_values: list[str | bool] = []
    old_values: dict[str, str | bool | None] = {}
    new_values: dict[str, str | bool | None] = {}

    field_mappings = [
        ("source_text", item_data.source_text, False),
        ("target_text", item_data.target_text, False),
        ("source_usage_example", item_data.source_usage_example, False),
        ("target_usage_example", item_data.target_usage_example, False),
        ("is_active", item_data.is_active, True),
        ("list_name", item_data.list_name, False),
        ("difficulty_level", item_data.difficulty_level, False),
    ]

    for field_name, new_value, stringify in field_mappings:
        if new_value is not None:
            update_fields.append(f"{field_name} = %s")
            update_values.append(new_value)
            old_val = existing_item[field_name]
            old_values[field_name] = str(old_val) if stringify else old_val
            new_values[field_name] = str(new_value) if stringify else new_value

    return update_fields, update_values, old_values, new_values


@router.put("/vocabulary/{item_id}")
@handle_api_errors("Update vocabulary item")
def update_vocabulary_item(
    item_id: str,
    item_data: VocabularyItemUpdate,
    current_admin: dict = Depends(require_admin),
) -> dict[str, str]:
    existing_item = query_db(
        "SELECT id, source_text, target_text, source_usage_example, target_usage_example, is_active, list_name, difficulty_level, version_id FROM vocabulary_items WHERE id = %s",
        (item_id,),
        one=True,
    )

    if not existing_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vocabulary item not found",
        )

    update_fields, update_values, old_values, new_values = _collect_field_updates(item_data, existing_item)

    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    update_values.append(item_id)
    # Safe: update_fields contains only predefined strings, values are parameterized
    execute_write_transaction(
        f"UPDATE vocabulary_items SET {', '.join(update_fields)} WHERE id = %s",  # nosec B608
        tuple(update_values),
    )

    execute_write_transaction(
        """INSERT INTO content_changelog
           (version_id, change_type, vocabulary_item_id, old_values, new_values, changed_by)
           VALUES (%s, 'UPDATE', %s, %s::jsonb, %s::jsonb, %s)""",
        (
            existing_item["version_id"],
            item_id,
            json.dumps(old_values),
            json.dumps(new_values),
            current_admin["username"],
        ),
    )

    return {"message": "Vocabulary item updated"}


@router.delete("/vocabulary/{item_id}")
@handle_api_errors("Delete vocabulary item")
def delete_vocabulary_item(
    item_id: str,
    current_admin: dict = Depends(require_admin),
) -> dict[str, str]:
    existing_item = query_db(
        "SELECT id, source_text, target_text, version_id FROM vocabulary_items WHERE id = %s",
        (item_id,),
        one=True,
    )

    if not existing_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vocabulary item not found",
        )

    execute_write_transaction(
        "UPDATE vocabulary_items SET is_active = FALSE WHERE id = %s",
        (item_id,),
    )

    execute_write_transaction(
        """INSERT INTO content_changelog
           (version_id, change_type, vocabulary_item_id, old_values, changed_by)
           VALUES (%s, 'DELETE', %s, %s::jsonb, %s)""",
        (
            existing_item["version_id"],
            item_id,
            json.dumps(
                {
                    "source_text": existing_item["source_text"],
                    "target_text": existing_item["target_text"],
                }
            ),
            current_admin["username"],
        ),
    )

    return {"message": "Vocabulary item deleted"}


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
        results = query_db(
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
        results = query_db(
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
