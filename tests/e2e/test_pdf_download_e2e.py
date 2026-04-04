"""E2E tests for PDF download functionality."""

import os

from conftest import AuthenticatedUser, login_user, navigate_to_quiz
from pages.quiz_page import QuizPage
from playwright.sync_api import Page, expect
import pytest

pytestmark = pytest.mark.e2e

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://frontend")


class TestPdfDownload:
    def test_pdf_buttons_appear_after_course_selection(
        self, page: Page, test_user: AuthenticatedUser, quiz_page: QuizPage
    ) -> None:
        """PDF download buttons should appear on quiz page after selecting language and level."""
        login_user(page, test_user["username"], test_user["password"])

        # Navigate to quiz page and select a course
        navigate_to_quiz(page)
        expect(quiz_page.selector_triggers.first).to_be_visible(timeout=5000)
        for i in range(3):
            quiz_page.selector_triggers.nth(i).click()
            page.locator('[role="option"]').first.click()
            page.wait_for_timeout(200)

        # PDF buttons should be visible right after selection (before starting quiz)
        pdf_button = page.get_by_role("button", name="Download PDF")
        pdf_examples_button = page.get_by_role("button", name="PDF with Examples")

        expect(pdf_button).to_be_visible(timeout=3000)
        expect(pdf_examples_button).to_be_visible(timeout=3000)

    def test_pdf_buttons_hidden_without_selection(
        self, page: Page, test_user: AuthenticatedUser
    ) -> None:
        """PDF buttons should not be visible when no course is selected."""
        login_user(page, test_user["username"], test_user["password"])

        navigate_to_quiz(page)
        # Without completing all 3 selectors, PDF buttons should not exist
        pdf_button = page.get_by_role("button", name="Download PDF")
        expect(pdf_button).to_have_count(0)

    def test_pdf_download_triggers(
        self, page: Page, test_user: AuthenticatedUser, quiz_page: QuizPage
    ) -> None:
        """Clicking PDF download should trigger a file download."""
        login_user(page, test_user["username"], test_user["password"])

        # Select course via quiz page
        navigate_to_quiz(page)
        expect(quiz_page.selector_triggers.first).to_be_visible(timeout=5000)
        for i in range(3):
            quiz_page.selector_triggers.nth(i).click()
            page.locator('[role="option"]').first.click()
            page.wait_for_timeout(200)

        pdf_button = page.get_by_role("button", name="Download PDF")
        expect(pdf_button).to_be_visible(timeout=3000)

        # Listen for download event
        with page.expect_download(timeout=30000) as download_info:
            pdf_button.click()

        download = download_info.value
        assert download.suggested_filename.endswith(".pdf"), (
            f"Expected .pdf file, got: {download.suggested_filename}"
        )


class TestPdfFontAvailable:
    def test_roboto_font_is_served(self, web_session) -> None:
        """Roboto TTF font should be accessible from the app's own server."""
        from conftest import FRONTEND_URL

        response = web_session.get(f"{FRONTEND_URL}/fonts/Roboto-Regular.ttf")
        assert response.status_code == 200, (
            f"Font file returned {response.status_code}, expected 200"
        )
        assert len(response.content) > 100000, (
            f"Font file too small ({len(response.content)} bytes), likely not a real font"
        )


class TestAppLoadsWithoutErrors:
    def test_no_module_import_errors(self, page: Page) -> None:
        """App should load without 'Importing a module script failed' errors."""
        errors = []

        def capture_error(err):
            errors.append(str(err))

        page.on("pageerror", capture_error)
        page.goto(FRONTEND_URL)
        page.wait_for_load_state("networkidle", timeout=15000)

        module_errors = [e for e in errors if "module" in e.lower() or "import" in e.lower()]
        assert len(module_errors) == 0, (
            f"Module import errors detected on page load: {module_errors}"
        )

    def test_app_renders_login_or_home(self, page: Page) -> None:
        """App should render either login page or home page without crashing."""
        page.goto(FRONTEND_URL)
        page.wait_for_load_state("networkidle", timeout=15000)

        # Should not show the React error boundary
        error_text = page.locator("text=Unexpected Application Error")
        expect(error_text).to_have_count(0)

        # Should show either login or home page content
        page_has_content = (
            page.locator("text=Sign In").count() > 0
            or page.locator("text=Learn Words").count() > 0
        )
        assert page_has_content, "App did not render any expected content"
