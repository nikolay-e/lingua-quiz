# Code Generation

Single source of truth for all generated code in the Lingua Quiz project.

## Source

All code is generated from: `schema/lingua-quiz-schema.json` (OpenAPI 3.1 specification)

## Generated Outputs

| Output                  | Location                                  | Generator                  |
| ----------------------- | ----------------------------------------- | -------------------------- |
| TypeScript API Client   | `packages/api-client/src/generated/`      | openapi-typescript-codegen |
| TypeScript Domain Types | `packages/domain/src/generated/domain.ts` | json-schema-to-typescript  |
| Python Pydantic Schemas | `apps/backend/src/generated/schemas.py`   | datamodel-codegen          |

## Usage

```bash
# Regenerate all code (recommended)
make codegen

# Or run directly
./tools/codegen/generate-all.sh
```

## CI Verification

```bash
# Check that generated code is up to date
make codegen-check
```

This runs generation and fails if `git diff` shows any changes.

## Required Tools

- **Node.js 25+** (for TypeScript generators)
- **Python 3.12+** with `datamodel-code-generator` (for Python schemas)

Install Python generator:

```bash
pip install datamodel-code-generator
```

## Individual Scripts

These are internal helpers; prefer `generate-all.sh`:

- `generate-domain-ts.sh` — TypeScript domain types only
- `generate-backend-schemas.sh` — Python schemas only

API client generation uses npm workspace script: `npm run generate --workspace @lingua-quiz/api-client`
