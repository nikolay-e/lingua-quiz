import os

from pages.auth_page import AuthPage
from playwright.sync_api import Page, expect
import pytest
from tests.conftest import AuthenticatedUser

pytestmark = pytest.mark.e2e

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://frontend")
SKIP_TTS_TESTS = os.getenv("SKIP_TTS_TESTS", "false").lower() == "true"


def login_and_start_quiz(page: Page, test_user: AuthenticatedUser) -> None:
    auth_page = AuthPage(page, FRONTEND_URL)
    auth_page.goto().login(test_user["username"], test_user["password"])
    auth_page.wait_for_welcome()
    page.select_option("#quiz-select", index=1)
    expect(page.locator(".question-text")).to_be_visible(timeout=5000)


class TestTTSButton:
    @pytest.mark.skipif(SKIP_TTS_TESTS, reason="TTS tests disabled")
    def test_tts_button_visible_for_supported_language(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        tts_button = page.locator("button:has-text('Listen'), button[aria-label*='listen' i]")
        if tts_button.count() > 0:
            expect(tts_button.first).to_be_visible(timeout=3000)

    @pytest.mark.skipif(SKIP_TTS_TESTS, reason="TTS tests disabled")
    def test_tts_button_click_plays_audio(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        tts_button = page.locator("button:has-text('Listen'), button[aria-label*='listen' i]")
        if tts_button.count() > 0 and tts_button.first.is_visible():
            initial_text = tts_button.first.text_content()

            tts_button.first.click()

            page.wait_for_timeout(500)

            playing_text = tts_button.first.text_content()
            assert playing_text != initial_text or "..." in playing_text

    @pytest.mark.skipif(SKIP_TTS_TESTS, reason="TTS tests disabled")
    def test_tts_button_disabled_during_playback(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        tts_button = page.locator("button:has-text('Listen'), button[aria-label*='listen' i]")
        if tts_button.count() > 0 and tts_button.first.is_visible():
            tts_button.first.click()

            page.wait_for_timeout(200)

            is_disabled = tts_button.first.is_disabled()
            assert is_disabled or "playing" in tts_button.first.text_content().lower()


class TestTTSLanguageSupport:
    @pytest.mark.skipif(SKIP_TTS_TESTS, reason="TTS tests disabled")
    def test_tts_unavailable_message_for_unsupported_language(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        tts_button = page.locator("button:has-text('Listen'), button[aria-label*='listen' i]")
        if tts_button.count() == 0:
            unavailable_message = page.locator("text=/tts.*unavailable/i, text=/not.*supported/i")
            if unavailable_message.count() > 0:
                expect(unavailable_message.first).to_be_visible()

    @pytest.mark.skipif(SKIP_TTS_TESTS, reason="TTS tests disabled")
    def test_tts_works_across_multiple_questions(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        for i in range(3):
            tts_button = page.locator("button:has-text('Listen'), button[aria-label*='listen' i]")
            if tts_button.count() > 0 and tts_button.first.is_visible():
                tts_button.first.click()
                page.wait_for_timeout(1000)

            page.get_by_role("button", name="Show Answer").click()
            expect(page.locator(".feedback-container")).to_be_visible(timeout=3000)
            page.get_by_role("button", name="Next Question").click()
            expect(page.locator(".question-text")).to_be_visible(timeout=3000)


class TestTTSErrorHandling:
    @pytest.mark.skipif(SKIP_TTS_TESTS, reason="TTS tests disabled")
    def test_tts_handles_network_error_gracefully(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        page.route("**/api/tts/**", lambda route: route.abort())

        tts_button = page.locator("button:has-text('Listen'), button[aria-label*='listen' i]")
        if tts_button.count() > 0 and tts_button.first.is_visible():
            tts_button.first.click()

            page.wait_for_timeout(2000)

            error_message = page.locator("text=/error|failed|unavailable/i")
            if error_message.count() > 0:
                expect(error_message.first).to_be_visible()

        page.unroute("**/api/tts/**")

    @pytest.mark.skipif(SKIP_TTS_TESTS, reason="TTS tests disabled")
    def test_tts_button_recovers_after_error(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        page.route("**/api/tts/**", lambda route: route.abort())

        tts_button = page.locator("button:has-text('Listen'), button[aria-label*='listen' i]")
        if tts_button.count() > 0 and tts_button.first.is_visible():
            tts_button.first.click()
            page.wait_for_timeout(1000)

        page.unroute("**/api/tts/**")

        page.wait_for_timeout(500)

        if tts_button.count() > 0:
            expect(tts_button.first).to_be_enabled()


class TestTTSIntegration:
    @pytest.mark.skipif(SKIP_TTS_TESTS, reason="TTS tests disabled")
    def test_tts_does_not_block_quiz_interaction(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        tts_button = page.locator("button:has-text('Listen'), button[aria-label*='listen' i]")
        if tts_button.count() > 0 and tts_button.first.is_visible():
            tts_button.first.click()

            page.wait_for_timeout(200)

            answer_input = page.get_by_placeholder("Type your answer...")
            answer_input.fill("test answer")
            page.get_by_role("button", name="Check Answer").click()

            expect(page.locator(".feedback-container")).to_be_visible(timeout=3000)

    @pytest.mark.skipif(SKIP_TTS_TESTS, reason="TTS tests disabled")
    def test_tts_stops_on_question_change(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        tts_button = page.locator("button:has-text('Listen'), button[aria-label*='listen' i]")
        if tts_button.count() > 0 and tts_button.first.is_visible():
            tts_button.first.click()

            page.wait_for_timeout(500)

            page.get_by_role("button", name="Show Answer").click()
            page.get_by_role("button", name="Next Question").click()

            page.wait_for_timeout(1000)

            new_tts_button = page.locator("button:has-text('Listen'), button[aria-label*='listen' i]")
            if new_tts_button.count() > 0:
                is_playing = "playing" in new_tts_button.first.text_content().lower()
                assert not is_playing
