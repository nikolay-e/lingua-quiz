# Critical Performance & Architecture Issues

## 🚨 CRITICAL: Synchronous Database Blocking in Async Event Loop

**Status:** ✅ FIXED - Using Thread Pool (Option 1)

### Problem

File: `packages/backend/src/main.py` & `core/database.py`

The application uses FastAPI with `async def` endpoints, but performs database operations
using the **synchronous psycopg2 driver** in the main thread
(`query_db`, `execute_write_transaction`).

```python
# Before (WRONG)
@router.get("/translations", response_model=list[VocabularyItemResponse])
async def get_translations(...) -> list[VocabularyItemResponse]:
    # This blocks the entire event loop!
    translations = query_db("""SELECT ...""", (list_name, version_id))
    return [VocabularyItemResponse.model_validate(...) for t in translations]
```

### Impact

- **Any database query pauses the entire application**
- Server effectively handles requests **one at a time sequentially**
- **All concurrent requests are blocked** while waiting for a single DB query
- Completely negates the performance benefits of FastAPI/asyncio
- With 10 concurrent users, each waits for all others' queries to complete

### Root Cause

Standard Python `async def` functions run on the main event loop.
Using synchronous I/O (like psycopg2) within them blocks the entire loop.

### Solutions

#### Option 1: Use Thread Pool (Quick Fix)

Change all endpoints to synchronous `def` instead of `async def`. FastAPI will automatically run them in a thread pool.

```python
# Quick fix
@router.get("/translations", response_model=list[VocabularyItemResponse])
def get_translations(...) -> list[VocabularyItemResponse]:  # Remove 'async'
    translations = query_db("""SELECT ...""", (list_name, version_id))
    return [VocabularyItemResponse.model_validate(...) for t in translations]
```

**Pros:**

- Minimal code changes
- Works with existing psycopg2 driver

**Cons:**

- Limited concurrency (thread pool size)
- Threads have overhead
- Not true async

#### Option 2: Migrate to Async Driver (Proper Fix)

Switch to an asynchronous PostgreSQL driver like `asyncpg` or `psycopg3 (async mode)`.

```python
# Proper async approach
import asyncpg

pool = await asyncpg.create_pool(DATABASE_URL)

@router.get("/translations", response_model=list[VocabularyItemResponse])
async def get_translations(...) -> list[VocabularyItemResponse]:
    async with pool.acquire() as conn:
        translations = await conn.fetch(
            """SELECT ...""",
            list_name, version_id
        )
    return [VocabularyItemResponse.model_validate(dict(t)) for t in translations]
```

**Pros:**

- True async I/O
- High concurrency
- Better resource utilization

**Cons:**

- Requires refactoring all database code
- Different API from psycopg2
- More complex transaction handling

### Recommendation

For production, **Option 2 (asyncpg)** is strongly recommended.
For immediate release, **Option 1** is acceptable as a quick fix.

### Implementation (Option 1 - Completed)

**Date:** 2025-12-06

All 18 async endpoints have been converted to synchronous `def` functions.
FastAPI now automatically runs them in a thread pool, preventing event loop blocking.

**Modified Files:**

- `src/api/v2/auth.py` - 4 endpoints (register, login, refresh, delete_account)
- `src/api/v2/vocabulary.py` - 2 endpoints (get_word_lists, get_translations)
- `src/api/v2/progress.py` - 3 endpoints
  (get_user_progress, save_user_progress, save_bulk_progress)
- `src/api/v2/version.py` - 1 endpoint (get_active_content_version)
- `src/api/v2/admin.py` - 6 endpoints (search, get, create, update, delete, list vocabulary)
- `src/api/v2/tts.py` - 2 endpoints (synthesize_speech, get_tts_languages)

**Verification:**

- All 18 backend tests passing
- No changes to API contracts
- Application now handles concurrent requests without blocking

**Future Work:**
Option 2 (asyncpg migration) remains recommended for optimal performance at scale.

---

## ⚠️ Deployment Artifact Divergence

**Status:** 🟡 Documented - Requires Process Change

### Problem: Different Builds

Files: `.github/workflows/*.yml`

**CI Pipeline:**

1. Builds Docker image
2. Tests it
3. Tags it (e.g., `pr-123-abc`)

**Staging:** Uses the tested image ✅

**Production:** Rebuilds Docker image **from scratch** to inject `APP_ENVIRONMENT=production` ❌

### Impact: Deployment Divergence

The code running in **Production is binary-different** from the code verified in CI/Staging.
If the rebuild:

- Pulls newer minor dependencies (despite lockfiles)
- Has different environment variables affecting build
- Occurs at a different time with different base images

**Production could break despite Staging passing.**

### Solution: Runtime Configuration

Use Docker build args or environment variables at **runtime** instead of **build time**:

```dockerfile
# Use ARG for build-time, but don't rebuild for different environments
ARG APP_ENVIRONMENT=development
ENV APP_ENVIRONMENT=${APP_ENVIRONMENT}
```

Or better: Set `APP_ENVIRONMENT` as a runtime environment variable in Kubernetes/deployment config, not during build.

**The same tested binary artifact should be promoted across all environments.**

---

## 🟡 No Frontend Hot-Reloading in Docker

**Status:** 🟡 Documented - Development Workflow Issue

### Problem: Production Build in Dev

File: `docker-compose.yml`

The frontend service runs a **production build** (`npm run build` → Nginx).
It mounts the nginx config but **not the source code** (`packages/frontend`).

### Impact: No Hot Reload

Developers **cannot use Docker Compose for frontend development**. Changing a `.svelte` file requires:

1. Stopping the container
2. Rebuilding the entire Docker image
3. Restarting the container

This breaks the dev loop. Most developers likely run `npm run dev` outside Docker while backend runs inside, leading to:

- Environment discrepancies
- `VITE_API_URL` localhost routing issues
- Different behavior between dev and production

### Solution: Dev Compose Override

Add a `docker-compose.dev.yml` override:

```yaml
services:
  frontend-dev:
    build:
      context: .
      target: frontend-dev # New Dockerfile stage
    volumes:
      - ./packages/frontend:/app/packages/frontend
      - /app/packages/frontend/node_modules
    command: npm run dev -- --host 0.0.0.0
    environment:
      VITE_API_URL: http://localhost:9000
```

Create a `frontend-dev` stage in Dockerfile that runs Vite dev server instead of production build.

---

## 🔵 TTS Credentials Missing (Feature-Specific)

**Status:** 🔵 Low Priority - Documented in .env.example

### Problem: Missing Credentials

File: `packages/backend/src/tts_service.py`

The service attempts to decode `GOOGLE_CLOUD_CREDENTIALS_B64` or fall back to
default authentication. Neither `docker-compose.yml` nor `.env.example` include this variable.

### Impact: TTS Errors

TTS feature returns **500 errors** in local Docker environment out of the box.

### Solution: Document and Degrade Gracefully

1. Document in `.env.example`:

   ```bash
   # Google Cloud TTS (Optional - required for text-to-speech feature)
   # GOOGLE_CLOUD_CREDENTIALS_B64=<base64-encoded-credentials-json>
   ```

2. Make TTS gracefully degrade if credentials are missing:

   ```python
   def is_available(self) -> bool:
       """Returns False if credentials are missing instead of crashing."""
       try:
           self.client.list_voices()  # Test call
           return True
       except Exception:
           logger.warning("TTS credentials not configured")
           return False
   ```

---

## Summary

| Issue                   | Severity    | Status                 | Action Required                      |
| ----------------------- | ----------- | ---------------------- | ------------------------------------ |
| Async Database Blocking | 🚨 Critical | ✅ Fixed (Thread Pool) | Consider asyncpg migration for scale |
| Queue Position Drift    | 🚨 Critical | ✅ Fixed               | -                                    |
| Auth Race Condition     | 🚨 Critical | ✅ Fixed               | -                                    |
| Data Loss on Unload     | 🚨 Critical | ✅ Fixed               | -                                    |
| CORS Mismatch           | 🟠 High     | ✅ Fixed               | -                                    |
| Deployment Divergence   | 🟡 Medium   | Documented             | Change CI/CD process                 |
| No Hot Reload           | 🟡 Medium   | Documented             | Add docker-compose.dev.yml           |
| TTS Credentials         | 🔵 Low      | Documented             | Update .env.example                  |
