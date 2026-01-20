#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== Lingua Quiz Code Generation ==="
echo "Source: schema/lingua-quiz-schema.json"
echo ""

cd "$ROOT_DIR"

echo "[1/3] Generating TypeScript API client..."
npm run generate --workspace @lingua-quiz/api-client
echo "  → packages/api-client/src/generated/"

echo ""
echo "[2/3] Generating TypeScript domain types..."
"$SCRIPT_DIR/generate-domain-ts.sh"
echo "  → packages/domain/src/generated/domain.ts"

echo ""
echo "[3/3] Generating Python schemas..."
"$SCRIPT_DIR/generate-backend-schemas.sh"
echo "  → apps/backend/src/generated/schemas.py"

echo ""
echo "=== Code generation complete ==="
