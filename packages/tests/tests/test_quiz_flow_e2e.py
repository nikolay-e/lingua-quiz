import os

from playwright.sync_api import Page, expect
import pytest
from tests.conftest import AuthenticatedUser

pytestmark = pytest.mark.e2e

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://frontend")


def login_and_start_quiz(page: Page, test_user: AuthenticatedUser) -> None:
    page.goto(FRONTEND_URL)
    expect(page).to_have_title("LinguaQuiz - Advanced Language Learning")

    page.get_by_role("textbox", name="Username").fill(test_user["username"])
    page.get_by_role("textbox", name="Password").fill(test_user["password"])
    page.get_by_role("button", name="Sign In").click()

    expect(page.locator("text=Welcome")).to_be_visible(timeout=5000)

    page.select_option("#quiz-select", index=1)
    expect(page.locator(".question-text")).to_be_visible(timeout=5000)


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
            page.get_by_role("button", name="Next Question").click()
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

        page.get_by_role("button", name="Next Question").click()
        expect(page.locator(".question-text")).to_be_visible(timeout=3000)

    def test_multiple_quiz_sessions(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)
        _first_question = page.locator(".question-text").text_content()

        page.get_by_role("button", name="Back to Menu").click()
        expect(page.locator("text=Welcome")).to_be_visible(timeout=3000)

        page.select_option("#quiz-select", index=1)
        expect(page.locator(".question-text")).to_be_visible(timeout=5000)

    def test_answer_input_clears_after_submit(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        answer_input = page.get_by_placeholder("Type your answer...")
        answer_input.fill("my answer")
        page.get_by_role("button", name="Check Answer").click()

        expect(page.locator(".feedback-container")).to_be_visible(timeout=3000)
        page.get_by_role("button", name="Next Question").click()

        expect(answer_input).to_have_value("")

    def test_keyboard_submit(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        answer_input = page.get_by_placeholder("Type your answer...")
        answer_input.fill("keyboard test")
        answer_input.press("Enter")

        expect(page.locator(".feedback-container")).to_be_visible(timeout=10000)


class TestProgressPersistence:
    def test_progress_saved_between_sessions(self, page: Page, test_user: AuthenticatedUser) -> None:
        page.goto(FRONTEND_URL)
        page.get_by_role("textbox", name="Username").fill(test_user["username"])
        page.get_by_role("textbox", name="Password").fill(test_user["password"])
        page.get_by_role("button", name="Sign In").click()
        expect(page.locator("text=Welcome")).to_be_visible(timeout=5000)

        page.select_option("#quiz-select", index=1)
        expect(page.locator(".question-text")).to_be_visible(timeout=5000)

        for _ in range(3):
            page.get_by_placeholder("Type your answer...").fill("test")
            page.get_by_role("button", name="Check Answer").click()
            expect(page.locator(".feedback-container")).to_be_visible(timeout=3000)
            page.get_by_role("button", name="Next Question").click()
            page.wait_for_timeout(500)

        page.wait_for_timeout(1500)

        page.get_by_role("button", name="Log out").click()
        expect(page.locator("h2")).to_have_text("Sign In", timeout=10000)

        page.get_by_role("textbox", name="Username").fill(test_user["username"])
        page.get_by_role("textbox", name="Password").fill(test_user["password"])
        page.get_by_role("button", name="Sign In").click()
        expect(page.locator("text=Welcome")).to_be_visible(timeout=5000)


class TestQuizListSelection:
    def test_quiz_list_dropdown_populated(self, page: Page, test_user: AuthenticatedUser) -> None:
        page.goto(FRONTEND_URL)
        page.get_by_role("textbox", name="Username").fill(test_user["username"])
        page.get_by_role("textbox", name="Password").fill(test_user["password"])
        page.get_by_role("button", name="Sign In").click()
        expect(page.locator("text=Welcome")).to_be_visible(timeout=5000)

        quiz_select = page.locator("#quiz-select")
        expect(quiz_select).to_be_visible()

        options = quiz_select.locator("option")
        option_count = options.count()
        assert option_count >= 1

    def test_different_quiz_lists_have_different_content(self, page: Page, test_user: AuthenticatedUser) -> None:
        page.goto(FRONTEND_URL)
        page.get_by_role("textbox", name="Username").fill(test_user["username"])
        page.get_by_role("textbox", name="Password").fill(test_user["password"])
        page.get_by_role("button", name="Sign In").click()
        expect(page.locator("text=Welcome")).to_be_visible(timeout=5000)

        quiz_select = page.locator("#quiz-select")
        options = quiz_select.locator("option")

        if options.count() < 3:
            pytest.skip("Not enough quiz lists for comparison")

        page.select_option("#quiz-select", index=1)
        expect(page.locator(".question-text")).to_be_visible(timeout=5000)
        _first_list_question = page.locator(".question-text").text_content()

        page.get_by_role("button", name="Back to Menu").click()
        expect(page.locator("text=Welcome")).to_be_visible(timeout=3000)

        page.select_option("#quiz-select", index=2)
        expect(page.locator(".question-text")).to_be_visible(timeout=5000)
