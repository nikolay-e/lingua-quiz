#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

SCHEMA_FILE="$ROOT_DIR/schema/lingua-quiz-schema.json"
OUTPUT_FILE="$ROOT_DIR/packages/domain/src/generated/domain.ts"

if ! command -v npx &>/dev/null; then
  echo "Error: npx not found. Please install Node.js."
  exit 1
fi

npx json-schema-to-typescript \
  --input "$SCHEMA_FILE" \
  --output "$OUTPUT_FILE" \
  --bannerComment "// Auto-generated from OpenAPI schema (lingua-quiz-schema.json). Do not edit manually." \
  --additionalProperties false \
  --strictIndexSignatures \
  2>/dev/null || {
  echo "Warning: json-schema-to-typescript failed, using fallback method"
  npx openapi-typescript "$SCHEMA_FILE" --output "$OUTPUT_FILE" 2>/dev/null || true
}
