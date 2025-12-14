from playwright.sync_api import Page, expect

from .base_page import BasePage


class AdminPage(BasePage):
    def __init__(self, page: Page, base_url: str):
        super().__init__(page, base_url)

    def navigate_to_admin(self):
        self.goto("/admin")
        self.page.wait_for_url("**/admin", timeout=10000)
        self.page.wait_for_timeout(2000)
        return self

    def wait_for_admin_panel(self, timeout: int = 15000):
        try:
            expect(self.page.locator("h1, h2").filter(has_text="Vocabulary Management")).to_be_visible(timeout=timeout)
        except AssertionError:
            print(f"[DEBUG] URL: {self.page.url}")
            print(f"[DEBUG] Title: {self.page.title()}")
            print(f"[DEBUG] All h1/h2 texts: {[el.text_content() for el in self.page.locator('h1, h2').all()]}")
            print(f"[DEBUG] Body text (first 500 chars): {self.page.locator('body').text_content()[:500]}")
            self.page.screenshot(path="/home/pwuser/tests/reports/admin-fail-debug.png")
            print("[DEBUG] Screenshot saved to reports/admin-fail-debug.png")
            raise
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
        language_container = self.page.get_by_text("Language:").locator("..")
        language_container.locator('[data-slot="select-trigger"]').click()
        self.page.locator('[role="listbox"]').wait_for(state="visible", timeout=5000)
        language_map = {
            "en": "English",
            "de": "German",
            "es": "Spanish",
            "ru": "Russian",
        }
        self.page.get_by_role("option", name=language_map.get(language, language), exact=True).click()
        return self

    def select_status_filter(self, status: str):
        status_container = self.page.get_by_text("Status:").locator("..")
        status_container.locator('[data-slot="select-trigger"]').click()
        self.page.locator('[role="listbox"]').wait_for(state="visible", timeout=5000)
        status_map = {"active": "Active", "inactive": "Inactive", "all": "All"}
        self.page.get_by_role("option", name=status_map.get(status, status), exact=True).click()
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

        dialog.locator("#create-source").fill(source_text)
        dialog.locator("#create-target").fill(target_text)

        self.page.locator("#create-source-lang").click()
        self.page.locator('[role="listbox"]').wait_for(state="visible", timeout=5000)
        lang_map = {"en": "English", "de": "German", "es": "Spanish", "ru": "Russian"}
        self.page.get_by_role("option", name=lang_map.get(source_lang, source_lang), exact=True).click(timeout=5000)

        self.page.locator("#create-target-lang").click()
        self.page.locator('[role="listbox"]').wait_for(state="visible", timeout=5000)
        self.page.get_by_role("option", name=lang_map.get(target_lang, target_lang), exact=True).click(timeout=5000)

        self.page.locator("#create-difficulty").click()
        self.page.locator('[role="listbox"]').wait_for(state="visible", timeout=5000)
        diff_map = {
            "A1": "A1 - Beginner",
            "A2": "A2 - Elementary",
            "B1": "B1 - Intermediate",
            "B2": "B2 - Upper Intermediate",
            "C1": "C1 - Advanced",
            "C2": "C2 - Proficiency",
        }
        self.page.get_by_role("option", name=diff_map.get(difficulty, difficulty), exact=True).click(timeout=5000)

        self.page.locator("#create-list-name").click()
        self.page.locator('[role="listbox"]').wait_for(state="visible", timeout=5000)

        list_name_map = {
            "english-russian-a0": "English-Russian A0",
            "english-russian-a1": "English-Russian A1",
            "english-russian-a2": "English-Russian A2",
            "english-russian-b1": "English-Russian B1",
            "english-russian-b2": "English-Russian B2",
            "german-russian-a0": "German-Russian A0",
            "german-russian-a1": "German-Russian A1",
            "german-russian-a2": "German-Russian A2",
            "german-russian-b1": "German-Russian B1",
            "german-russian-b2": "German-Russian B2",
            "spanish-russian-a0": "Spanish-Russian A0",
            "spanish-russian-a1": "Spanish-Russian A1",
            "spanish-russian-a2": "Spanish-Russian A2",
            "spanish-russian-b1": "Spanish-Russian B1",
            "spanish-russian-b2": "Spanish-Russian B2",
        }

        mapped_name = list_name_map.get(list_name, list_name)
        self.page.get_by_role("option", name=mapped_name, exact=False).first.click(timeout=5000)
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
            dialog.locator("#edit-source").fill(source_text)
        if target_text:
            dialog.locator("#edit-target").fill(target_text)
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
        return self.get_table_row_count()

    def get_table_row_count(self) -> int:
        return self.page.locator("table tbody tr").count()

    def expect_stats_visible(self):
        stats = self.page.locator(".stats-card, [class*='stat']")
        expect(stats.first).to_be_visible(timeout=3000)
        return self

    def expect_no_access_error(self):
        expect(self.page.locator("text=/forbidden|not authorized|access denied/i")).to_be_visible(timeout=3000)
        return self
