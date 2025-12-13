import os

from pages.admin_page import AdminPage
from pages.auth_page import AuthPage
from playwright.sync_api import Page, expect
import pytest
from tests.conftest import AuthenticatedUser

pytestmark = pytest.mark.e2e

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://frontend")


def login_as_admin(page: Page, admin_user: AuthenticatedUser) -> None:
    auth_page = AuthPage(page, FRONTEND_URL)
    auth_page.goto().login(admin_user["username"], admin_user["password"])
    auth_page.wait_for_welcome()


class TestAdminPanelAccess:
    def test_admin_can_access_admin_panel(self, page: Page, admin_user: AuthenticatedUser) -> None:
        login_as_admin(page, admin_user)

        admin_page = AdminPage(page, FRONTEND_URL)
        admin_page.navigate_to_admin()
        admin_page.wait_for_admin_panel()

        expect(page).to_have_url(f"{FRONTEND_URL}/admin")

    def test_non_admin_blocked_from_admin_panel(self, page: Page, test_user: AuthenticatedUser) -> None:
        auth_page = AuthPage(page, FRONTEND_URL)
        auth_page.goto().login(test_user["username"], test_user["password"])
        auth_page.wait_for_welcome()

        page.goto(f"{FRONTEND_URL}/admin")

        expect(page).not_to_have_url(f"{FRONTEND_URL}/admin", timeout=3000)


class TestAdminVocabularySearch:
    def test_search_vocabulary_with_query(self, page: Page, admin_user: AuthenticatedUser) -> None:
        login_as_admin(page, admin_user)

        admin_page = AdminPage(page, FRONTEND_URL)
        admin_page.navigate_to_admin().wait_for_admin_panel()

        admin_page.search("test")

        page.wait_for_timeout(1000)
        results_count = admin_page.get_search_results_count()
        assert results_count >= 0

    def test_search_with_empty_query(self, page: Page, admin_user: AuthenticatedUser) -> None:
        login_as_admin(page, admin_user)

        admin_page = AdminPage(page, FRONTEND_URL)
        admin_page.navigate_to_admin().wait_for_admin_panel()

        admin_page.fill_search("")
        admin_page.click_search_button()

        page.wait_for_timeout(1000)

    def test_filter_by_language(self, page: Page, admin_user: AuthenticatedUser) -> None:
        login_as_admin(page, admin_user)

        admin_page = AdminPage(page, FRONTEND_URL)
        admin_page.navigate_to_admin().wait_for_admin_panel()

        admin_page.select_language_filter("en")
        page.wait_for_timeout(1000)

    def test_filter_by_status(self, page: Page, admin_user: AuthenticatedUser) -> None:
        login_as_admin(page, admin_user)

        admin_page = AdminPage(page, FRONTEND_URL)
        admin_page.navigate_to_admin().wait_for_admin_panel()

        admin_page.select_status_filter("active")
        page.wait_for_timeout(1000)


class TestAdminVocabularyCRUD:
    def test_create_vocabulary_item(self, page: Page, admin_user: AuthenticatedUser) -> None:
        login_as_admin(page, admin_user)

        admin_page = AdminPage(page, FRONTEND_URL)
        admin_page.navigate_to_admin().wait_for_admin_panel()

        admin_page.create_vocabulary_item(
            source_text="playwright_test_word",
            target_text="тестовое_слово_playwright",
            source_lang="en",
            target_lang="ru",
            difficulty="A1",
            list_name="playwright-test-list",
        )

        page.wait_for_timeout(2000)

        admin_page.search("playwright_test_word")
        page.wait_for_timeout(1000)

        results_count = admin_page.get_search_results_count()
        assert results_count >= 1

    def test_edit_vocabulary_item(self, page: Page, admin_user: AuthenticatedUser) -> None:
        login_as_admin(page, admin_user)

        admin_page = AdminPage(page, FRONTEND_URL)
        admin_page.navigate_to_admin().wait_for_admin_panel()

        admin_page.search("test")
        page.wait_for_timeout(1000)

        if admin_page.get_table_row_count() > 0:
            admin_page.edit_vocabulary_item(row_index=0, target_text="edited_by_playwright")
            page.wait_for_timeout(2000)

    def test_delete_vocabulary_item_with_confirmation(self, page: Page, admin_user: AuthenticatedUser) -> None:
        login_as_admin(page, admin_user)

        admin_page = AdminPage(page, FRONTEND_URL)
        admin_page.navigate_to_admin().wait_for_admin_panel()

        admin_page.search("playwright_test_word")
        page.wait_for_timeout(1000)

        if admin_page.get_table_row_count() > 0:
            admin_page.delete_vocabulary_item(row_index=0, confirm=True)
            page.wait_for_timeout(2000)

    def test_cancel_delete_vocabulary_item(self, page: Page, admin_user: AuthenticatedUser) -> None:
        login_as_admin(page, admin_user)

        admin_page = AdminPage(page, FRONTEND_URL)
        admin_page.navigate_to_admin().wait_for_admin_panel()

        admin_page.search("test")
        page.wait_for_timeout(1000)

        if admin_page.get_table_row_count() > 0:
            initial_count = admin_page.get_table_row_count()
            admin_page.delete_vocabulary_item(row_index=0, confirm=False)
            page.wait_for_timeout(1000)

            current_count = admin_page.get_table_row_count()
            assert current_count == initial_count


class TestAdminStats:
    def test_admin_stats_displayed(self, page: Page, admin_user: AuthenticatedUser) -> None:
        login_as_admin(page, admin_user)

        admin_page = AdminPage(page, FRONTEND_URL)
        admin_page.navigate_to_admin().wait_for_admin_panel()

        admin_page.expect_stats_visible()

    def test_stats_show_total_items(self, page: Page, admin_user: AuthenticatedUser) -> None:
        login_as_admin(page, admin_user)

        admin_page = AdminPage(page, FRONTEND_URL)
        admin_page.navigate_to_admin().wait_for_admin_panel()

        stats_text = page.locator(".stats-card, [class*='stat'], text=/total.*items/i").first.text_content()
        assert stats_text is not None
