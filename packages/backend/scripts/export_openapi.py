#!/usr/bin/env python3
"""Generate OpenAPI specification from the FastAPI app without hitting external services."""

from __future__ import annotations

import json
import os
from pathlib import Path
import sys


def main() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    backend_root = repo_root / "packages" / "backend"
    src_path = backend_root / "src"

    # Ensure required env vars are set so imports succeed without external services.
    os.environ.setdefault("JWT_SECRET", "openapi-placeholder-secret")
    os.environ.setdefault("SKIP_DB_INIT", "1")

    sys.path.insert(0, str(src_path))

    try:
        from main import app
    except Exception as exc:  # pragma: no cover - defensive logging for generation script
        raise RuntimeError(f"Failed to import FastAPI app for OpenAPI generation: {exc}") from exc

    spec = app.openapi()

    output_path = backend_root / "openapi.json"
    output_path.write_text(json.dumps(spec, indent=2) + "\n")
    print(f"✅ OpenAPI spec written to {output_path}")


if __name__ == "__main__":
    main()
