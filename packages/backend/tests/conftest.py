import os
from pathlib import Path

from alembic import command  # type: ignore[attr-defined]
from alembic.config import Config
import psycopg2
import pytest


@pytest.fixture(scope="session")
def test_db_name():
    return "linguaquiz_test_db"


@pytest.fixture(scope="session")
def test_db_credentials():
    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "user": os.getenv("POSTGRES_USER", "postgres"),
        "password": os.getenv("POSTGRES_PASSWORD", "postgres"),
    }


@pytest.fixture(scope="session")
def postgres_connection(test_db_credentials):
    conn = psycopg2.connect(database="postgres", **test_db_credentials)
    conn.autocommit = True
    yield conn
    conn.close()


@pytest.fixture(scope="session")
def test_database(postgres_connection, test_db_name, test_db_credentials):
    cursor = postgres_connection.cursor()

    cursor.execute(f"DROP DATABASE IF EXISTS {test_db_name}")
    cursor.execute(f"CREATE DATABASE {test_db_name}")

    yield

    cursor.execute(f"DROP DATABASE IF EXISTS {test_db_name}")
    cursor.close()


@pytest.fixture
def db_connection(test_database, test_db_name, test_db_credentials):
    conn = psycopg2.connect(database=test_db_name, **test_db_credentials)
    yield conn
    conn.close()


@pytest.fixture
def clean_db(db_connection):
    cursor = db_connection.cursor()
    cursor.execute(
        """
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
    """
    )
    tables = cursor.fetchall()
    for (table,) in tables:
        cursor.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE')

    cursor.execute("DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE")
    cursor.execute("DROP FUNCTION IF EXISTS get_active_version_id() CASCADE")
    cursor.execute('DROP EXTENSION IF EXISTS "pg_trgm" CASCADE')
    cursor.execute('DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE')

    db_connection.commit()
    cursor.close()


@pytest.fixture
def alembic_config(test_db_name, test_db_credentials):
    backend_dir = Path(__file__).parent.parent
    alembic_ini = backend_dir / "alembic.ini"

    config = Config(str(alembic_ini))

    db_url = (
        f"postgresql://{test_db_credentials['user']}:{test_db_credentials['password']}"
        f"@{test_db_credentials['host']}:{test_db_credentials['port']}/{test_db_name}"
    )
    config.set_main_option("sqlalchemy.url", db_url)

    return config


@pytest.fixture
def migrated_db(clean_db, alembic_config, db_connection):
    command.upgrade(alembic_config, "head")
    db_connection.commit()
    yield db_connection
    try:
        db_connection.rollback()
    except Exception:
        pass
    command.downgrade(alembic_config, "base")
    try:
        db_connection.commit()
    except Exception:
        pass
