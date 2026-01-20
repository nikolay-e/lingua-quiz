#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

SCHEMA_FILE="$ROOT_DIR/schema/lingua-quiz-schema.json"
OUTPUT_FILE="$ROOT_DIR/apps/backend/src/generated/schemas.py"

if ! command -v datamodel-codegen &>/dev/null; then
  echo "Installing datamodel-code-generator..."
  pip install datamodel-code-generator --quiet
fi

datamodel-codegen \
  --input "$SCHEMA_FILE" \
  --input-file-type openapi \
  --output "$OUTPUT_FILE" \
  --output-model-type pydantic_v2.BaseModel \
  --target-python-version 3.13 \
  --use-annotated \
  --field-constraints \
  --use-standard-collections \
  --base-class core.base_model.APIBaseModel \
  --collapse-root-models
