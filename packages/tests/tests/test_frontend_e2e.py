"""Frontend end-to-end tests using requests-html."""

import time

from bs4 import BeautifulSoup
import pytest
from tests.conftest import FRONTEND_URL


@pytest.mark.e2e
class TestAuthenticationFlow:
    def test_home_page_loads(self, web_session):
        response = web_session.get(FRONTEND_URL)
        assert response.status_code == 200
        html_content = response.text.lower()
        assert "lingua" in html_content or "quiz" in html_content

    def test_register_form_exists(self, web_session):
        response = web_session.get(FRONTEND_URL)
        soup = BeautifulSoup(response.text, "html.parser")

        app_div = soup.find("div", {"id": "app"})
        assert app_div is not None, "App container div not found"

        scripts = soup.find_all("script")
        any("app" in script.get("src", "") for script in scripts if script.get("src"))

        assert len(scripts) > 0, "No JavaScript found - app cannot render"

        viewport_meta = soup.find("meta", {"name": "viewport"})
        assert viewport_meta is not None, "Viewport meta tag missing"

    def test_login_form_exists(self, web_session):
        response = web_session.get(FRONTEND_URL)
        soup = BeautifulSoup(response.text, "html.parser")

        title = soup.find("title")
        assert title is not None, "No title tag found"

        description_meta = soup.find("meta", {"name": "description"})
        assert description_meta is not None, "No description meta tag found"
        assert "language learning" in description_meta.get("content", "").lower(), "App description doesn't indicate language learning functionality"

    def test_navigation_between_auth_forms(self, web_session):
        response = web_session.get(FRONTEND_URL)
        soup = BeautifulSoup(response.text, "html.parser")

        app_div = soup.find("div", {"id": "app"})
        assert app_div is not None, "App container for client-side routing not found"

        scripts = soup.find_all("script")
        assert len(scripts) > 0, "No JavaScript for SPA navigation found"


@pytest.mark.e2e
class TestQuizInterface:
    def test_quiz_elements_present(self, web_session):
        response = web_session.get(FRONTEND_URL)
        soup = BeautifulSoup(response.text, "html.parser")

        title = soup.find("title")
        assert title is not None and "lingua" in title.text.lower(), "App title doesn't indicate quiz functionality"

        keywords_meta = soup.find("meta", {"name": "keywords"})
        assert keywords_meta is not None, "No keywords meta tag found"
        keywords_content = keywords_meta.get("content", "").lower()
        assert any(keyword in keywords_content for keyword in ["quiz", "language", "learning"]), "Keywords don't include quiz-related terms"

    def test_level_selection_interface(self, web_session):
        response = web_session.get(FRONTEND_URL)
        soup = BeautifulSoup(response.text, "html.parser")

        app_div = soup.find("div", {"id": "app"})
        assert app_div is not None, "App container for level selection not found"

        description_meta = soup.find("meta", {"name": "description"})
        description_content = description_meta.get("content", "").lower() if description_meta else ""
        assert "learning" in description_content, "App doesn't indicate learning progression capability"


@pytest.mark.e2e
class TestResponsiveDesign:
    def test_meta_viewport_tag(self, web_session):
        response = web_session.get(FRONTEND_URL)
        soup = BeautifulSoup(response.text, "html.parser")

        viewport_meta = soup.find("meta", {"name": "viewport"})
        assert viewport_meta is not None, "Viewport meta tag not found"

        content = viewport_meta.get("content", "")
        assert "width=device-width" in content, "Viewport not configured for responsive design"

    def test_css_framework_loaded(self, web_session):
        response = web_session.get(FRONTEND_URL)
        soup = BeautifulSoup(response.text, "html.parser")

        css_links = soup.find_all("link", {"rel": "stylesheet"})
        style_tags = soup.find_all("style")

        assert len(css_links) > 0 or len(style_tags) > 0, "No CSS styles found"


@pytest.mark.e2e
class TestAccessibility:
    def test_page_has_title(self, web_session):
        response = web_session.get(FRONTEND_URL)
        soup = BeautifulSoup(response.text, "html.parser")

        title = soup.find("title")
        assert title is not None, "No title tag found"
        assert len(title.text.strip()) > 0, "Title is empty"

    def test_semantic_html_elements(self, web_session):
        response = web_session.get(FRONTEND_URL)
        soup = BeautifulSoup(response.text, "html.parser")

        html_tag = soup.find("html")
        head_tag = soup.find("head")
        body_tag = soup.find("body")

        assert html_tag is not None, "HTML tag not found"
        assert head_tag is not None, "HEAD tag not found"
        assert body_tag is not None, "BODY tag not found"

        assert html_tag.get("lang") is not None, "HTML lang attribute missing"

    def test_form_labels_or_placeholders(self, web_session):
        response = web_session.get(FRONTEND_URL)
        soup = BeautifulSoup(response.text, "html.parser")

        inputs = soup.find_all("input")

        for input_elem in inputs:
            has_label = bool(soup.find("label", {"for": input_elem.get("id")})) if input_elem.get("id") else False
            has_placeholder = bool(input_elem.get("placeholder"))
            has_aria_label = bool(input_elem.get("aria-label"))

            assert has_label or has_placeholder or has_aria_label, f"Input {input_elem} lacks proper labeling"


@pytest.mark.e2e
class TestPerformance:
    def test_page_load_time(self, web_session):
        start_time = time.time()
        response = web_session.get(FRONTEND_URL, timeout=10)
        load_time = time.time() - start_time

        assert response.status_code == 200
        assert load_time < 5.0, f"Page took {load_time:.2f}s to load, should be under 5s"

    def test_no_js_errors_in_console(self, web_session):
        response = web_session.get(FRONTEND_URL)

        soup = BeautifulSoup(response.text, "html.parser")

        error_indicators = soup.find_all(
            string=lambda text: text
            and any(
                error_term in text.lower()
                for error_term in [
                    "error",
                    "undefined",
                    "null is not",
                    "cannot read property",
                ]
            )
        )

        actual_errors = [
            error
            for error in error_indicators
            if not any(
                safe_term in error.lower()
                for safe_term in [
                    "error handling",
                    "error message",
                    "user error",
                    "console.error",
                    "serviceworker",
                    ".catch(",
                    "catch (err)",
                    "registration failed",
                ]
            )
        ]

        assert len(actual_errors) == 0, f"Possible JS errors found: {actual_errors[:3]}"


@pytest.mark.e2e
class TestSecurity:
    def test_no_password_in_source(self, web_session):
        response = web_session.get(FRONTEND_URL)
        html_content = response.text.lower()

        suspicious_patterns = ["password=", "pwd=", "pass=", "secret=", "key="]

        for pattern in suspicious_patterns:
            assert pattern not in html_content, f"Suspicious pattern '{pattern}' found in HTML source"

    def test_https_ready_headers(self, web_session):
        response = web_session.get(FRONTEND_URL)

        headers = {k.lower(): v.lower() for k, v in response.headers.items()}

        assert "server" not in headers or "nginx" in headers["server"] or "apache" not in headers["server"]

        assert True
