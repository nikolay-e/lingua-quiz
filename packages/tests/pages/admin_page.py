from playwright.sync_api import Page, expect

from .base_page import BasePage


class AdminPage(BasePage):
    def __init__(self, page: Page, base_url: str):
        super().__init__(page, base_url)

    def navigate_to_admin(self):
        self.goto("/admin")
        return self

    def wait_for_admin_panel(self, timeout: int = 5000):
        expect(self.page.locator("h1, h2").filter(has_text="Vocabulary Management")).to_be_visible(timeout=timeout)
        return self

    def fill_search(self, query: str):
        self.page.get_by_placeholder("Search vocabulary...").fill(query)
        return self

    def click_search_button(self):
        self.page.get_by_role("button", name="Search").click()
        return self

    def search(self, query: str):
        self.fill_search(query)
        self.click_search_button()
        return self

    def select_language_filter(self, language: str):
        self.page.locator("select#language-filter").select_option(language)
        return self

    def select_status_filter(self, status: str):
        self.page.locator("select#status-filter").select_option(status)
        return self

    def click_create_button(self):
        self.page.get_by_role("button", name="Create New").click()
        return self

    def fill_create_dialog(
        self,
        source_text: str,
        target_text: str,
        source_lang: str = "en",
        target_lang: str = "ru",
        difficulty: str = "A1",
        list_name: str = "test-list",
    ):
        dialog = self.page.locator('[role="dialog"]')
        expect(dialog).to_be_visible(timeout=3000)

        dialog.locator('input[name="source_text"]').fill(source_text)
        dialog.locator('input[name="target_text"]').fill(target_text)
        dialog.locator('select[name="source_language"]').select_option(source_lang)
        dialog.locator('select[name="target_language"]').select_option(target_lang)
        dialog.locator('select[name="difficulty"]').select_option(difficulty)
        dialog.locator('input[name="list_name"]').fill(list_name)
        return self

    def click_save_in_dialog(self):
        self.page.locator('[role="dialog"] button:has-text("Save")').click()
        return self

    def click_cancel_in_dialog(self):
        self.page.locator('[role="dialog"] button:has-text("Cancel")').click()
        return self

    def create_vocabulary_item(self, source_text: str, target_text: str, **kwargs):
        self.click_create_button()
        self.fill_create_dialog(source_text, target_text, **kwargs)
        self.click_save_in_dialog()
        return self

    def click_edit_button(self, row_index: int = 0):
        rows = self.page.locator("table tbody tr")
        rows.nth(row_index).locator('button[aria-label*="Edit"]').click()
        return self

    def fill_edit_dialog(self, source_text: str = None, target_text: str = None):
        dialog = self.page.locator('[role="dialog"]')
        expect(dialog).to_be_visible(timeout=3000)

        if source_text:
            dialog.locator('input[name="source_text"]').fill(source_text)
        if target_text:
            dialog.locator('input[name="target_text"]').fill(target_text)
        return self

    def edit_vocabulary_item(self, row_index: int = 0, **kwargs):
        self.click_edit_button(row_index)
        self.fill_edit_dialog(**kwargs)
        self.click_save_in_dialog()
        return self

    def click_delete_button(self, row_index: int = 0):
        rows = self.page.locator("table tbody tr")
        rows.nth(row_index).locator('button[aria-label*="Delete"]').click()
        return self

    def confirm_delete(self):
        self.page.locator('[role="dialog"] button:has-text("Delete")').click()
        return self

    def cancel_delete(self):
        self.page.locator('[role="dialog"] button:has-text("Cancel")').click()
        return self

    def delete_vocabulary_item(self, row_index: int = 0, confirm: bool = True):
        self.click_delete_button(row_index)
        if confirm:
            self.confirm_delete()
        else:
            self.cancel_delete()
        return self

    def get_search_results_count(self) -> int:
        count_text = self.page.locator("text=/\\d+ items found/").text_content()
        if count_text:
            import re

            match = re.search(r"(\d+)", count_text)
            return int(match.group(1)) if match else 0
        return 0

    def get_table_row_count(self) -> int:
        return self.page.locator("table tbody tr").count()

    def expect_stats_visible(self):
        stats = self.page.locator(".stats-card, [class*='stat']")
        expect(stats.first).to_be_visible(timeout=3000)
        return self

    def expect_no_access_error(self):
        expect(self.page.locator("text=/forbidden|not authorized|access denied/i")).to_be_visible(timeout=3000)
        return self
