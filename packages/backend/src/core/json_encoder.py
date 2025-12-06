from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi.responses import JSONResponse


def encode_json_value(obj: Any) -> Any:
    if isinstance(obj, UUID):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


class CustomJSONResponse(JSONResponse):
    def render(self, content: Any) -> bytes:
        import json

        return json.dumps(
            content,
            ensure_ascii=False,
            allow_nan=False,
            indent=None,
            separators=(",", ":"),
            default=encode_json_value,
        ).encode("utf-8")
