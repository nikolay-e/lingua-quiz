import os
import time
from typing import Any, cast

from core.config import (
    DB_HOST,
    DB_NAME,
    DB_PASSWORD,
    DB_POOL_MAX_SIZE,
    DB_POOL_MIN_SIZE,
    DB_PORT,
    DB_USER,
    SLOW_QUERY_THRESHOLD_MS,
    TTS_DB_HOST,
    TTS_DB_NAME,
    TTS_DB_PASSWORD,
    TTS_DB_POOL_MAX_SIZE,
    TTS_DB_POOL_MIN_SIZE,
    TTS_DB_PORT,
    TTS_DB_USER,
    WORDS_DB_HOST,
    WORDS_DB_NAME,
    WORDS_DB_PASSWORD,
    WORDS_DB_POOL_MAX_SIZE,
    WORDS_DB_POOL_MIN_SIZE,
    WORDS_DB_PORT,
    WORDS_DB_USER,
)
from core.logging import get_logger
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool
from pydantic import BaseModel

logger = get_logger(__name__)


def _get_query_fingerprint(query: str, max_length: int = 50) -> str:
    normalized = " ".join(query.split())
    return normalized[:max_length] + "..." if len(normalized) > max_length else normalized


SKIP_DB_INIT = os.getenv("SKIP_DB_INIT", "false").lower() in {"1", "true", "yes"}

if SKIP_DB_INIT:
    logger.info("Skipping database pool initialization because SKIP_DB_INIT is set")
    db_pool = None
    tts_db_pool = None
    words_db_pool = None
else:
    db_pool = SimpleConnectionPool(
        DB_POOL_MIN_SIZE,
        DB_POOL_MAX_SIZE,
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )

    tts_db_pool = SimpleConnectionPool(
        TTS_DB_POOL_MIN_SIZE,
        TTS_DB_POOL_MAX_SIZE,
        host=TTS_DB_HOST,
        port=TTS_DB_PORT,
        database=TTS_DB_NAME,
        user=TTS_DB_USER,
        password=TTS_DB_PASSWORD,
    )
    logger.info("TTS database pool initialized (host=%s, db=%s)", TTS_DB_HOST, TTS_DB_NAME)

    words_db_pool = SimpleConnectionPool(
        WORDS_DB_POOL_MIN_SIZE,
        WORDS_DB_POOL_MAX_SIZE,
        host=WORDS_DB_HOST,
        port=WORDS_DB_PORT,
        database=WORDS_DB_NAME,
        user=WORDS_DB_USER,
        password=WORDS_DB_PASSWORD,
    )
    logger.info("Words database pool initialized (host=%s, db=%s)", WORDS_DB_HOST, WORDS_DB_NAME)


def get_db():
    if db_pool is None:
        raise RuntimeError("Database pool is not initialized")
    return db_pool.getconn()


def put_db(conn):
    if db_pool is None:
        raise RuntimeError("Database pool is not initialized")
    db_pool.putconn(conn)


def get_words_db():
    if words_db_pool is None:
        raise RuntimeError("Words database pool is not initialized")
    return words_db_pool.getconn()


def put_words_db(conn):
    if words_db_pool is None:
        raise RuntimeError("Words database pool is not initialized")
    words_db_pool.putconn(conn)


def query_db(query, args=(), one=False):
    query_upper = query.strip().upper()
    write_keywords = [
        "INSERT",
        "UPDATE",
        "DELETE",
        "CREATE",
        "DROP",
        "ALTER",
        "TRUNCATE",
    ]

    for keyword in write_keywords:
        if query_upper.startswith(keyword):
            raise ValueError(f"query_db() detected a write operation starting with '{keyword}'. Use execute_write_transaction() instead.")

    conn = None
    start_time = time.perf_counter()
    query_fingerprint = _get_query_fingerprint(query)
    try:
        conn = get_db()
        if not conn:
            raise Exception("Failed to get database connection")

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, args)
            rv = cur.fetchall()
            duration_ms = (time.perf_counter() - start_time) * 1000

            if duration_ms >= SLOW_QUERY_THRESHOLD_MS:
                logger.warning(
                    "Slow query detected",
                    extra={
                        "query": query_fingerprint,
                        "duration_ms": round(duration_ms, 2),
                        "row_count": len(rv),
                        "db": "main",
                    },
                )

            return (rv[0] if rv else None) if one else rv

    except psycopg2.pool.PoolError as e:
        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.error(
            "Connection pool error",
            extra={"query": query_fingerprint, "duration_ms": round(duration_ms, 2), "error": str(e), "db": "main"},
        )
        if conn:
            try:
                conn.rollback()
            except Exception:  # nosec B110
                pass
        raise
    except Exception as e:
        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.error(
            "Database query error",
            extra={"query": query_fingerprint, "duration_ms": round(duration_ms, 2), "error": str(e), "db": "main"},
        )
        if conn:
            try:
                conn.rollback()
            except Exception:  # nosec B110
                pass
        raise
    finally:
        if conn:
            try:
                put_db(conn)
            except Exception as e:
                logger.critical(f"Failed to return connection to pool: {e}")
                try:
                    conn.close()
                except Exception:  # nosec B110
                    pass


def execute_write_transaction(query, args=(), fetch_results=False, one=False):
    conn = None
    start_time = time.perf_counter()
    query_fingerprint = _get_query_fingerprint(query)
    try:
        conn = get_db()
        if not conn:
            raise Exception("Failed to get database connection")

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, args)

            if fetch_results:
                rv = cur.fetchall()
                conn.commit()
                duration_ms = (time.perf_counter() - start_time) * 1000

                if duration_ms >= SLOW_QUERY_THRESHOLD_MS:
                    logger.warning(
                        "Slow write query detected",
                        extra={
                            "query": query_fingerprint,
                            "duration_ms": round(duration_ms, 2),
                            "row_count": len(rv),
                            "db": "main",
                        },
                    )

                return (rv[0] if rv else None) if one else rv

            row_count = cur.rowcount
            conn.commit()
            duration_ms = (time.perf_counter() - start_time) * 1000

            if duration_ms >= SLOW_QUERY_THRESHOLD_MS:
                logger.warning(
                    "Slow write query detected",
                    extra={
                        "query": query_fingerprint,
                        "duration_ms": round(duration_ms, 2),
                        "rows_affected": row_count,
                        "db": "main",
                    },
                )

            return row_count

    except psycopg2.pool.PoolError as e:
        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.error(
            "Connection pool error",
            extra={"query": query_fingerprint, "duration_ms": round(duration_ms, 2), "error": str(e), "db": "main"},
        )
        raise
    except Exception as e:
        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.error(
            "Database write error",
            extra={"query": query_fingerprint, "duration_ms": round(duration_ms, 2), "error": str(e), "db": "main"},
        )
        if conn:
            try:
                conn.rollback()
            except Exception:  # nosec B110
                pass
        raise
    finally:
        if conn:
            try:
                put_db(conn)
            except Exception as e:
                logger.critical(f"Failed to return connection to pool: {e}")
                try:
                    conn.close()
                except Exception:  # nosec B110
                    pass


def query_words_db(query, args=(), one=False):
    query_upper = query.strip().upper()
    write_keywords = [
        "INSERT",
        "UPDATE",
        "DELETE",
        "CREATE",
        "DROP",
        "ALTER",
        "TRUNCATE",
    ]

    for keyword in write_keywords:
        if query_upper.startswith(keyword):
            raise ValueError(f"query_words_db() detected a write operation starting with '{keyword}'. Use execute_words_write_transaction() instead.")

    conn = None
    start_time = time.perf_counter()
    query_fingerprint = _get_query_fingerprint(query)
    try:
        conn = get_words_db()
        if not conn:
            raise Exception("Failed to get words database connection")

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, args)
            rv = cur.fetchall()
            duration_ms = (time.perf_counter() - start_time) * 1000

            if duration_ms >= SLOW_QUERY_THRESHOLD_MS:
                logger.warning(
                    "Slow query detected",
                    extra={
                        "query": query_fingerprint,
                        "duration_ms": round(duration_ms, 2),
                        "row_count": len(rv),
                        "db": "words",
                    },
                )

            return (rv[0] if rv else None) if one else rv

    except psycopg2.pool.PoolError as e:
        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.error(
            "Words database pool error",
            extra={"query": query_fingerprint, "duration_ms": round(duration_ms, 2), "error": str(e), "db": "words"},
        )
        if conn:
            try:
                conn.rollback()
            except Exception:  # nosec B110
                pass
        raise
    except Exception as e:
        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.error(
            "Words database query error",
            extra={"query": query_fingerprint, "duration_ms": round(duration_ms, 2), "error": str(e), "db": "words"},
        )
        if conn:
            try:
                conn.rollback()
            except Exception:  # nosec B110
                pass
        raise
    finally:
        if conn:
            try:
                put_words_db(conn)
            except Exception as e:
                logger.critical(f"Failed to return words connection to pool: {e}")
                try:
                    conn.close()
                except Exception:  # nosec B110
                    pass


def execute_words_write_transaction(query, args=(), fetch_results=False, one=False):
    conn = None
    start_time = time.perf_counter()
    query_fingerprint = _get_query_fingerprint(query)
    try:
        conn = get_words_db()
        if not conn:
            raise Exception("Failed to get words database connection")

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, args)

            if fetch_results:
                rv = cur.fetchall()
                conn.commit()
                duration_ms = (time.perf_counter() - start_time) * 1000

                if duration_ms >= SLOW_QUERY_THRESHOLD_MS:
                    logger.warning(
                        "Slow write query detected",
                        extra={
                            "query": query_fingerprint,
                            "duration_ms": round(duration_ms, 2),
                            "row_count": len(rv),
                            "db": "words",
                        },
                    )

                return (rv[0] if rv else None) if one else rv

            row_count = cur.rowcount
            conn.commit()
            duration_ms = (time.perf_counter() - start_time) * 1000

            if duration_ms >= SLOW_QUERY_THRESHOLD_MS:
                logger.warning(
                    "Slow write query detected",
                    extra={
                        "query": query_fingerprint,
                        "duration_ms": round(duration_ms, 2),
                        "rows_affected": row_count,
                        "db": "words",
                    },
                )

            return row_count

    except psycopg2.pool.PoolError as e:
        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.error(
            "Words database pool error",
            extra={"query": query_fingerprint, "duration_ms": round(duration_ms, 2), "error": str(e), "db": "words"},
        )
        raise
    except Exception as e:
        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.error(
            "Words database write error",
            extra={"query": query_fingerprint, "duration_ms": round(duration_ms, 2), "error": str(e), "db": "words"},
        )
        if conn:
            try:
                conn.rollback()
            except Exception:  # nosec B110
                pass
        raise
    finally:
        if conn:
            try:
                put_words_db(conn)
            except Exception as e:
                logger.critical(f"Failed to return words connection to pool: {e}")
                try:
                    conn.close()
                except Exception:  # nosec B110
                    pass


def get_active_version() -> int:
    from fastapi import HTTPException, status

    result = query_words_db("SELECT get_active_version_id()", one=True)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No active content version found",
        )
    return int(result["get_active_version_id"])


def serialize_rows[T: BaseModel](results: Any, model: type[T], one: bool = False) -> list[T] | T | None:
    if results is None:
        return None

    if one:
        return cast(T, model.model_validate(dict(results)))

    return cast(list[T], [model.model_validate(dict(item)) for item in results])
