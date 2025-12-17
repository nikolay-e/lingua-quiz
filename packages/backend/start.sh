#!/bin/sh
set -e # Exit immediately if a command exits with a non-zero status

echo "Waiting for database at ${DB_HOST}:${DB_PORT}..."
while ! nc -z ${DB_HOST} ${DB_PORT}; do
  echo "Database not ready, waiting..."
  sleep 2
done
echo "Database is ready!"
sleep 2

MIGRATE="${MIGRATE:-false}"
echo "MIGRATE variable is set to: $MIGRATE"

if [ "$MIGRATE" = "true" ]; then
  echo "Running Alembic migrations for main database..."
  alembic upgrade head || {
    echo "ERROR: Alembic migration failed"
    exit 1
  }
fi

MIGRATE_WORDS="${MIGRATE_WORDS:-false}"
echo "MIGRATE_WORDS variable is set to: $MIGRATE_WORDS"

if [ "$MIGRATE_WORDS" = "true" ]; then
  echo "Waiting for words database at ${WORDS_DB_HOST:-$DB_HOST}:${WORDS_DB_PORT:-$DB_PORT}..."
  while ! nc -z ${WORDS_DB_HOST:-$DB_HOST} ${WORDS_DB_PORT:-$DB_PORT}; do
    echo "Words database not ready, waiting..."
    sleep 2
  done
  echo "Words database is ready!"
  sleep 1

  echo "Running Alembic migrations for words database..."
  alembic -c alembic-words.ini upgrade head || {
    echo "ERROR: Words database migration failed"
    exit 1
  }
fi

SEED_TEST_DATA="${SEED_TEST_DATA:-false}"
if [ "$SEED_TEST_DATA" = "true" ]; then
  echo "Seeding test data..."
  python seed_test_data.py
fi

if [ -n "$UVICORN_WORKERS" ]; then
  WORKERS=$UVICORN_WORKERS
else
  WORKERS=1
fi

# Convert LOG_LEVEL to lowercase for uvicorn (default: info)
UVICORN_LOG_LEVEL=$(echo "${LOG_LEVEL:-info}" | tr '[:upper:]' '[:lower:]')
echo "Starting uvicorn with $WORKERS workers, log level: $UVICORN_LOG_LEVEL..."

exec uvicorn main:app --host 0.0.0.0 --port 9000 --workers $WORKERS --log-level "$UVICORN_LOG_LEVEL"
