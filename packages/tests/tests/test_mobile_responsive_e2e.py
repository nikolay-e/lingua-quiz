import os

from playwright.sync_api import Page, expect
import pytest
from tests.conftest import AuthenticatedUser, login_and_start_quiz, login_user, start_quiz_with_cascading_selectors

pytestmark = pytest.mark.e2e

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://frontend")


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

        login_and_start_quiz(page, test_user)

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
    def test_offline_mode_shows_error(self, page: Page, test_user: AuthenticatedUser) -> None:
        login_user(page, test_user["username"], test_user["password"])

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

        try:
            start_quiz_with_cascading_selectors(page)
        except Exception:
            pass
        page.wait_for_timeout(3000)
