# ===================================================================================
# Lingua Quiz :: Makefile
# ===================================================================================
.DEFAULT_GOAL := help
.PHONY: help openapi generate-backend generate-all

# ===================================================================================
# HELP
# ===================================================================================
help: ## Show this help message
	@echo "Lingua Quiz - Development Makefile"
	@echo "-----------------------------------"
	@echo ""
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z0-9._-]+:.*?## / {printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ===================================================================================
# CODE GENERATION
# ===================================================================================
openapi-info: ## Show info about OpenAPI schema management
	@echo "ℹ️  OpenAPI schema is committed as single source of truth: lingua-quiz-schema.json"
	@echo "ℹ️  To regenerate from backend code, run: make openapi-generate"

openapi-generate: ## Regenerate OpenAPI schema from backend code
	@echo "--> Regenerating OpenAPI schema from backend code..."
	@SKIP_DB_INIT=1 JWT_SECRET=$${JWT_SECRET:-openapi-placeholder-secret} python packages/backend/scripts/export_openapi.py
	@echo "✅ Schema regenerated. Review changes before committing!"

openapi: openapi-info ## Alias for openapi-info (shows schema info)

generate-backend: ## Generate backend Pydantic models from OpenAPI schema
	@echo "--> Generating backend Pydantic models from OpenAPI schema..."
	@mkdir -p packages/backend/src/generated
	@python -m datamodel_code_generator \
		--input lingua-quiz-schema.json \
		--output packages/backend/src/generated/schemas.py \
		--output-model-type pydantic_v2.BaseModel \
		--base-class core.base_model.APIBaseModel \
		--field-constraints \
		--use-standard-collections \
		--use-annotated \
		--use-double-quotes \
		--target-python-version 3.12 \
		--capitalise-enum-members \
		--enum-field-as-literal one \
		--snake-case-field \
		--use-schema-description
	@echo "✅ Generated: packages/backend/src/generated/schemas.py"

generate-all: ## Regenerate all schemas, clients, and models from OpenAPI schema
	@$(MAKE) openapi
	@$(MAKE) generate-backend
	@npm run generate:domain
	@npm run generate:api
