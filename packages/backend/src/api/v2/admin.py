import json
import logging

from core.database import execute_write_transaction, query_db
from core.security import require_admin
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from utils import convert_keys_to_camel_case

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["Admin"])


class VocabularyItemCreate(BaseModel):
    source_text: str = Field(alias="sourceText")
    source_language: str = Field(alias="sourceLanguage")
    target_text: str = Field(alias="targetText")
    target_language: str = Field(alias="targetLanguage")
    list_name: str = Field(alias="listName")
    difficulty_level: str | None = Field(alias="difficultyLevel", default=None)
    source_usage_example: str | None = Field(alias="sourceUsageExample", default=None)
    target_usage_example: str | None = Field(alias="targetUsageExample", default=None)

    class Config:
        populate_by_name = True


class VocabularyItemUpdate(BaseModel):
    source_text: str | None = Field(alias="sourceText", default=None)
    target_text: str | None = Field(alias="targetText", default=None)
    source_usage_example: str | None = Field(alias="sourceUsageExample", default=None)
    target_usage_example: str | None = Field(alias="targetUsageExample", default=None)
    is_active: bool | None = Field(alias="isActive", default=None)
    list_name: str | None = Field(alias="listName", default=None)
    difficulty_level: str | None = Field(alias="difficultyLevel", default=None)

    class Config:
        populate_by_name = True


class VocabularyItemDetailResponse(BaseModel):
    id: str
    source_text: str = Field(alias="sourceText")
    source_language: str = Field(alias="sourceLanguage")
    target_text: str = Field(alias="targetText")
    target_language: str = Field(alias="targetLanguage")
    list_name: str = Field(alias="listName")
    difficulty_level: str | None = Field(alias="difficultyLevel")
    source_usage_example: str | None = Field(alias="sourceUsageExample")
    target_usage_example: str | None = Field(alias="targetUsageExample")
    is_active: bool = Field(alias="isActive")
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")

    class Config:
        populate_by_name = True


@router.get("/vocabulary/search", response_model=list[VocabularyItemDetailResponse])
async def search_vocabulary(
    query: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(50, ge=1, le=500),
    current_admin: dict = Depends(require_admin),
):
    try:
        active_version_id = query_db("SELECT get_active_version_id()", one=True)
        if not active_version_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No active content version found",
            )

        version_id = active_version_id["get_active_version_id"]

        results = query_db(
            """SELECT id, source_text, source_language, target_text, target_language,
                      list_name, difficulty_level, source_usage_example, target_usage_example,
                      is_active, created_at, updated_at,
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

        output = []
        for item in results:
            item_dict = dict(item)
            item_dict["id"] = str(item_dict["id"])
            item_dict["created_at"] = item_dict["created_at"].isoformat()
            item_dict["updated_at"] = item_dict["updated_at"].isoformat()
            output.append(convert_keys_to_camel_case(item_dict))

        return output

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching vocabulary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search failed",
        )


@router.get("/vocabulary/{item_id}", response_model=VocabularyItemDetailResponse)
async def get_vocabulary_item(
    item_id: str,
    current_admin: dict = Depends(require_admin),
):
    try:
        item = query_db(
            """SELECT id, source_text, source_language, target_text, target_language,
                      list_name, difficulty_level, source_usage_example, target_usage_example,
                      is_active, created_at, updated_at
               FROM vocabulary_items
               WHERE id = %s""",
            (item_id,),
            one=True,
        )

        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vocabulary item not found")

        item_dict = dict(item)
        item_dict["id"] = str(item_dict["id"])
        item_dict["created_at"] = item_dict["created_at"].isoformat()
        item_dict["updated_at"] = item_dict["updated_at"].isoformat()

        return convert_keys_to_camel_case(item_dict)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching vocabulary item: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch vocabulary item",
        )


@router.post("/vocabulary", status_code=status.HTTP_201_CREATED)
async def create_vocabulary_item(
    item_data: VocabularyItemCreate,
    current_admin: dict = Depends(require_admin),
):
    try:
        active_version_id = query_db("SELECT get_active_version_id()", one=True)
        if not active_version_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No active content version found",
            )

        version_id = active_version_id["get_active_version_id"]

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

        return {"message": "Vocabulary item created", "id": str(result["id"])}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating vocabulary item: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create vocabulary item",
        )


def _collect_field_updates(
    item_data: VocabularyItemUpdate,
    existing_item: dict,
) -> tuple[list[str], list[str | bool], dict[str, str | bool | None], dict[str, str | bool | None]]:
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
async def update_vocabulary_item(
    item_id: str,
    item_data: VocabularyItemUpdate,
    current_admin: dict = Depends(require_admin),
):
    try:
        existing_item = query_db(
            "SELECT id, source_text, target_text, source_usage_example, target_usage_example, is_active, list_name, difficulty_level, version_id FROM vocabulary_items WHERE id = %s",
            (item_id,),
            one=True,
        )

        if not existing_item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vocabulary item not found")

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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating vocabulary item: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update vocabulary item",
        )


@router.delete("/vocabulary/{item_id}")
async def delete_vocabulary_item(
    item_id: str,
    current_admin: dict = Depends(require_admin),
):
    try:
        existing_item = query_db(
            "SELECT id, source_text, target_text, version_id FROM vocabulary_items WHERE id = %s",
            (item_id,),
            one=True,
        )

        if not existing_item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vocabulary item not found")

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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting vocabulary item: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete vocabulary item",
        )


@router.get("/vocabulary", response_model=list[VocabularyItemDetailResponse])
async def list_vocabulary(
    list_name: str | None = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_admin: dict = Depends(require_admin),
):
    try:
        active_version_id = query_db("SELECT get_active_version_id()", one=True)
        if not active_version_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No active content version found",
            )

        version_id = active_version_id["get_active_version_id"]

        if list_name:
            results = query_db(
                """SELECT id, source_text, source_language, target_text, target_language,
                          list_name, difficulty_level, source_usage_example, target_usage_example,
                          is_active, created_at, updated_at
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
                          is_active, created_at, updated_at
                   FROM vocabulary_items
                   WHERE version_id = %s
                   ORDER BY list_name, source_text
                   LIMIT %s OFFSET %s""",
                (version_id, limit, offset),
            )

        output = []
        for item in results:
            item_dict = dict(item)
            item_dict["id"] = str(item_dict["id"])
            item_dict["created_at"] = item_dict["created_at"].isoformat()
            item_dict["updated_at"] = item_dict["updated_at"].isoformat()
            output.append(convert_keys_to_camel_case(item_dict))

        return output

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing vocabulary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list vocabulary",
        )
