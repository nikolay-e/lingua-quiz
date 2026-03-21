# ===================================================================================
# Lingua Quiz :: Makefile
# ===================================================================================
.DEFAULT_GOAL := help
.PHONY: help codegen codegen-check install build lint typecheck test

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
codegen: ## Regenerate all code from OpenAPI schema
	@./tools/codegen/generate-all.sh

codegen-check: ## Verify generated code is up to date (for CI)
	@./tools/codegen/generate-all.sh
	@git diff --exit-code packages/api-client/src/generated/ apps/backend/src/generated/ || \
		(echo "Error: Generated code is out of date. Run 'make codegen' and commit." && exit 1)

# ===================================================================================
# DEVELOPMENT
# ===================================================================================
install: ## Install all dependencies
	npm install

build: ## Build all packages
	npm run build --workspaces --if-present

lint: ## Lint all code
	npm run lint

typecheck: ## Type check all code
	npm run typecheck

test: ## Run all tests (via docker compose)
	docker compose --profile test-all up --build
