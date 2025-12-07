from playwright.sync_api import expect

from .base_page import BasePage


class AuthPage(BasePage):
    def fill_login(self, username: str, password: str):
        self.page.fill("#username", username)
        self.page.fill("#password", password)
        return self

    def fill_login_by_label(self, username: str, password: str):
        self.page.get_by_label("Username").fill(username)
        self.page.get_by_label("Password").fill(password)
        return self

    def click_sign_in(self):
        self.page.click("button:has-text('Sign In')")
        return self

    def click_login_button(self):
        self.page.get_by_role("button", name="Log in").click()
        return self

    def fill_register(self, username: str, password: str):
        self.page.fill("#register-username", username)
        self.page.fill("#register-password", password)
        return self

    def click_create_account(self):
        self.page.click("button:has-text('Create Account')")
        return self

    def click_register_link(self):
        self.page.click("text=Register here")
        return self

    def login(self, username: str, password: str):
        self.fill_login(username, password)
        self.click_sign_in()
        return self

    def login_by_label(self, username: str, password: str):
        self.fill_login_by_label(username, password)
        self.click_login_button()
        return self

    def register(self, username: str, password: str):
        self.click_register_link()
        self.fill_register(username, password)
        self.click_create_account()
        return self

    def register_full_flow(self, username: str, password: str):
        self.goto()
        self.register(username, password)
        return self

    def wait_for_welcome(self, timeout: int = 10000):
        expect(self.page.locator("text=Welcome")).to_be_visible(timeout=timeout)
        return self

    def expect_unauthorized_error(self, timeout: int = 10000):
        expect(self.page.locator("text=Unauthorized")).to_be_visible(timeout=timeout)
        return self

    def logout(self):
        self.page.get_by_role("button", name="Log out").click()
        return self
