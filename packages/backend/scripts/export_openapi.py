#!/usr/bin/env python3
"""Generate unified OpenAPI specification as single source of truth."""

from __future__ import annotations

import json
import os
from pathlib import Path
import sys


def main() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    backend_root = repo_root / "packages" / "backend"
    src_path = backend_root / "src"

    os.environ.setdefault("JWT_SECRET", "openapi-placeholder-secret")
    os.environ.setdefault("SKIP_DB_INIT", "1")

    sys.path.insert(0, str(src_path))

    try:
        from main import app
    except Exception as exc:
        raise RuntimeError(f"Failed to import FastAPI app for OpenAPI generation: {exc}") from exc

    spec = app.openapi()

    output_path = repo_root / "lingua-quiz-schema.json"
    output_path.write_text(json.dumps(spec, indent=2) + "\n")
    print(f"✅ Unified OpenAPI schema (single source of truth): {output_path.relative_to(repo_root)}")


if __name__ == "__main__":
    main()
