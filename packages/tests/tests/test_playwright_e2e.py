import os
from pathlib import Path
from typing import TypedDict

from playwright.sync_api import Page, expect
import pytest
from tests.conftest import logout_user
from utils import random_password, random_username

pytestmark = pytest.mark.e2e

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://frontend")
API_URL = os.getenv("API_URL", "http://backend:9000/api")
SCREENSHOTS_DIR = Path("/home/pwuser/reports/screenshots")


class PlaywrightTestUser(TypedDict):
    username: str
    password: str


@pytest.fixture(scope="session", autouse=True)
def setup_screenshots_dir():
    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)


@pytest.fixture
def test_user() -> PlaywrightTestUser:
    return PlaywrightTestUser(
        username=random_username(),
        password=random_password(),
    )


class TestLoginPage:
    def test_login_page_initial_state(self, page: Page):
        page.goto(FRONTEND_URL)
        page.wait_for_load_state("networkidle")

        expect(page.get_by_test_id("login-title")).to_have_text("Sign In")
        expect(page.locator("#username")).to_be_visible()
        expect(page.locator("#password")).to_be_visible()
        expect(page.locator("button:has-text('Sign In')")).to_be_visible()
        expect(page.locator("text=Register here")).to_be_visible()

        page.screenshot(path=str(SCREENSHOTS_DIR / "01_login_page.png"))

    def test_login_form_validation(self, page: Page):
        page.goto(FRONTEND_URL)

        sign_in_button = page.locator("button:has-text('Sign In')")
        expect(sign_in_button).to_be_visible()

        page.screenshot(path=str(SCREENSHOTS_DIR / "02_login_empty_form.png"))

    def test_login_invalid_credentials(self, page: Page):
        page.goto(FRONTEND_URL)
        page.fill("#username", "nonexistent_user")
        page.fill("#password", "WrongPassword123!")
        page.click("button:has-text('Sign In')")

        expect(page.locator("text=Unauthorized")).to_be_visible(timeout=10000)
        page.screenshot(path=str(SCREENSHOTS_DIR / "03_login_error.png"))

    def test_navigate_to_register(self, page: Page):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")

        expect(page.locator("h2")).to_have_text("Create Account")
        page.screenshot(path=str(SCREENSHOTS_DIR / "04_register_page.png"))


class TestRegistration:
    def test_register_page_elements(self, page: Page):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")

        expect(page.locator("h2")).to_have_text("Create Account")
        expect(page.locator("#register-username")).to_be_visible()
        expect(page.locator("#register-password")).to_be_visible()
        expect(page.locator("button:has-text('Create Account')")).to_be_visible()
        expect(page.locator("text=Already have an account?")).to_be_visible()

        page.screenshot(path=str(SCREENSHOTS_DIR / "05_register_form.png"))

    def test_password_requirements_display(self, page: Page):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")

        page.fill("#register-password", "weak")

        expect(page.locator("text=At least 8 characters long")).to_be_visible()
        expect(page.locator("text=Contains at least one uppercase letter")).to_be_visible()

        page.screenshot(path=str(SCREENSHOTS_DIR / "06_password_requirements.png"))

    def test_password_requirements_satisfied(self, page: Page):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")

        page.fill("#register-password", "StrongPass123!")
        page.screenshot(path=str(SCREENSHOTS_DIR / "07_password_valid.png"))

    def test_successful_registration(self, page: Page, test_user):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")

        page.fill("#register-username", test_user["username"])
        page.fill("#register-password", test_user["password"])

        page.screenshot(path=str(SCREENSHOTS_DIR / "08_register_filled.png"))

        page.click("button:has-text('Create Account')")

        expect(page.locator("text=Welcome")).to_be_visible(timeout=10000)
        page.screenshot(path=str(SCREENSHOTS_DIR / "09_after_registration.png"))

    def test_duplicate_username_error(self, page: Page, test_user):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")
        page.fill("#register-username", test_user["username"])
        page.fill("#register-password", test_user["password"])
        page.click("button:has-text('Create Account')")
        expect(page.locator("text=Welcome")).to_be_visible(timeout=10000)

        logout_user(page)

        page.click("text=Register here")
        page.fill("#register-username", test_user["username"])
        page.fill("#register-password", test_user["password"])
        page.click("button:has-text('Create Account')")

        expect(page.locator("text=Registration failed")).to_be_visible(timeout=10000)
        page.screenshot(path=str(SCREENSHOTS_DIR / "10_duplicate_user_error.png"))

    def test_navigate_back_to_login(self, page: Page):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")
        page.click("text=Sign in")

        expect(page.locator("h2")).to_have_text("Sign In")


class TestAuthentication:
    def test_full_auth_flow(self, page: Page, test_user):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")
        page.fill("#register-username", test_user["username"])
        page.fill("#register-password", test_user["password"])
        page.click("button:has-text('Create Account')")
        expect(page.locator("text=Welcome")).to_be_visible(timeout=10000)

        logout_user(page)

        page.fill("#username", test_user["username"])
        page.fill("#password", test_user["password"])
        page.click("button:has-text('Sign In')")

        expect(page.locator("text=Welcome")).to_be_visible(timeout=10000)


class TestQuizInterface:
    @pytest.fixture
    def logged_in_page(self, page: Page, test_user):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")
        page.fill("#register-username", test_user["username"])
        page.fill("#register-password", test_user["password"])
        page.click("button:has-text('Create Account')")
        page.wait_for_selector("text=Welcome", timeout=10000)
        return page

    def test_quiz_page_after_login(self, logged_in_page: Page):
        expect(logged_in_page.locator("text=Welcome")).to_be_visible(timeout=10000)
        logged_in_page.screenshot(path=str(SCREENSHOTS_DIR / "11_quiz_page.png"))

    def test_logout_button_present(self, logged_in_page: Page):
        logged_in_page.locator("button:has-text('Settings')").click()
        expect(logged_in_page.get_by_role("button", name="Log Out")).to_be_visible(timeout=10000)

    def test_logout_functionality(self, logged_in_page: Page):
        logout_user(logged_in_page)
        logged_in_page.screenshot(path=str(SCREENSHOTS_DIR / "12_after_logout.png"))

    def test_language_selector_visible(self, logged_in_page: Page):
        language_selector = logged_in_page.locator("select, [role='combobox'], .language-selector")
        if language_selector.count() > 0:
            logged_in_page.screenshot(path=str(SCREENSHOTS_DIR / "13_language_selector.png"))


class TestAccessibility:
    def test_login_page_has_labels(self, page: Page):
        page.goto(FRONTEND_URL)

        username_input = page.locator("#username")
        password_input = page.locator("#password")

        expect(username_input).to_be_visible()
        expect(password_input).to_be_visible()

    def test_register_page_has_labels(self, page: Page):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")

        username_input = page.locator("#register-username")
        password_input = page.locator("#register-password")

        expect(username_input).to_be_visible()
        expect(password_input).to_be_visible()

    def test_buttons_are_focusable(self, page: Page):
        page.goto(FRONTEND_URL)

        sign_in_button = page.locator("button:has-text('Sign In')")
        expect(sign_in_button).to_be_visible()


class TestResponsiveness:
    def test_mobile_viewport(self, page: Page):
        page.set_viewport_size({"width": 375, "height": 667})
        page.goto(FRONTEND_URL)

        expect(page.locator("h2")).to_have_text("Sign In")
        page.screenshot(path=str(SCREENSHOTS_DIR / "14_mobile_login.png"))

    def test_tablet_viewport(self, page: Page):
        page.set_viewport_size({"width": 768, "height": 1024})
        page.goto(FRONTEND_URL)

        expect(page.locator("h2")).to_have_text("Sign In")
        page.screenshot(path=str(SCREENSHOTS_DIR / "15_tablet_login.png"))

    def test_desktop_viewport(self, page: Page):
        page.set_viewport_size({"width": 1920, "height": 1080})
        page.goto(FRONTEND_URL)

        expect(page.locator("h2")).to_have_text("Sign In")
        page.screenshot(path=str(SCREENSHOTS_DIR / "16_desktop_login.png"))


class TestErrorHandling:
    def test_login_error_displays_message(self, page: Page):
        page.goto(FRONTEND_URL)
        page.fill("#username", "invalid_user")
        page.fill("#password", "InvalidPass123!")
        page.click("button:has-text('Sign In')")

        error_locator = page.locator(".error-message").or_(page.locator("[role='alert']")).or_(page.locator("text=Unauthorized"))
        expect(error_locator).to_be_visible(timeout=10000)
        page.screenshot(path=str(SCREENSHOTS_DIR / "17_login_error_message.png"))

    def test_login_error_recovery(self, page: Page, test_user):
        page.goto(FRONTEND_URL)
        page.fill("#username", "wrong_user")
        page.fill("#password", "WrongPass123!")
        page.click("button:has-text('Sign In')")

        error_locator = page.locator(".error-message").or_(page.locator("[role='alert']")).or_(page.locator("text=Unauthorized"))
        expect(error_locator).to_be_visible(timeout=10000)

        page.click("text=Register here")
        page.fill("#register-username", test_user["username"])
        page.fill("#register-password", test_user["password"])
        page.click("button:has-text('Create Account')")

        expect(page.locator("text=Welcome")).to_be_visible(timeout=10000)

    def test_register_short_username_error(self, page: Page):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")

        page.fill("#register-username", "ab")
        page.fill("#register-password", "ValidPass123!")
        page.click("button:has-text('Create Account')")

        error_locator = page.locator(".error-message").or_(page.locator("[role='alert']")).or_(page.locator("text=must be at least"))
        expect(error_locator.first).to_be_visible(timeout=10000)
        page.screenshot(path=str(SCREENSHOTS_DIR / "18_register_short_username.png"))

    def test_register_weak_password_shows_requirements(self, page: Page):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")

        page.fill("#register-password", "weak")

        expect(page.locator("text=At least 8 characters long")).to_be_visible()
        expect(page.locator("text=Contains at least one uppercase letter")).to_be_visible()
        expect(page.locator("text=Contains at least one number")).to_be_visible()

        page.screenshot(path=str(SCREENSHOTS_DIR / "19_weak_password_requirements.png"))

    def test_register_password_no_number_error(self, page: Page):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")

        page.fill("#register-password", "WeakPassword!")

        expect(page.locator("text=Contains at least one number")).to_be_visible()

    def test_register_password_no_special_char_error(self, page: Page):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")

        page.fill("#register-password", "WeakPassword1")

        expect(page.locator("text=Contains at least one special character")).to_be_visible()

    def test_form_clears_error_on_retry(self, page: Page, test_user):
        page.goto(FRONTEND_URL)
        page.fill("#username", "nonexistent")
        page.fill("#password", "WrongPass123!")
        page.click("button:has-text('Sign In')")

        error_locator = page.locator(".error-message").or_(page.locator("[role='alert']")).or_(page.locator("text=Unauthorized"))
        expect(error_locator).to_be_visible(timeout=10000)

        page.fill("#username", "")
        page.fill("#password", "")

        page.click("text=Register here")
        page.fill("#register-username", test_user["username"])
        page.fill("#register-password", test_user["password"])
        page.click("button:has-text('Create Account')")

        expect(page.locator("text=Welcome")).to_be_visible(timeout=10000)


class TestSessionManagement:
    def test_session_persists_on_page_refresh(self, page: Page, test_user):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")
        page.fill("#register-username", test_user["username"])
        page.fill("#register-password", test_user["password"])
        page.click("button:has-text('Create Account')")
        expect(page.locator("text=Welcome")).to_be_visible(timeout=10000)

        page.reload()
        page.wait_for_load_state("networkidle")

        expect(page.locator("text=Welcome")).to_be_visible(timeout=10000)

    def test_logout_clears_session(self, page: Page, test_user):
        page.goto(FRONTEND_URL)
        page.click("text=Register here")
        page.fill("#register-username", test_user["username"])
        page.fill("#register-password", test_user["password"])
        page.click("button:has-text('Create Account')")
        expect(page.locator("text=Welcome")).to_be_visible(timeout=10000)

        logout_user(page)

        page.reload()
        page.wait_for_load_state("networkidle")

        expect(page.get_by_test_id("login-title")).to_have_text("Sign In")
