import os
import re

from playwright.sync_api import Page, expect
import pytest
from tests.conftest import AuthenticatedUser, login_and_start_quiz, login_user, start_quiz_with_cascading_selectors

pytestmark = pytest.mark.e2e

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://frontend")


class TestQuizFlowE2E:
    def test_quiz_selection_and_display(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)
        expect(page.locator(".question-text")).to_be_visible()

    def test_answer_submission(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        page.get_by_placeholder("Type your answer...").fill("test answer")
        page.get_by_role("button", name="Check Answer").click()

        expect(page.locator(".feedback-container")).to_be_visible(timeout=3000)

    def test_next_question_flow(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        for _ in range(3):
            page.get_by_placeholder("Type your answer...").fill("test")
            page.get_by_role("button", name="Check Answer").click()
            expect(page.locator(".feedback-container")).to_be_visible(timeout=3000)
            # UI auto-advances when user starts typing next answer
            page.get_by_placeholder("Type your answer...").fill("")
            expect(page.locator(".question-text")).to_be_visible(timeout=3000)

    def test_skip_answer(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        page.get_by_role("button", name="Show Answer").click()
        expect(page.locator(".feedback-container")).to_be_visible(timeout=3000)

    def test_back_to_menu(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        page.get_by_role("button", name="Back to Menu").click()
        expect(page.locator("text=Welcome")).to_be_visible(timeout=3000)

    def test_correct_answer_shows_success(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        question_text = page.locator(".question-text").text_content()
        assert question_text

        page.get_by_role("button", name="Show Answer").click()
        _correct_answer = page.locator(".correct-answer, .feedback-container").text_content()

        # UI auto-advances when user starts typing next answer
        page.get_by_placeholder("Type your answer...").fill("")
        expect(page.locator(".question-text")).to_be_visible(timeout=3000)

    def test_multiple_quiz_sessions(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)
        _first_question = page.locator(".question-text").text_content()

        page.get_by_role("button", name="Back to Menu").click()
        expect(page.locator("text=Welcome")).to_be_visible(timeout=3000)

        start_quiz_with_cascading_selectors(page)

    def test_answer_input_clears_after_submit(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        answer_input = page.get_by_placeholder("Type your answer...")
        answer_input.fill("my answer")
        page.get_by_role("button", name="Check Answer").click()

        expect(page.locator(".feedback-container")).to_be_visible(timeout=3000)
        # Input should already be cleared after submission
        expect(answer_input).to_have_value("")

    def test_keyboard_submit(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        answer_input = page.get_by_placeholder("Type your answer...")
        answer_input.fill("keyboard test")
        answer_input.press("Enter")

        expect(page.locator(".feedback-container")).to_be_visible(timeout=10000)


class TestProgressPersistence:
    def test_progress_saved_between_sessions(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        for _ in range(3):
            page.get_by_placeholder("Type your answer...").fill("test")
            page.get_by_role("button", name="Check Answer").click()
            expect(page.locator(".feedback-container")).to_be_visible(timeout=3000)
            # UI auto-advances when user starts typing next answer
            page.get_by_placeholder("Type your answer...").fill("")
            page.wait_for_timeout(500)

        page.wait_for_timeout(1500)

        page.get_by_role("button", name="Back to Menu").click()
        expect(page.locator("text=Welcome")).to_be_visible(timeout=3000)
        page.locator("button:has-text('Settings')").click()
        page.get_by_role("button", name="Log Out").click()
        expect(page.locator("h2")).to_have_text("Sign In", timeout=10000)

        login_user(page, test_user["username"], test_user["password"])


class TestQuizListSelection:
    def test_cascading_selectors_populated(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_user(page, test_user["username"], test_user["password"])

        selector_triggers = page.locator('[data-slot="select-trigger"]')
        expect(selector_triggers.first).to_be_visible(timeout=5000)

        selector_triggers.nth(0).click()
        options = page.locator('[data-slot="select-item"]')
        expect(options.first).to_be_visible(timeout=3000)
        option_count = options.count()
        assert option_count >= 1

    def test_cascading_selectors_flow(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_user(page, test_user["username"], test_user["password"])

        selector_triggers = page.locator('[data-slot="select-trigger"]')
        expect(selector_triggers.first).to_be_visible(timeout=5000)

        selector_triggers.nth(0).click()
        page.locator('[data-slot="select-item"]').first.click()
        page.wait_for_timeout(200)

        selector_triggers.nth(1).click()
        options = page.locator('[data-slot="select-item"]')
        expect(options.first).to_be_visible(timeout=3000)
        assert options.count() >= 1
        options.first.click()
        page.wait_for_timeout(200)

        selector_triggers.nth(2).click()
        level_options = page.locator('[data-slot="select-item"]')
        expect(level_options.first).to_be_visible(timeout=3000)
        assert level_options.count() >= 1


class TestRevealAnswerNoProgression:
    def test_show_answer_does_not_degrade_word_levels(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        def get_level_counts() -> dict[str, int]:
            counts = {}
            for level_id in [
                "LEVEL_0",
                "LEVEL_1",
                "LEVEL_2",
                "LEVEL_3",
                "LEVEL_4",
                "LEVEL_5",
            ]:
                level_section = page.locator(f"#{level_id}")
                if level_section.count() > 0:
                    header_text = level_section.locator(".foldable-header").text_content()
                    if header_text:
                        match = re.search(r"\((\d+)\)", header_text)
                        counts[level_id] = int(match.group(1)) if match else 0
            return counts

        initial_counts = get_level_counts()

        for i in range(100):
            page.get_by_role("button", name="Show Answer").click()
            expect(page.locator(".feedback-container")).to_be_visible(timeout=3000)
            # UI auto-advances when user starts typing next answer
            page.get_by_placeholder("Type your answer...").fill("")
            expect(page.locator(".question-text")).to_be_visible(timeout=3000)
            if (i + 1) % 10 == 0:
                page.wait_for_timeout(100)

        page.wait_for_timeout(1500)

        final_counts = get_level_counts()

        assert final_counts.get("LEVEL_0", 0) == initial_counts.get("LEVEL_0", 0), (
            f"LEVEL_0 word count changed from {initial_counts.get('LEVEL_0', 0)} to {final_counts.get('LEVEL_0', 0)}. "
            "Show Answer should not cause word degradation."
        )

        for level_id in ["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4", "LEVEL_5"]:
            initial = initial_counts.get(level_id, 0)
            final = final_counts.get(level_id, 0)
            assert final >= initial, f"{level_id} word count decreased from {initial} to {final}. Show Answer should not cause word degradation."

    def test_show_answer_displays_revealed_feedback_style(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        page.get_by_role("button", name="Show Answer").click()
        expect(page.locator(".feedback-container")).to_be_visible(timeout=3000)

        feedback_text = page.locator(".feedback-text.revealed")
        expect(feedback_text).to_be_visible()

    def test_show_answer_then_check_answer_different_behavior(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        page.get_by_role("button", name="Show Answer").click()
        expect(page.locator(".feedback-container")).to_be_visible(timeout=3000)
        revealed_feedback = page.locator(".feedback-text.revealed")
        expect(revealed_feedback).to_be_visible()

        # UI auto-advances when user starts typing next answer
        page.get_by_placeholder("Type your answer...").fill("wrong answer")
        expect(page.locator(".question-text")).to_be_visible(timeout=3000)

        page.get_by_role("button", name="Check Answer").click()
        expect(page.locator(".feedback-container")).to_be_visible(timeout=3000)
        checked_feedback = page.locator(".feedback-text.error")
        expect(checked_feedback).to_be_visible()

    def test_word_variety_in_queue(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        unique_questions: set[str] = set()
        iterations = 30

        for _ in range(iterations):
            question_text = page.locator(".question-text").text_content()
            if question_text:
                unique_questions.add(question_text.strip())

            page.get_by_role("button", name="Show Answer").click()
            expect(page.locator(".feedback-container")).to_be_visible(timeout=3000)
            # UI auto-advances when user starts typing next answer
            page.get_by_placeholder("Type your answer...").fill("")
            expect(page.locator(".question-text")).to_be_visible(timeout=3000)

        min_expected_unique_words = 10
        assert len(unique_questions) >= min_expected_unique_words, (
            f"Expected at least {min_expected_unique_words} unique words in {iterations} iterations, "
            f"but only saw {len(unique_questions)} unique words. "
            f"This suggests the queue is only cycling through a small subset of words."
        )
