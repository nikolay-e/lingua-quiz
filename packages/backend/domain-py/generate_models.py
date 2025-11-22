#!/usr/bin/env python3
"""Generate Pydantic models from JSON Schemas in packages/domain/schemas."""

from __future__ import annotations

from pathlib import Path
import sys

from datamodel_code_generator import InputFileType, generate
from datamodel_code_generator.format import PythonVersion


def main() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    schema_dir = repo_root / "packages" / "domain" / "schemas"
    output_path = Path(__file__).resolve().parent / "domain_py" / "models"

    if not schema_dir.exists():
        sys.exit(f"Schema directory not found: {schema_dir}")

    print(f"--> Generating Pydantic models from {schema_dir} to {output_path}")
    generate(
        input_=schema_dir,
        output=output_path,
        input_file_type=InputFileType.JsonSchema,
        target_python_version=PythonVersion.PY_310,
        use_standard_collections=True,
        field_constraints=True,
        snake_case_field=False,
        disable_timestamp=True,
    )
    print("✅ Pydantic domain models generated")


if __name__ == "__main__":
    main()
