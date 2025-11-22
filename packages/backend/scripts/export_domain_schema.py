#!/usr/bin/env python3
"""Export domain-level JSON Schemas from Pydantic models."""

from __future__ import annotations

import json
import os
from pathlib import Path
import sys
import warnings

from pydantic import BaseModel


def dump_schema(model: type[BaseModel], name: str, output_dir: Path) -> None:
    schema = model.model_json_schema()
    output_path = output_dir / f"{name}.schema.json"
    output_path.write_text(json.dumps(schema, indent=2) + "\n")
    print(f"✅ Wrote {output_path.relative_to(output_dir.parent.parent)}")


def main() -> None:
    warnings.filterwarnings("ignore", message="The `schema` method is deprecated*", category=DeprecationWarning)
    repo_root = Path(__file__).resolve().parents[3]
    backend_root = repo_root / "packages" / "backend"
    src_path = backend_root / "src"
    output_dir_env = os.environ.get("SCHEMA_OUTPUT_DIR")
    output_dir = Path(output_dir_env) if output_dir_env else repo_root / "packages" / "domain" / "schemas"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Keep imports side-effect free (no DB)
    os.environ.setdefault("JWT_SECRET", "domain-schema-placeholder")
    os.environ.setdefault("SKIP_DB_INIT", "1")

    sys.path.insert(0, str(src_path))

    from schemas.progress import ProgressUpdateRequest, UserProgressResponse  # type: ignore
    from schemas.tts import TTSLanguagesResponse, TTSRequest, TTSResponse  # type: ignore
    from schemas.user import UserResponse  # type: ignore
    from schemas.version import ContentVersionResponse  # type: ignore
    from schemas.vocabulary import VocabularyItemResponse, WordListResponse  # type: ignore

    models: dict[str, type[BaseModel]] = {
        "vocabulary_item": VocabularyItemResponse,
        "word_list": WordListResponse,
        "user_progress": UserProgressResponse,
        "progress_update": ProgressUpdateRequest,
        "user": UserResponse,
        "content_version": ContentVersionResponse,
        "tts_response": TTSResponse,
        "tts_languages": TTSLanguagesResponse,
        "tts_request": TTSRequest,
    }

    for name, model in models.items():
        dump_schema(model, name, output_dir)


if __name__ == "__main__":
    main()
