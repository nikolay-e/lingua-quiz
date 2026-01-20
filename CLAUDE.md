# CLAUDE.md - lingua-quiz

> Extends [../CLAUDE.md](../CLAUDE.md)

## Project Overview

Language learning web application using spaced repetition for vocabulary mastery.

Full-stack application with React frontend and Python backend.

**Live Demo:** [staging.lingua-quiz.org](https://staging.lingua-quiz.org/)

## Tech Stack

- **Frontend**: React 19, Vite 7, TypeScript
- **Backend**: Python 3.13, FastAPI, PostgreSQL
- **Testing**: Playwright (E2E), Python integration tests
- **Monorepo**: npm workspaces

## Project Structure

```text
lingua-quiz/
├── apps/
│   ├── frontend/              # React 19 application
│   └── backend/               # Python FastAPI application
├── packages/
│   ├── core/                  # Quiz business logic (TypeScript)
│   ├── domain/                # Shared domain models (TypeScript)
│   └── api-client/            # Generated API client (TypeScript)
├── tools/
│   └── vocab-tools/           # Vocabulary generation pipeline (Python)
├── tests/
│   └── e2e/                   # Playwright E2E tests
├── schema/                    # OpenAPI schema
├── infra/
│   └── nginx/                 # nginx configurations
├── docs/
│   └── proposals/             # Design documents
├── Dockerfile                 # Multi-stage build
├── docker-compose.yml         # Local development
└── package.json               # Workspace configuration
```

## Commands

```bash
# Code quality
npm run format          # Format all code
npm run lint            # Lint all code
npm run typecheck       # Type checking

# Testing (ONLY via docker compose)
docker compose --profile test-all up --build    # Run all tests
docker compose --profile test-all run --rm test-all pytest tests/test_backend_integration.py -v  # Run specific tests
```

**Testing Policy:** All tests MUST be run via `docker compose --profile test-all`. Never run tests directly on the host machine.

## Setup After Clone

```bash
npm install
```

## System Architecture

### Core Components

- **`@lingua-quiz/core`**: Standalone TypeScript package with learning algorithm. Framework-agnostic.
- **Frontend**: Executes core logic locally for zero-latency UX. Manages session state in memory.
- **Backend**: Stateless CRUD API for persistence only. No business logic validation.

### Session Flow

1. Client fetches word data and saved progress from backend
2. Core module builds learning queues in client memory
3. Session runs locally (answering, queue updates, leveling)
4. Progress saved asynchronously via debounced bulk save (1000ms)

### Learning Algorithm

Level-based mastery system (not traditional time-based SRS).

**Parameters:**

- Focus Loop Size (F): 5
- Promotion Coefficient (K): 2
- Promotion Threshold: 3 correct answers
- Degradation: 3 mistakes in last 10 attempts

**Mastery Levels:**

- 0: New (unseen)
- 1-2: Learning (source→target, then reverse)
- 3-4: Examples (primary, then reverse)
- 5: Mastered

**Progression:**

- Correct: Move to position `(K × F) × consecutiveCorrect`, promote at 3 correct
- Incorrect: Reset streak, move to position 5, degrade if 3 mistakes in window

### Answer Validation

| Separator | Rule                 | Example                             |
| --------- | -------------------- | ----------------------------------- |
| `,`       | All parts required   | `floor, apartment` → both needed    |
| `\|`      | Any part required    | `car\|automobile` → either works    |
| `()`      | Grouped alternatives | `(equal\|same), (now\|immediately)` |
| `[]`      | Optional content     | `world [universe]`                  |

**Normalization:** Case-insensitive, whitespace removed, diacritics stripped, German chars
converted (ä→a, ß→ss), Cyrillic normalized (ё→е).

## Vocabulary Tools

The `tools/vocab-tools/` generates CEFR-level vocabulary from subtitle frequency data.

```bash
vocab-tools generate es        # Generate frequency list
vocab-tools analyze es-a1      # Analyze vocabulary
vocab-tools fill es-a1         # Fill placeholders
vocab-tools validate           # Validate all migrations
vocab-tools export es-a1       # Export vocabulary from staging DB
vocab-tools import ./data/     # Import vocabulary to staging DB
```

### Local Database Access

Import/export commands connect directly to staging PostgreSQL via kubectl port-forward.

**Setup (one-time):**

```bash
# Start port-forward (run in separate terminal, keep running)
kubectl port-forward -n shared-database svc/shared-database-shared-postgres 5433:5432
```

**Credentials:** Stored in macOS Keychain (see `gitops/CLAUDE.md` for details).

| Keychain Key                    | Description                  |
| ------------------------------- | ---------------------------- |
| `lingua-quiz-words-db-host`     | localhost (via port-forward) |
| `lingua-quiz-words-db-port`     | 5433                         |
| `lingua-quiz-words-db-name`     | linguaquiz_words             |
| `lingua-quiz-words-db-user`     | linguaquiz_words             |
| `lingua-quiz-words-db-password` | DB password                  |

**Fallback:** Environment variables `WORDS_DB_*` override Keychain if set.

**Pipeline:** Normalization → Lemmatization (Stanza) → NLP Analysis → Validation → Inflection Filtering → Deduplication

See `tools/vocab-tools/CLAUDE.md` for details.

### CEFR Vocabulary Sizes

| Level | Words | Cumulative |
| ----- | ----- | ---------- |
| A1    | 1,000 | 1,000      |
| A2    | 1,000 | 2,000      |
| B1    | 2,000 | 4,000      |
| B2    | 2,000 | 6,000      |
| C1    | 4,000 | 10,000     |
| C2    | 4,000 | 14,000     |

## Database Migrations

Migrations run automatically via Alembic before application starts.

## Deployment

CD managed externally via GitOps.
