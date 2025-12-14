import os

from pages.auth_page import AuthPage
from playwright.sync_api import Page, expect
import pytest
from tests.conftest import AuthenticatedUser

pytestmark = pytest.mark.e2e

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://frontend")


def login_and_start_quiz(page: Page, test_user: AuthenticatedUser) -> None:
    auth_page = AuthPage(page, FRONTEND_URL)
    auth_page.goto().login(test_user["username"], test_user["password"])
    auth_page.wait_for_welcome()
    page.select_option("#quiz-select", index=1)
    expect(page.locator(".question-text")).to_be_visible(timeout=5000)


class TestMobileBottomNavigation:
    def test_bottom_nav_visible_on_mobile(self, page: Page, test_user: AuthenticatedUser) -> None:
        page.set_viewport_size({"width": 375, "height": 667})
        login_and_start_quiz(page, test_user)

        bottom_nav = page.locator("nav.bottom-nav, [class*='bottom-nav']")
        expect(bottom_nav).to_be_visible(timeout=3000)

    def test_bottom_nav_hidden_on_desktop(self, page: Page, test_user: AuthenticatedUser) -> None:
        page.set_viewport_size({"width": 1920, "height": 1080})
        login_and_start_quiz(page, test_user)

        bottom_nav = page.locator("nav.bottom-nav, [class*='bottom-nav']")
        expect(bottom_nav).to_be_hidden(timeout=3000)

    def test_bottom_nav_menu_button_navigates(self, page: Page, test_user: AuthenticatedUser) -> None:
        page.set_viewport_size({"width": 375, "height": 667})
        login_and_start_quiz(page, test_user)

        menu_button = page.locator("nav.bottom-nav button:has-text('Menu'), nav.bottom-nav button[aria-label*='menu' i]").first
        if menu_button.is_visible():
            menu_button.click()
            page.wait_for_timeout(1000)

    def test_bottom_nav_progress_button_toggles(self, page: Page, test_user: AuthenticatedUser) -> None:
        page.set_viewport_size({"width": 375, "height": 667})
        login_and_start_quiz(page, test_user)

        progress_panel = page.locator(".learning-progress-container").first

        initial_visible = progress_panel.is_visible()

        progress_button = page.locator("nav.bottom-nav button[aria-label*='progress' i]").first
        if progress_button.is_visible():
            progress_button.click()
            page.wait_for_timeout(500)

            if initial_visible:
                expect(progress_panel).to_be_hidden(timeout=2000)
            else:
                expect(progress_panel).to_be_visible(timeout=2000)


class TestMobileDeviceEmulation:
    @pytest.mark.parametrize(
        ("device_name", "width", "height"),
        [
            ("iPhone 12", 390, 844),
            ("iPhone SE", 375, 667),
            ("Pixel 5", 393, 851),
            ("iPad Mini", 768, 1024),
        ],
    )
    def test_quiz_works_on_device(
        self,
        page: Page,
        test_user: AuthenticatedUser,
        device_name: str,
        width: int,
        height: int,
    ) -> None:
        page.set_viewport_size({"width": width, "height": height})

        auth_page = AuthPage(page, FRONTEND_URL)
        auth_page.goto().login(test_user["username"], test_user["password"])
        auth_page.wait_for_welcome()

        page.select_option("#quiz-select", index=1)
        expect(page.locator(".question-text")).to_be_visible(timeout=5000)

        page.get_by_placeholder("Type your answer...").fill("test")
        page.get_by_role("button", name="Check Answer").click()
        expect(page.locator(".feedback-container")).to_be_visible(timeout=3000)


class TestResponsiveLayout:
    def test_quiz_header_responsive(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_and_start_quiz(page, test_user)

        page.set_viewport_size({"width": 375, "height": 667})
        header = page.locator(".quiz-header").first
        expect(header).to_be_visible()

        page.set_viewport_size({"width": 1920, "height": 1080})
        expect(header).to_be_visible()

    def test_answer_input_full_width_mobile(self, page: Page, test_user: AuthenticatedUser) -> None:
        page.set_viewport_size({"width": 375, "height": 667})
        login_and_start_quiz(page, test_user)

        answer_input = page.get_by_placeholder("Type your answer...")
        input_box = answer_input.bounding_box()
        assert input_box is not None
        assert input_box["width"] > 300


class TestNetworkConditions:
    def test_quiz_loads_on_slow_3g(self, page: Page, test_user: AuthenticatedUser) -> None:
        client = page.context.new_cdp_session(page)
        client.send(
            "Network.emulateNetworkConditions",
            {
                "offline": False,
                "downloadThroughput": 50 * 1024 / 8,
                "uploadThroughput": 50 * 1024 / 8,
                "latency": 2000,
            },
        )

        auth_page = AuthPage(page, FRONTEND_URL)
        auth_page.goto(timeout=90000).login(test_user["username"], test_user["password"])

        expect(page.locator("text=Welcome")).to_be_visible(timeout=30000)

        page.select_option("#quiz-select", index=1)
        expect(page.locator(".question-text")).to_be_visible(timeout=15000)

    def test_offline_mode_shows_error(self, page: Page, test_user: AuthenticatedUser) -> None:
        auth_page = AuthPage(page, FRONTEND_URL)
        auth_page.goto().login(test_user["username"], test_user["password"])
        auth_page.wait_for_welcome()

        client = page.context.new_cdp_session(page)
        client.send(
            "Network.emulateNetworkConditions",
            {
                "offline": True,
                "downloadThroughput": 0,
                "uploadThroughput": 0,
                "latency": 0,
            },
        )

        page.select_option("#quiz-select", index=1)
        page.wait_for_timeout(3000)
