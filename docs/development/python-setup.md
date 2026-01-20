# Python Environment Setup

This project has three Python components with different dependency management approaches.

## Overview

| Component   | Location             | Dependency Management | Python Version |
| ----------- | -------------------- | --------------------- | -------------- |
| Backend     | `apps/backend/`      | requirements.txt      | 3.13+          |
| Vocab Tools | `tools/vocab-tools/` | pyproject.toml        | 3.12+          |
| E2E Tests   | `tests/e2e/`         | requirements.txt      | 3.12+          |

## Backend Setup

```bash
cd apps/backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# For development:
pip install -r requirements-dev.txt
```

## Vocab Tools Setup

Vocab Tools uses `pyproject.toml` as the canonical dependency source.
The `requirements.txt` exists only for pip-audit vulnerability scanning in pre-commit hooks.

```bash
cd tools/vocab-tools
python -m venv venv
source venv/bin/activate

# Install in development mode (uses pyproject.toml)
pip install -e ".[dev]"

# Or install with all optional dependencies
pip install -e ".[all]"

# Download required NLP models
python -m spacy download es_core_news_sm
python -m spacy download en_core_web_sm
python -m stanza download es
python -m stanza download en
```

## E2E Tests Setup

E2E tests run via Docker Compose. For local development:

```bash
cd tests/e2e
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Running Tests

All tests should be run via Docker Compose:

```bash
# Run all tests
docker compose --profile test-all up --build

# Run specific test file
docker compose --profile test-all run --rm test-all pytest test_backend_integration.py -v
```

## Code Quality

All Python code uses:

- **Formatter**: ruff format (or black)
- **Linter**: ruff
- **Type checker**: mypy

Pre-commit hooks automatically format code on commit.
