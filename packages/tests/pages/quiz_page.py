import time

from playwright.sync_api import expect

from .base_page import BasePage


class QuizPage(BasePage):
    def click_start_practice(self):
        self.page.get_by_role("button", name="Start Practice").first.click()
        return self

    def wait_for_question(self, timeout: int = 5000):
        expect(self.page.locator("text=Question")).to_be_visible(timeout=timeout)
        return self

    def fill_answer(self, answer: str):
        answer_input = self.page.get_by_placeholder("Type your answer")
        answer_input.fill(answer)
        return self

    def submit_answer(self):
        self.page.keyboard.press("Enter")
        return self

    def answer_question(self, answer: str, delay: float = 0.5):
        self.fill_answer(answer)
        self.submit_answer()
        time.sleep(delay)
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

    def expect_welcome_visible(self, timeout: int = 5000):
        expect(self.page.locator("text=Welcome")).to_be_visible(timeout=timeout)
        return self

    def expect_logout_button_visible(self, timeout: int = 10000):
        expect(self.page.locator("button:has-text('Logout')")).to_be_visible(timeout=timeout)
        return self
