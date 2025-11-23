import os
import random
import string

from playwright.sync_api import Page, expect
import pytest

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://frontend")
API_URL = os.getenv("API_URL", "http://backend:9000/api")


def generate_random_username():
    return "test_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=8))


def generate_valid_password():
    return "Test@123" + "".join(random.choices(string.ascii_lowercase, k=4))


@pytest.fixture
def test_user():
    return {
        "username": generate_random_username(),
        "password": generate_valid_password(),
    }


class TestRegistration:
    def test_register_page_loads(self, page: Page):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")
        expect(page.locator("h2")).to_have_text("Create Account")
        expect(page.locator("#register-username")).to_be_visible()
        expect(page.locator("#register-password")).to_be_visible()

    def test_register_new_user(self, page: Page, test_user):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")

        page.fill("#register-username", test_user["username"])
        page.fill("#register-password", test_user["password"])

        page.click("button:has-text('Create Account')")

        expect(page.locator("text=Welcome")).to_be_visible(timeout=10000)

    def test_register_password_requirements_shown(self, page: Page):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")

        page.fill("#register-password", "weak")

        expect(page.locator("text=At least 8 characters long")).to_be_visible()
        expect(page.locator("text=Contains at least one uppercase letter")).to_be_visible()

    def test_register_duplicate_user_fails(self, page: Page, test_user):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")

        page.fill("#register-username", test_user["username"])
        page.fill("#register-password", test_user["password"])
        page.click("button:has-text('Create Account')")
        expect(page.locator("text=Welcome")).to_be_visible(timeout=10000)

        page.click("button:has-text('Logout')")
        expect(page.locator("h2")).to_have_text("Sign In", timeout=10000)

        page.click("text=Register here")
        page.fill("#register-username", test_user["username"])
        page.fill("#register-password", test_user["password"])
        page.click("button:has-text('Create Account')")

        expect(page.locator("text=already exists")).to_be_visible(timeout=10000)


class TestLogin:
    def test_login_page_loads(self, page: Page):
        page.goto(FRONTEND_URL)
        expect(page.locator("h2")).to_have_text("Sign In")
        expect(page.locator("#username")).to_be_visible()
        expect(page.locator("#password")).to_be_visible()

    def test_login_with_valid_credentials(self, page: Page, test_user):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")
        page.fill("#register-username", test_user["username"])
        page.fill("#register-password", test_user["password"])
        page.click("button:has-text('Create Account')")
        expect(page.locator("text=Welcome")).to_be_visible(timeout=10000)

        page.click("button:has-text('Logout')")
        expect(page.locator("h2")).to_have_text("Sign In", timeout=10000)

        page.fill("#username", test_user["username"])
        page.fill("#password", test_user["password"])
        page.click("button:has-text('Sign In')")

        expect(page.locator("text=Welcome")).to_be_visible(timeout=10000)

    def test_login_with_invalid_credentials(self, page: Page):
        page.goto(FRONTEND_URL)
        page.fill("#username", "nonexistent_user")
        page.fill("#password", "WrongPassword123!")
        page.click("button:has-text('Sign In')")

        expect(page.locator("text=Unauthorized")).to_be_visible(timeout=10000)

    def test_navigate_to_register(self, page: Page):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")
        expect(page.locator("h2")).to_have_text("Create Account")


class TestQuizSelection:
    @pytest.fixture
    def logged_in_page(self, page: Page, test_user):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")
        page.fill("#register-username", test_user["username"])
        page.fill("#register-password", test_user["password"])
        page.click("button:has-text('Create Account')")
        page.wait_for_selector("text=Welcome", timeout=10000)
        return page

    def test_quiz_menu_visible_after_login(self, logged_in_page: Page):
        expect(logged_in_page.locator("text=Welcome")).to_be_visible(timeout=10000)

    def test_logout_button_visible(self, logged_in_page: Page):
        expect(logged_in_page.locator("button:has-text('Logout')")).to_be_visible(timeout=10000)

    def test_logout_returns_to_login(self, logged_in_page: Page):
        logged_in_page.click("button:has-text('Logout')")
        expect(logged_in_page.locator("h2")).to_have_text("Sign In", timeout=10000)
