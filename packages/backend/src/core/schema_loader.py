import logging
import os
from typing import Any

_placeholder_model = None


def _get_placeholder_model() -> type:
    global _placeholder_model
    if _placeholder_model is None:
        from pydantic import BaseModel

        class _PlaceholderModel(BaseModel):
            class Config:
                extra = "allow"

        _placeholder_model = _PlaceholderModel
    return _placeholder_model


def load_schemas(*schema_names: str) -> tuple[Any, ...]:
    try:
        from generated import schemas

        return tuple(getattr(schemas, name) for name in schema_names)
    except (ImportError, AttributeError) as e:
        if os.getenv("FAIL_ON_MISSING_GENERATED", "false").lower() == "true":
            raise

        missing_name = e.name if isinstance(e, AttributeError) else "module"
        logging.warning(
            f"generated.schemas.{missing_name} not found. "
            "Run 'make generate-all' to generate Pydantic models from OpenAPI schema. "
            "Using placeholder models with no validation."
        )

        placeholder = _get_placeholder_model()
        return tuple(placeholder for _ in schema_names)
