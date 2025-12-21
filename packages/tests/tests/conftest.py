"""Pytest configuration and fixtures for integration tests."""

import os
from pathlib import Path
import sys
from typing import TypedDict

from playwright.sync_api import Page, expect

BACKEND_DIR_LOCAL = Path(__file__).parent.parent.parent / "backend"
BACKEND_DIR_DOCKER = Path("/home/pwuser/tests/backend")
BACKEND_DIR = BACKEND_DIR_DOCKER if BACKEND_DIR_DOCKER.exists() else BACKEND_DIR_LOCAL

BACKEND_SRC = BACKEND_DIR / "src"
if str(BACKEND_SRC) not in sys.path:
    sys.path.append(str(BACKEND_SRC))

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from generated.schemas import TokenResponse, UserRegistration  # noqa: E402
import psycopg2  # noqa: E402
import pytest  # noqa: E402
import requests  # noqa: E402
from utils import random_password, random_username  # noqa: E402

API_URL = os.getenv("API_URL", "http://localhost:9000/api")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:80")
TIMEOUT = int(os.getenv("TIMEOUT", "30"))
SKIP_TTS_TESTS = os.getenv("SKIP_TTS_TESTS", "false").lower() == "true"


def login_user(page: Page, username: str, password: str) -> None:
    page.goto(FRONTEND_URL)
    expect(page).to_have_title("LinguaQuiz - Advanced Language Learning")
    page.get_by_role("textbox", name="Username").fill(username)
    page.get_by_role("textbox", name="Password").fill(password)
    page.get_by_role("button", name="Sign In").click()
    expect(page.locator("text=Welcome")).to_be_visible(timeout=5000)


def start_quiz_with_cascading_selectors(page: Page) -> None:
    selector_triggers = page.locator('[data-slot="select-trigger"]')
    expect(selector_triggers.first).to_be_visible(timeout=5000)

    selector_triggers.nth(0).click()
    page.locator('[data-slot="select-item"]').first.click()
    page.wait_for_timeout(200)

    selector_triggers.nth(1).click()
    page.locator('[data-slot="select-item"]').first.click()
    page.wait_for_timeout(200)

    selector_triggers.nth(2).click()
    page.locator('[data-slot="select-item"]').first.click()
    page.wait_for_timeout(200)

    page.get_by_role("button", name="Start Learning").click()
    expect(page.locator(".question-text")).to_be_visible(timeout=5000)


def login_and_start_quiz(page: Page, test_user: "AuthenticatedUser") -> None:
    login_user(page, test_user["username"], test_user["password"])
    start_quiz_with_cascading_selectors(page)


def logout_user(page: Page) -> None:
    page.get_by_role("link", name="Settings").click()
    expect(page.locator("h2")).to_have_text("Settings", timeout=5000)
    page.get_by_role("button", name="Log Out").click()
    expect(page.locator("h2")).to_have_text("Sign In", timeout=10000)


class AuthenticatedUser(TypedDict):
    username: str
    password: str
    id: int
    token: str


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    return {
        **browser_context_args,
        "viewport": {"width": 1280, "height": 720},
        "ignore_https_errors": True,
    }


@pytest.fixture
def page(page: Page) -> Page:
    def log_console(msg):
        msg_type = msg.type.upper()
        location = msg.location
        loc_info = f"{location.get('url', 'unknown')}:{location.get('lineNumber', '?')}" if location else "unknown"
        print(f"[BROWSER {msg_type}] [{loc_info}] {msg.text}")

    def log_page_error(err):
        print(f"[PAGE ERROR] {err}")

    def log_request(request):
        if "/admin" in request.url or "admin" in request.url.lower():
            print(f"[REQUEST] {request.method} {request.url}")

    def log_response(response):
        if "/admin" in response.url or "admin" in response.url.lower():
            print(f"[RESPONSE] {response.status} {response.url}")

    page.on("console", log_console)
    page.on("pageerror", log_page_error)
    page.on("request", log_request)
    page.on("response", log_response)
    return page


@pytest.fixture(scope="session")
def browser_type_launch_args(browser_type_launch_args):
    return {
        **browser_type_launch_args,
        "headless": True,
    }


@pytest.fixture
def api_client() -> requests.Session:
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    yield session
    session.close()


@pytest.fixture
def test_user(api_client: requests.Session) -> AuthenticatedUser:
    username = random_username()
    password = random_password()

    registration = UserRegistration(username=username, password=password)
    response = api_client.post(
        f"{API_URL}/auth/register",
        json=registration.model_dump(by_alias=True),
    )

    if response.status_code != 201:
        pytest.skip(f"Failed to create test user: {response.text}")

    token_response = TokenResponse.model_validate(response.json())

    return AuthenticatedUser(
        username=username,
        password=password,
        id=token_response.user.id,
        token=token_response.token,
    )


@pytest.fixture
def web_session():
    session = requests.Session()
    yield session
    session.close()


@pytest.fixture
def authenticated_api_client(api_client, test_user):
    api_client.headers.update({"Authorization": f"Bearer {test_user['token']}"})
    yield api_client
    if "Authorization" in api_client.headers:
        del api_client.headers["Authorization"]


@pytest.fixture(scope="session")
def app_db_credentials():
    return {
        "host": os.getenv("DB_HOST", "postgres"),
        "port": int(os.getenv("DB_PORT", "5432")),
        "user": os.getenv("POSTGRES_USER", "postgres"),
        "password": os.getenv("POSTGRES_PASSWORD", "postgres"),
        "database": os.getenv("POSTGRES_DB", "lingua_quiz"),
    }


@pytest.fixture
def admin_user(api_client: requests.Session, app_db_credentials) -> AuthenticatedUser:
    username = f"admin_{random_username()}"
    password = random_password()

    registration = UserRegistration(username=username, password=password)
    response = api_client.post(
        f"{API_URL}/auth/register",
        json=registration.model_dump(by_alias=True),
    )

    if response.status_code != 201:
        pytest.skip(f"Failed to create admin user: {response.text}")

    token_response = TokenResponse.model_validate(response.json())
    user_id = token_response.user.id

    conn = psycopg2.connect(**app_db_credentials)
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET is_admin = TRUE WHERE id = %s", (user_id,))
    conn.commit()
    cursor.close()
    conn.close()

    login_response = api_client.post(
        f"{API_URL}/auth/login",
        json={"username": username, "password": password},
    )
    new_token = TokenResponse.model_validate(login_response.json())

    return AuthenticatedUser(
        username=username,
        password=password,
        id=user_id,
        token=new_token.token,
    )


@pytest.fixture
def admin_api_client(api_client, admin_user):
    api_client.headers.update({"Authorization": f"Bearer {admin_user['token']}"})
    yield api_client
    if "Authorization" in api_client.headers:
        del api_client.headers["Authorization"]


@pytest.fixture(scope="session")
def test_db_name():
    return "linguaquiz_migration_test"


@pytest.fixture(scope="session")
def test_db_credentials():
    return {
        "host": os.getenv("DB_HOST", "postgres"),
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
def test_database(postgres_connection, test_db_name):
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
    alembic_ini = BACKEND_DIR / "alembic.ini"
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


@pytest.fixture(scope="session")
def words_test_db_name():
    return "linguaquiz_words_migration_test"


@pytest.fixture(scope="session")
def words_test_database(postgres_connection, words_test_db_name):
    cursor = postgres_connection.cursor()
    cursor.execute(f"DROP DATABASE IF EXISTS {words_test_db_name}")
    cursor.execute(f"CREATE DATABASE {words_test_db_name}")
    yield
    cursor.execute(f"DROP DATABASE IF EXISTS {words_test_db_name}")
    cursor.close()


@pytest.fixture
def words_db_connection(words_test_database, words_test_db_name, test_db_credentials):
    conn = psycopg2.connect(database=words_test_db_name, **test_db_credentials)
    yield conn
    conn.close()


@pytest.fixture
def clean_words_db(words_db_connection):
    cursor = words_db_connection.cursor()
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
    words_db_connection.commit()
    cursor.close()


@pytest.fixture
def words_alembic_config(words_test_db_name, test_db_credentials):
    alembic_ini = BACKEND_DIR / "alembic-words.ini"
    config = Config(str(alembic_ini))
    db_url = (
        f"postgresql://{test_db_credentials['user']}:{test_db_credentials['password']}"
        f"@{test_db_credentials['host']}:{test_db_credentials['port']}/{words_test_db_name}"
    )
    config.set_main_option("sqlalchemy.url", db_url)
    return config


@pytest.fixture
def migrated_words_db(clean_words_db, words_alembic_config, words_db_connection):
    command.upgrade(words_alembic_config, "head")
    words_db_connection.commit()
    yield words_db_connection
    try:
        words_db_connection.rollback()
    except Exception:
        pass
    command.downgrade(words_alembic_config, "base")
    try:
        words_db_connection.commit()
    except Exception:
        pass
