import re

from conftest import AuthenticatedUser, login_and_start_quiz, login_user
from pages.quiz_page import QuizPage
from playwright.sync_api import Page, expect
import pytest

pytestmark = pytest.mark.e2e


class TestQuizFlowE2E:
    def test_quiz_selection_and_display(self, page: Page, test_user: AuthenticatedUser, quiz_page: QuizPage) -> None:
        login_and_start_quiz(page, test_user)
        quiz_page.expect_question_visible()

    def test_answer_submission(self, page: Page, test_user: AuthenticatedUser, quiz_page: QuizPage) -> None:
        login_and_start_quiz(page, test_user)
        quiz_page.answer_and_check("test answer")
        quiz_page.expect_feedback_visible()

    def test_next_question_flow(self, page: Page, test_user: AuthenticatedUser, quiz_page: QuizPage) -> None:
        login_and_start_quiz(page, test_user)

        for _ in range(3):
            quiz_page.answer_and_check("test")
            quiz_page.expect_feedback_visible()
            quiz_page.advance_to_next()

    def test_skip_answer(self, page: Page, test_user: AuthenticatedUser, quiz_page: QuizPage) -> None:
        login_and_start_quiz(page, test_user)
        quiz_page.click_dont_know()
        quiz_page.expect_feedback_visible()

    def test_back_to_menu(self, page: Page, test_user: AuthenticatedUser, quiz_page: QuizPage) -> None:
        login_and_start_quiz(page, test_user)
        quiz_page.click_back_to_menu()
        quiz_page.expect_welcome_visible(timeout=3000)

    def test_correct_answer_shows_success(self, page: Page, test_user: AuthenticatedUser, quiz_page: QuizPage) -> None:
        login_and_start_quiz(page, test_user)

        assert quiz_page.question_text.text_content()

        quiz_page.click_dont_know()
        _correct_answer = quiz_page.feedback_container.text_content()

        quiz_page.advance_to_next()

    def test_multiple_quiz_sessions(self, page: Page, test_user: AuthenticatedUser, quiz_page: QuizPage) -> None:
        login_and_start_quiz(page, test_user)
        _first_question = quiz_page.question_text.text_content()

        quiz_page.click_back_to_menu()
        quiz_page.expect_welcome_visible(timeout=3000)

        quiz_page.select_cascading_and_start()

    def test_answer_input_clears_after_submit(self, page: Page, test_user: AuthenticatedUser, quiz_page: QuizPage) -> None:
        login_and_start_quiz(page, test_user)

        quiz_page.answer_and_check("my answer")
        quiz_page.expect_feedback_visible()
        expect(quiz_page.answer_input).to_have_value("")

    def test_keyboard_submit(self, page: Page, test_user: AuthenticatedUser, quiz_page: QuizPage) -> None:
        login_and_start_quiz(page, test_user)

        quiz_page.fill_answer("keyboard test")
        quiz_page.submit_answer()
        quiz_page.expect_feedback_visible(timeout=10000)


class TestProgressPersistence:
    def test_progress_saved_between_sessions(self, page: Page, test_user: AuthenticatedUser, quiz_page: QuizPage) -> None:
        login_and_start_quiz(page, test_user)

        for _ in range(3):
            quiz_page.answer_and_check("test")
            quiz_page.expect_feedback_visible()
            quiz_page.fill_answer("")
            page.wait_for_timeout(500)

        page.wait_for_timeout(1500)

        quiz_page.click_back_to_menu()
        quiz_page.expect_welcome_visible(timeout=3000)
        quiz_page.click_settings()
        quiz_page.click_logout()
        quiz_page.expect_sign_in_visible()

        login_user(page, test_user["username"], test_user["password"])


class TestQuizListSelection:
    def test_cascading_selectors_populated(self, page: Page, test_user: AuthenticatedUser, quiz_page: QuizPage) -> None:
        login_user(page, test_user["username"], test_user["password"])

        expect(quiz_page.selector_triggers.first).to_be_visible(timeout=5000)

        quiz_page.selector_triggers.nth(0).click()
        options = page.locator('[role="option"]')
        expect(options.first).to_be_visible(timeout=3000)
        assert options.count() >= 1

    def test_cascading_selectors_flow(self, page: Page, test_user: AuthenticatedUser, quiz_page: QuizPage) -> None:
        login_user(page, test_user["username"], test_user["password"])

        expect(quiz_page.selector_triggers.first).to_be_visible(timeout=5000)

        quiz_page.selector_triggers.nth(0).click()
        page.locator('[role="option"]').first.click()
        page.wait_for_timeout(200)

        quiz_page.selector_triggers.nth(1).click()
        options = page.locator('[role="option"]')
        expect(options.first).to_be_visible(timeout=3000)
        assert options.count() >= 1
        options.first.click()
        page.wait_for_timeout(200)

        quiz_page.selector_triggers.nth(2).click()
        level_options = page.locator('[role="option"]')
        expect(level_options.first).to_be_visible(timeout=3000)
        assert level_options.count() >= 1


class TestRevealAnswerBehavior:
    def test_i_dont_know_counts_as_incorrect(self, page: Page, test_user: AuthenticatedUser, quiz_page: QuizPage) -> None:
        login_and_start_quiz(page, test_user)

        for _ in range(10):
            quiz_page.click_dont_know()
            expect(quiz_page.revealed_feedback).to_be_visible(timeout=3000)
            quiz_page.advance_to_next()

        quiz_page.expect_question_visible()

        level0_summary = quiz_page.get_level_summary("level0")
        expect(level0_summary).to_be_visible()
        level0_text = level0_summary.text_content()
        assert level0_text and re.search(r"\(\d+\)", level0_text), "LEVEL_0 should display word count after repeated reveals."

    def test_i_dont_know_displays_revealed_feedback_style(self, page: Page, test_user: AuthenticatedUser, quiz_page: QuizPage) -> None:
        login_and_start_quiz(page, test_user)

        quiz_page.click_dont_know()
        quiz_page.expect_feedback_visible()
        expect(quiz_page.revealed_feedback).to_be_visible()

    def test_i_dont_know_then_check_answer_different_behavior(self, page: Page, test_user: AuthenticatedUser, quiz_page: QuizPage) -> None:
        login_and_start_quiz(page, test_user)

        quiz_page.click_dont_know()
        quiz_page.expect_feedback_visible()
        expect(quiz_page.revealed_feedback).to_be_visible()

        quiz_page.fill_answer("wrong answer")
        quiz_page.expect_question_visible()

        quiz_page.click_check_answer()
        quiz_page.expect_feedback_visible()
        expect(quiz_page.error_feedback).to_be_visible()

    def test_word_variety_in_queue(self, page: Page, test_user: AuthenticatedUser, quiz_page: QuizPage) -> None:
        login_and_start_quiz(page, test_user)

        unique_questions: set[str] = set()
        iterations = 30

        for _ in range(iterations):
            question_text = quiz_page.question_text.text_content()
            if question_text:
                unique_questions.add(question_text.strip())

            quiz_page.click_dont_know()
            quiz_page.expect_feedback_visible()
            quiz_page.advance_to_next()

        min_expected_unique_words = 10
        assert len(unique_questions) >= min_expected_unique_words, (
            f"Expected at least {min_expected_unique_words} unique words in {iterations} iterations, "
            f"but only saw {len(unique_questions)} unique words. "
            f"This suggests the queue is only cycling through a small subset of words."
        )
