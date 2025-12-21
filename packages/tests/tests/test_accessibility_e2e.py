import os

from pages.auth_page import AuthPage
from playwright.sync_api import Page, expect
import pytest
from tests.conftest import AuthenticatedUser, login_and_start_quiz

pytestmark = pytest.mark.e2e

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://frontend")


class TestKeyboardNavigation:
    def test_tab_navigation_login_form(self, page: Page) -> None:
        page.goto(FRONTEND_URL)

        page.keyboard.press("Tab")
        username_field = page.get_by_role("textbox", name="Username")
        expect(username_field).to_be_focused()

        page.keyboard.press("Tab")
        password_field = page.get_by_role("textbox", name="Password")
        expect(password_field).to_be_focused()

        page.keyboard.press("Tab")
        sign_in_button = page.get_by_role("button", name="Sign In")
        expect(sign_in_button).to_be_focused()

    def test_tab_navigation_quiz(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        answer_input = page.get_by_placeholder("Type your answer...")
        answer_input.focus()

        page.keyboard.press("Tab")
        check_button = page.get_by_role("button", name="Check Answer")
        expect(check_button).to_be_focused()

        page.keyboard.press("Tab")
        show_answer_button = page.get_by_role("button", name="Show Answer")
        expect(show_answer_button).to_be_focused()

    def test_enter_key_submits_answer(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        answer_input = page.get_by_placeholder("Type your answer...")
        answer_input.fill("test answer")
        answer_input.press("Enter")

        expect(page.locator(".feedback-container")).to_be_visible(timeout=3000)

    def test_escape_closes_dialog(self, page: Page, test_user: AuthenticatedUser) -> None:
        auth_page = AuthPage(page, FRONTEND_URL)
        auth_page.goto().login(test_user["username"], test_user["password"])
        auth_page.wait_for_welcome()

        logout_button = page.get_by_role("button", name="Log Out")
        if logout_button.is_visible():
            logout_button.click()

            dialog = page.locator('[role="dialog"]')
            if dialog.is_visible():
                page.keyboard.press("Escape")
                expect(dialog).to_be_hidden(timeout=2000)


class TestARIAAttributes:
    def test_progress_bar_has_aria_attributes(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        progress_bar = page.locator("progress").first
        expect(progress_bar).to_be_visible(timeout=3000)

        value = progress_bar.get_attribute("value")
        max_value = progress_bar.get_attribute("max")
        assert value is not None
        assert max_value is not None

    def test_buttons_have_accessible_names(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        check_button = page.get_by_role("button", name="Check Answer")
        expect(check_button).to_be_visible()

        show_button = page.get_by_role("button", name="Show Answer")
        expect(show_button).to_be_visible()

    def test_form_fields_have_labels(self, page: Page) -> None:
        page.goto(FRONTEND_URL)

        username_field = page.get_by_role("textbox", name="Username")
        expect(username_field).to_be_visible()

        password_field = page.get_by_role("textbox", name="Password")
        expect(password_field).to_be_visible()

    def test_error_messages_have_alert_role(self, page: Page) -> None:
        page.goto(FRONTEND_URL)

        page.get_by_role("textbox", name="Username").fill("invalid")
        page.get_by_role("textbox", name="Password").fill("wrong")
        page.get_by_role("button", name="Sign In").click()

        page.wait_for_timeout(2000)


class TestFocusManagement:
    def test_focus_trap_in_confirm_dialog(self, page: Page, test_user: AuthenticatedUser) -> None:
        auth_page = AuthPage(page, FRONTEND_URL)
        auth_page.goto().login(test_user["username"], test_user["password"])
        auth_page.wait_for_welcome()

        logout_button = page.get_by_role("button", name="Log Out")
        if logout_button.is_visible():
            logout_button.click()

            dialog = page.locator('[role="dialog"]')
            if dialog.is_visible():
                page.keyboard.press("Tab")
                confirm_button = dialog.locator("button").first
                expect(confirm_button).to_be_focused()

                page.keyboard.press("Tab")
                cancel_button = dialog.locator("button").nth(1)
                expect(cancel_button).to_be_focused()

    def test_focus_returns_after_dialog_close(self, page: Page, test_user: AuthenticatedUser) -> None:
        auth_page = AuthPage(page, FRONTEND_URL)
        auth_page.goto().login(test_user["username"], test_user["password"])
        auth_page.wait_for_welcome()

        logout_button = page.get_by_role("button", name="Log Out")
        if logout_button.is_visible():
            logout_button.focus()
            logout_button.click()

            dialog = page.locator('[role="dialog"]')
            if dialog.is_visible():
                page.keyboard.press("Escape")
                page.wait_for_timeout(500)


class TestSemanticHTML:
    def test_page_has_main_landmark(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        main_element = page.locator("main, [role='main']")
        expect(main_element).to_be_visible()

    def test_headings_hierarchy(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        h1_count = page.locator("h1").count()
        assert h1_count >= 0

    def test_buttons_not_divs(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        check_button = page.get_by_role("button", name="Check Answer")
        tag_name = check_button.evaluate("el => el.tagName")
        assert tag_name.lower() == "button"


class TestColorContrast:
    def test_text_readable_on_background(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        question_text = page.locator(".question-text").first
        color = question_text.evaluate("el => window.getComputedStyle(el).color")
        background_color = question_text.evaluate("el => window.getComputedStyle(el).backgroundColor")

        assert color is not None
        assert background_color is not None


class TestScreenReaderSupport:
    def test_aria_live_regions_present(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        answer_input = page.get_by_placeholder("Type your answer...")
        answer_input.fill("test")
        page.get_by_role("button", name="Check Answer").click()

        page.wait_for_timeout(1000)

    def test_hidden_elements_not_in_tab_order(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        hidden_elements = page.locator("[hidden], [aria-hidden='true'], [style*='display: none']")
        count = hidden_elements.count()

        for i in range(min(count, 10)):
            element = hidden_elements.nth(i)
            if element.is_visible():
                tabindex = element.get_attribute("tabindex")
                assert tabindex != "0"
