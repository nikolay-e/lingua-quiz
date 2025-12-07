import os
import time

from playwright.sync_api import Page, expect

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://frontend")


class TestQuizFlowE2E:
    def test_full_quiz_session_with_progress_persistence(self, page: Page, test_user: dict[str, str]) -> None:
        page.goto(FRONTEND_URL)
        expect(page).to_have_title("LinguaQuiz - Advanced Language Learning")

        page.get_by_role("textbox", name="Username").fill(test_user["username"])
        page.get_by_role("textbox", name="Password").fill(test_user["password"])
        page.get_by_role("button", name="Log in").click()

        expect(page.locator("text=Welcome")).to_be_visible(timeout=5000)

        page.get_by_role("button", name="Start Practice").first.click()

        expect(page.locator("text=Question")).to_be_visible(timeout=5000)

        for i in range(5):
            question_text = page.locator("[data-testid='question-text']").inner_text()
            assert len(question_text) > 0

            answer_input = page.get_by_placeholder("Type your answer")
            answer_input.fill("test answer")
            page.keyboard.press("Enter")

            time.sleep(0.5)

        time.sleep(2)

        page.get_by_role("button", name="Menu").click()
        page.get_by_role("button", name="End Session").click()

        page.get_by_role("button", name="Log out").click()
        expect(page.locator("text=Log in")).to_be_visible()

        page.get_by_role("textbox", name="Username").fill(test_user["username"])
        page.get_by_role("textbox", name="Password").fill(test_user["password"])
        page.get_by_role("button", name="Log in").click()

        expect(page.locator("text=Welcome")).to_be_visible(timeout=5000)

        page.get_by_role("button", name="Start Practice").first.click()
        expect(page.locator("text=Question")).to_be_visible(timeout=5000)

        stats_text = page.locator("[data-testid='session-stats']").inner_text()
        assert "correct" in stats_text.lower() or "total" in stats_text.lower()

    def test_answer_validation_and_feedback(self, page: Page, test_user: dict[str, str]) -> None:
        page.goto(FRONTEND_URL)
        page.get_by_role("textbox", name="Username").fill(test_user["username"])
        page.get_by_role("textbox", name="Password").fill(test_user["password"])
        page.get_by_role("button", name="Log in").click()

        expect(page.locator("text=Welcome")).to_be_visible(timeout=5000)
        page.get_by_role("button", name="Start Practice").first.click()

        expect(page.locator("text=Question")).to_be_visible(timeout=5000)

        answer_input = page.get_by_placeholder("Type your answer")
        answer_input.fill("definitely wrong answer xyzabc")
        page.keyboard.press("Enter")

        expect(page.locator("text=Incorrect")).to_be_visible(timeout=2000)

    def test_debounced_bulk_save(self, page: Page, test_user: dict[str, str]) -> None:
        page.goto(FRONTEND_URL)
        page.get_by_role("textbox", name="Username").fill(test_user["username"])
        page.get_by_role("textbox", name="Password").fill(test_user["password"])
        page.get_by_role("button", name="Log in").click()

        expect(page.locator("text=Welcome")).to_be_visible(timeout=5000)

        with page.expect_request(lambda req: "/api/user/progress/bulk" in req.url, timeout=10000) as request_info:
            page.get_by_role("button", name="Start Practice").first.click()
            expect(page.locator("text=Question")).to_be_visible(timeout=5000)

            for i in range(10):
                answer_input = page.get_by_placeholder("Type your answer")
                answer_input.fill(f"answer {i}")
                page.keyboard.press("Enter")
                time.sleep(0.2)

            time.sleep(1.5)

        request = request_info.value
        assert request.method == "POST"
        assert "/api/user/progress/bulk" in request.url

    def test_level_progression(self, page: Page, test_user: dict[str, str]) -> None:
        page.goto(FRONTEND_URL)
        page.get_by_role("textbox", name="Username").fill(test_user["username"])
        page.get_by_role("textbox", name="Password").fill(test_user["password"])
        page.get_by_role("button", name="Log in").click()

        expect(page.locator("text=Welcome")).to_be_visible(timeout=5000)
        page.get_by_role("button", name="Start Practice").first.click()

        expect(page.locator("text=Question")).to_be_visible(timeout=5000)

        initial_stats = page.locator("[data-testid='session-stats']").inner_text()

        for i in range(15):
            answer_input = page.get_by_placeholder("Type your answer")
            answer_input.fill("answer")
            page.keyboard.press("Enter")
            time.sleep(0.3)

        final_stats = page.locator("[data-testid='session-stats']").inner_text()
        assert final_stats != initial_stats
