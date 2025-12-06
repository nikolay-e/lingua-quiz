"""Backend API integration tests."""

import pytest
from tests.conftest import API_URL, SKIP_TTS_TESTS, random_password, random_username


@pytest.mark.integration
class TestHealthEndpoints:
    def test_health_endpoint(self, api_client):
        response = api_client.get(f"{API_URL}/health")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] in ["healthy", "ok"]
        assert "timestamp" in data

    def test_version_endpoint(self, api_client):
        response = api_client.get(f"{API_URL}/version")
        assert response.status_code == 200

        data = response.json()
        assert "version" in data


@pytest.mark.integration
class TestAuthentication:
    def test_user_registration(self, api_client):
        username = random_username()
        password = random_password()

        response = api_client.post(
            f"{API_URL}/auth/register",
            json={"username": username, "password": password},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["user"]["username"] == username
        assert "token" in data
        assert "user" in data
        assert "id" in data["user"]

    def test_user_registration_duplicate(self, api_client, test_user):
        response = api_client.post(
            f"{API_URL}/auth/register",
            json={"username": test_user["username"], "password": "different_password"},
        )

        assert response.status_code == 400
        data = response.json()
        assert "already exists" in data["detail"].lower()

    def test_user_login(self, api_client, test_user):
        response = api_client.post(
            f"{API_URL}/auth/login",
            json={"username": test_user["username"], "password": test_user["password"]},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["user"]["username"] == test_user["username"]
        assert "token" in data

    def test_user_login_invalid_credentials(self, api_client, test_user):
        response = api_client.post(
            f"{API_URL}/auth/login",
            json={"username": test_user["username"], "password": "wrong_password"},
        )

        assert response.status_code == 401
        data = response.json()
        assert "invalid" in data["detail"].lower() or "incorrect" in data["detail"].lower()

    def test_protected_endpoint_without_token(self, api_client):
        response = api_client.get(f"{API_URL}/user/progress")
        assert response.status_code in [401, 403]

    def test_protected_endpoint_with_invalid_token(self, api_client):
        headers = {"Authorization": "Bearer invalid_token"}
        response = api_client.get(f"{API_URL}/user/progress", headers=headers)
        assert response.status_code in [401, 403]


@pytest.mark.integration
class TestQuizContent:
    def test_get_quiz_levels(self, api_client):
        response = api_client.get(f"{API_URL}/quiz/levels")

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            if data:
                assert "id" in data[0] or "name" in data[0]
        else:
            assert response.status_code in [404, 501]

    def test_get_quiz_questions(self, authenticated_api_client):
        response = authenticated_api_client.get(f"{API_URL}/quiz/questions")

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
        else:
            assert response.status_code in [404, 501]


@pytest.mark.integration
@pytest.mark.skipif(SKIP_TTS_TESTS, reason="TTS tests disabled")
class TestTextToSpeech:
    def test_tts_endpoint(self, authenticated_api_client):
        response = authenticated_api_client.post(
            f"{API_URL}/tts/synthesize",
            json={"text": "Hello, this is a test", "language": "en"},
        )

        if response.status_code == 200:
            assert response.headers.get("content-type") in [
                "audio/mpeg",
                "audio/wav",
                "audio/ogg",
            ]
            assert len(response.content) > 0
        else:
            assert response.status_code in [404, 501, 503]


@pytest.mark.integration
class TestRateLimiting:
    def test_rate_limiting(self, api_client):
        responses = []
        for i in range(10):
            response = api_client.get(f"{API_URL}/health")
            responses.append(response.status_code)

        success_count = sum(1 for status in responses if status == 200)
        rate_limited_count = sum(1 for status in responses if status == 429)

        assert success_count >= 5
        assert success_count + rate_limited_count == 10


@pytest.mark.integration
class TestErrorHandling:
    def test_not_found_endpoint(self, api_client):
        response = api_client.get(f"{API_URL}/nonexistent/endpoint")
        assert response.status_code == 404

    def test_invalid_json_payload(self, api_client):
        response = api_client.post(
            f"{API_URL}/auth/login",
            data="invalid json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code in [400, 422]

    def test_missing_required_fields(self, api_client):
        response = api_client.post(
            f"{API_URL}/auth/register",
            json={"username": "testuser"},
        )
        assert response.status_code in [400, 422]

        data = response.json()
        assert "password" in str(data).lower() or "required" in str(data).lower()
