from playwright.sync_api import Locator, expect

from .base_page import BasePage


class QuizPage(BasePage):
    @property
    def question_text(self) -> Locator:
        return self.page.locator(".question-text")

    @property
    def feedback_container(self) -> Locator:
        return self.page.locator(".feedback-container")

    @property
    def answer_input(self) -> Locator:
        return self.page.get_by_placeholder("Type your answer...")

    @property
    def revealed_feedback(self) -> Locator:
        return self.page.locator(".feedback-text.revealed")

    @property
    def error_feedback(self) -> Locator:
        return self.page.locator(".feedback-text.error")

    @property
    def selector_triggers(self) -> Locator:
        return self.page.locator('[data-slot="select"]')

    def click_check_answer(self):
        self.page.get_by_role("button", name="Check Answer").click()
        return self

    def click_dont_know(self):
        self.page.get_by_role("button", name="I Don't Know").click()
        return self

    def click_back_to_menu(self):
        self.page.get_by_role("button", name="Back to Menu").click()
        return self

    def click_learn_words(self):
        self.page.get_by_role("button", name="Learn Words").click()
        return self

    def click_settings(self):
        self.page.get_by_role("button", name="Settings").click()
        return self

    def click_logout(self):
        self.page.get_by_role("button", name="Log Out").click()
        return self

    def get_level_summary(self, level_id: str) -> Locator:
        return self.page.locator(f"#{level_id} summary")

    def fill_answer(self, answer: str):
        self.answer_input.fill(answer)
        return self

    def submit_answer(self):
        self.page.keyboard.press("Enter")
        return self

    def answer_and_check(self, answer: str):
        self.fill_answer(answer)
        self.click_check_answer()
        return self

    def select_cascading_and_start(self):
        expect(self.selector_triggers.first).to_be_visible(timeout=5000)
        for i in range(3):
            self.selector_triggers.nth(i).click()
            self.page.locator('[role="option"]').first.click()
            self.page.wait_for_timeout(200)
        self.click_start_learning()
        self.expect_question_visible()
        self.ensure_typing_mode()
        return self

    def ensure_typing_mode(self):
        toggle = self.page.get_by_role("button", name="Switch to typing")
        if toggle.count() > 0 and toggle.is_visible():
            toggle.click()
            self.page.wait_for_timeout(300)
        return self

    def click_start_learning(self):
        self.page.get_by_role("button", name="Start Learning").click()
        return self

    def advance_to_next(self, timeout: int = 3000):
        self.answer_input.fill("")
        self.expect_question_visible(timeout=timeout)
        return self

    def expect_question_visible(self, timeout: int = 5000):
        expect(self.question_text).to_be_visible(timeout=timeout)
        return self

    def expect_feedback_visible(self, timeout: int = 3000):
        expect(self.feedback_container).to_be_visible(timeout=timeout)
        return self

    def expect_welcome_visible(self, timeout: int = 5000):
        expect(self.page.locator("text=Learn Words")).to_be_visible(timeout=timeout)
        return self

    def expect_sign_in_visible(self, timeout: int = 10000):
        expect(self.page.locator("h2")).to_have_text("Sign In", timeout=timeout)
        return self

    def click_start_practice(self):
        self.page.get_by_role("button", name="Start Practice").first.click()
        return self

    def wait_for_question(self, timeout: int = 5000):
        expect(self.page.locator("text=Question")).to_be_visible(timeout=timeout)
        return self

    def answer_question(self, answer: str, delay_ms: int = 500):
        self.fill_answer(answer)
        self.submit_answer()
        self.page.wait_for_timeout(delay_ms)
        return self

    def click_menu(self):
        self.page.get_by_role("button", name="Menu").click()
        return self

    def click_end_session(self):
        self.page.get_by_role("button", name="End Session").click()
        return self

    def end_session(self):
        self.click_menu()
        self.click_end_session()
        return self

    def expect_logout_button_visible(self, timeout: int = 10000):
        expect(self.page.get_by_role("button", name="Log out")).to_be_visible(timeout=timeout)
        return self
