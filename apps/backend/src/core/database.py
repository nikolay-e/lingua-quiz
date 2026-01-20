from collections.abc import Callable
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
import psycopg2.pool
from psycopg2.pool import SimpleConnectionPool
from pydantic import BaseModel

logger = get_logger(__name__)

WRITE_KEYWORDS = ("INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "ALTER", "TRUNCATE")


def _get_query_fingerprint(query: str, max_length: int = 50) -> str:
    normalized = " ".join(query.split())
    return normalized[:max_length] + "..." if len(normalized) > max_length else normalized


def _safe_rollback(conn) -> None:
    if conn:
        try:
            conn.rollback()
        except Exception:  # nosec B110
            pass


def _safe_close(conn) -> None:
    if conn:
        try:
            conn.close()
        except Exception:  # nosec B110
            pass


def _log_slow_query(query_fingerprint: str, duration_ms: float, db_name: str, **extra) -> None:
    if duration_ms >= SLOW_QUERY_THRESHOLD_MS:
        logger.warning(
            "Slow query detected",
            extra={"query": query_fingerprint, "duration_ms": round(duration_ms, 2), "db": db_name, **extra},
        )


def _execute_query(
    query: str,
    args: tuple,
    get_conn: Callable,
    put_conn: Callable,
    db_name: str,
    one: bool = False,
    is_write: bool = False,
    fetch_results: bool = False,
):
    query_upper = query.strip().upper()

    if not is_write:
        for keyword in WRITE_KEYWORDS:
            if query_upper.startswith(keyword):
                raise ValueError(f"Read query detected write operation '{keyword}'. Use write transaction instead.")

    conn = None
    start_time = time.perf_counter()
    query_fingerprint = _get_query_fingerprint(query)

    try:
        conn = get_conn()
        if not conn:
            raise RuntimeError(f"Failed to get {db_name} database connection")

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, args)

            if is_write:
                if fetch_results:
                    rv = cur.fetchall()
                    conn.commit()
                    duration_ms = (time.perf_counter() - start_time) * 1000
                    _log_slow_query(query_fingerprint, duration_ms, db_name, row_count=len(rv))
                    return (rv[0] if rv else None) if one else rv

                row_count = cur.rowcount
                conn.commit()
                duration_ms = (time.perf_counter() - start_time) * 1000
                _log_slow_query(query_fingerprint, duration_ms, db_name, rows_affected=row_count)
                return row_count

            rv = cur.fetchall()
            duration_ms = (time.perf_counter() - start_time) * 1000
            _log_slow_query(query_fingerprint, duration_ms, db_name, row_count=len(rv))
            return (rv[0] if rv else None) if one else rv

    except psycopg2.pool.PoolError as e:
        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.error(
            f"{db_name.capitalize()} database pool error",
            extra={"query": query_fingerprint, "duration_ms": round(duration_ms, 2), "error": str(e), "db": db_name},
        )
        _safe_rollback(conn)
        raise
    except Exception as e:
        duration_ms = (time.perf_counter() - start_time) * 1000
        op_type = "write" if is_write else "query"
        logger.error(
            f"{db_name.capitalize()} database {op_type} error",
            extra={"query": query_fingerprint, "duration_ms": round(duration_ms, 2), "error": str(e), "db": db_name},
        )
        _safe_rollback(conn)
        raise
    finally:
        if conn:
            try:
                put_conn(conn)
            except Exception as e:
                logger.critical(f"Failed to return {db_name} connection to pool: {e}")
                _safe_close(conn)


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
    return _execute_query(query, args, get_db, put_db, "main", one=one)


def execute_write_transaction(query, args=(), fetch_results=False, one=False):
    return _execute_query(query, args, get_db, put_db, "main", one=one, is_write=True, fetch_results=fetch_results)


def query_words_db(query, args=(), one=False):
    return _execute_query(query, args, get_words_db, put_words_db, "words", one=one)


def execute_words_write_transaction(query, args=(), fetch_results=False, one=False):
    return _execute_query(query, args, get_words_db, put_words_db, "words", one=one, is_write=True, fetch_results=fetch_results)


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
