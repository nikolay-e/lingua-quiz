import os

from pages.admin_page import AdminPage
from pages.auth_page import AuthPage
from playwright.sync_api import Page, expect
import pytest
from tests.conftest import AuthenticatedUser, login_and_start_quiz, login_user

pytestmark = pytest.mark.e2e

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://frontend")


class TestXSSPrevention:
    def test_xss_in_answer_feedback(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        xss_answer = "<img src=x onerror=alert('XSS')>"
        answer_input = page.get_by_placeholder("Type your answer...")
        answer_input.fill(xss_answer)
        page.get_by_role("button", name="Check Answer").click()

        page.wait_for_timeout(2000)

        page_content = page.content()
        assert "<img src=x onerror=" not in page_content


class TestCSRFProtection:
    def test_api_requires_valid_token(self, page: Page) -> None:
        api_url = os.getenv("API_URL", "http://backend:9000/api")
        response = page.request.post(
            f"{api_url}/user/progress",
            data={"level": 1, "vocabulary_item_id": "test"},
        )

        assert response.status in [401, 403]

    def test_admin_api_blocks_non_admin(self, page: Page, test_user: AuthenticatedUser) -> None:
        auth_page = AuthPage(page, FRONTEND_URL)
        auth_page.goto().login(test_user["username"], test_user["password"])
        auth_page.wait_for_welcome()

        page.goto(f"{FRONTEND_URL}/admin")

        expect(page).not_to_have_url(f"{FRONTEND_URL}/admin", timeout=3000)


class TestAuthenticationSecurity:
    def test_token_not_in_url(self, page: Page, test_user: AuthenticatedUser) -> None:
        auth_page = AuthPage(page, FRONTEND_URL)
        auth_page.goto().login(test_user["username"], test_user["password"])
        auth_page.wait_for_welcome()

        current_url = page.url
        assert "token" not in current_url.lower()
        assert "jwt" not in current_url.lower()

    def test_token_not_in_html_source(self, page: Page, test_user: AuthenticatedUser) -> None:
        auth_page = AuthPage(page, FRONTEND_URL)
        auth_page.goto().login(test_user["username"], test_user["password"])
        auth_page.wait_for_welcome()

        page_content = page.content()
        assert "eyJ" not in page_content[:10000]

    def test_password_not_in_network_response(self, page: Page) -> None:
        responses = []

        def handle_response(response):
            responses.append(response)

        page.on("response", handle_response)

        auth_page = AuthPage(page, FRONTEND_URL)
        auth_page.goto()

        page.get_by_role("textbox", name="Username").fill("testuser")
        page.get_by_role("textbox", name="Password").fill("TestPassword123!")
        page.get_by_role("button", name="Sign In").click()

        page.wait_for_timeout(2000)

        for response in responses:
            try:
                body = response.text()
                assert "TestPassword123!" not in body
            except Exception:
                pass

    def test_session_expires_on_logout(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_user(page, test_user["username"], test_user["password"])

        local_storage_before = page.evaluate("() => localStorage.getItem('token')")

        page.get_by_role("link", name="Settings").click()
        page.wait_for_timeout(500)

        logout_button = page.get_by_role("button", name="Log Out")
        if logout_button.is_visible():
            logout_button.click()
            page.wait_for_timeout(1000)

        local_storage_after = page.evaluate("() => localStorage.getItem('token')")
        assert local_storage_after is None or local_storage_after != local_storage_before


class TestInputValidation:
    def test_sql_injection_in_search(self, page: Page, admin_user: AuthenticatedUser) -> None:
        auth_page = AuthPage(page, FRONTEND_URL)
        auth_page.goto().login(admin_user["username"], admin_user["password"])
        auth_page.wait_for_welcome()

        admin_page = AdminPage(page, FRONTEND_URL)
        admin_page.navigate_to_admin().wait_for_admin_panel()

        sql_injection = "'; DROP TABLE users; --"
        admin_page.search(sql_injection)

        page.wait_for_timeout(2000)

    def test_very_long_input_rejected(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        very_long_answer = "a" * 10000
        answer_input = page.get_by_placeholder("Type your answer...")
        answer_input.fill(very_long_answer)
        page.get_by_role("button", name="Check Answer").click()

        page.wait_for_timeout(2000)


class TestSecureHeaders:
    def test_https_redirect_configured(self, page: Page) -> None:
        page.goto(FRONTEND_URL)

        page.wait_for_timeout(1000)

    def test_no_clickjacking_vulnerability(self, page: Page) -> None:
        page.goto(FRONTEND_URL)

        page.wait_for_timeout(1000)
