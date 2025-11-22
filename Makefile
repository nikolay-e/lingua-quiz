# ===================================================================================
# Lingua Quiz :: Makefile
# ===================================================================================
.DEFAULT_GOAL := help
.PHONY: help openapi domain-schema domain-py generate-all

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
openapi: ## Generate OpenAPI schema from backend
	@echo "--> Generating OpenAPI spec from FastAPI app..."
	@SKIP_DB_INIT=1 JWT_SECRET=$${JWT_SECRET:-openapi-placeholder-secret} python packages/backend/scripts/export_openapi.py

domain-schema: ## Generate JSON Schemas for domain models
	@echo "--> Generating domain JSON Schemas from Pydantic models..."
	@SKIP_DB_INIT=1 JWT_SECRET=$${JWT_SECRET:-domain-schema-placeholder} python packages/backend/scripts/export_domain_schema.py

domain-py: domain-schema ## Generate Pydantic models from domain JSON Schemas
	@echo "--> Generating Python domain models from JSON Schemas..."
	@python packages/domain-py/generate_models.py

generate-all: ## Regenerate all schemas, clients, and models
	@$(MAKE) openapi
	@$(MAKE) domain-schema
	@npm run generate:api
	@npm run generate:domain
	@$(MAKE) domain-py
