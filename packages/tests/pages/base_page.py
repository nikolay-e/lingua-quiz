from pathlib import Path

from playwright.sync_api import Page


class BasePage:
    def __init__(self, page: Page, base_url: str):
        self.page = page
        self.base_url = base_url

    def goto(self, path: str = "/", timeout: int | None = None):
        self.page.goto(f"{self.base_url}{path}", timeout=timeout)
        return self

    def wait_for_load(self, timeout: int | None = None):
        self.page.wait_for_load_state("networkidle", timeout=timeout)
        return self

    def screenshot(self, name: str, screenshots_dir: Path):
        screenshots_dir.mkdir(parents=True, exist_ok=True)
        self.page.screenshot(path=str(screenshots_dir / f"{name}.png"))
        return self

    def set_viewport(self, width: int, height: int):
        self.page.set_viewport_size({"width": width, "height": height})
        return self
