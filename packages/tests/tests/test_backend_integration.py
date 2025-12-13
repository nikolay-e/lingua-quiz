"""Backend API integration tests."""

from pathlib import Path
import sys

BACKEND_DIR_LOCAL = Path(__file__).parent.parent.parent / "backend"
BACKEND_DIR_DOCKER = Path("/home/pwuser/backend")
BACKEND_DIR = BACKEND_DIR_DOCKER if BACKEND_DIR_DOCKER.exists() else BACKEND_DIR_LOCAL
BACKEND_SRC = BACKEND_DIR / "src"
if str(BACKEND_SRC) not in sys.path:
    sys.path.append(str(BACKEND_SRC))

from generated.schemas import (  # noqa: E402
    BulkProgressUpdateRequest,
    ContentVersionResponse,
    HealthResponse,
    ProgressUpdateRequest,
    RefreshTokenRequest,
    TokenResponse,
    TTSLanguagesResponse,
    TTSRequest,
    UserLogin,
    UserProgressResponse,
    UserRegistration,
    VersionResponse,
    VocabularyItemCreate,
    VocabularyItemDetailResponse,
    VocabularyItemResponse,
    VocabularyItemUpdate,
    WordListResponse,
)
import pytest  # noqa: E402
from tests.conftest import API_URL, SKIP_TTS_TESTS, AuthenticatedUser  # noqa: E402
from utils import random_password, random_username, random_word  # noqa: E402


@pytest.mark.integration
class TestHealthEndpoints:
    def test_health_endpoint(self, api_client):
        response = api_client.get(f"{API_URL}/health")
        assert response.status_code == 200

        health = HealthResponse.model_validate(response.json())
        assert health.status in ["healthy", "ok"]
        assert health.timestamp

    def test_version_endpoint(self, api_client):
        response = api_client.get(f"{API_URL}/version")
        assert response.status_code == 200

        version = VersionResponse.model_validate(response.json())
        assert version.version


@pytest.mark.integration
class TestAuthentication:
    def test_user_registration(self, api_client):
        registration = UserRegistration(
            username=random_username(),
            password=random_password(),
        )

        response = api_client.post(
            f"{API_URL}/auth/register",
            json=registration.model_dump(by_alias=True),
        )

        assert response.status_code == 201
        token_response = TokenResponse.model_validate(response.json())
        assert token_response.user.username == registration.username
        assert token_response.token
        assert token_response.user.id

    def test_user_registration_duplicate(self, api_client, test_user: AuthenticatedUser):
        registration = UserRegistration(
            username=test_user["username"],
            password="DifferentPass123!",
        )

        response = api_client.post(
            f"{API_URL}/auth/register",
            json=registration.model_dump(by_alias=True),
        )

        assert response.status_code == 400
        data = response.json()
        assert "already exists" in data["detail"].lower()

    def test_user_login(self, api_client, test_user: AuthenticatedUser):
        login = UserLogin(
            username=test_user["username"],
            password=test_user["password"],
        )

        response = api_client.post(
            f"{API_URL}/auth/login",
            json=login.model_dump(by_alias=True),
        )

        assert response.status_code == 200
        token_response = TokenResponse.model_validate(response.json())
        assert token_response.user.username == test_user["username"]
        assert token_response.token

    def test_user_login_invalid_credentials(self, api_client, test_user: AuthenticatedUser):
        login = UserLogin(
            username=test_user["username"],
            password="WrongPassword123!",
        )

        response = api_client.post(
            f"{API_URL}/auth/login",
            json=login.model_dump(by_alias=True),
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

    def test_token_refresh(self, api_client, test_user: AuthenticatedUser):
        login = UserLogin(
            username=test_user["username"],
            password=test_user["password"],
        )
        login_response = api_client.post(
            f"{API_URL}/auth/login",
            json=login.model_dump(by_alias=True),
        )
        token_data = TokenResponse.model_validate(login_response.json())

        refresh_request = RefreshTokenRequest(refresh_token=token_data.refresh_token)
        response = api_client.post(
            f"{API_URL}/auth/refresh",
            json=refresh_request.model_dump(by_alias=True),
        )

        assert response.status_code == 200
        new_token = TokenResponse.model_validate(response.json())
        assert new_token.token
        assert new_token.token != token_data.token


@pytest.mark.integration
class TestVocabulary:
    def test_get_word_lists(self, authenticated_api_client):
        response = authenticated_api_client.get(f"{API_URL}/word-lists")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if data:
            word_list = WordListResponse.model_validate(data[0])
            assert word_list.list_name
            assert word_list.word_count >= 0

    def test_get_translations(self, authenticated_api_client):
        lists_response = authenticated_api_client.get(f"{API_URL}/word-lists")
        if lists_response.status_code != 200 or not lists_response.json():
            pytest.skip("No word lists available")

        list_name = lists_response.json()[0]["listName"]
        response = authenticated_api_client.get(
            f"{API_URL}/translations",
            params={"list_name": list_name},
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if data:
            vocab_item = VocabularyItemResponse.model_validate(data[0])
            assert vocab_item.id
            assert vocab_item.source_text
            assert vocab_item.target_text


@pytest.mark.integration
class TestUserProgress:
    def test_get_progress_empty(self, authenticated_api_client):
        response = authenticated_api_client.get(f"{API_URL}/user/progress")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_save_and_get_progress(self, authenticated_api_client):
        lists_response = authenticated_api_client.get(f"{API_URL}/word-lists")
        if lists_response.status_code != 200 or not lists_response.json():
            pytest.skip("No word lists available")

        list_name = lists_response.json()[0]["listName"]
        vocab_response = authenticated_api_client.get(
            f"{API_URL}/translations",
            params={"list_name": list_name},
        )
        if vocab_response.status_code != 200 or not vocab_response.json():
            pytest.skip("No vocabulary items available")

        vocab_item = VocabularyItemResponse.model_validate(vocab_response.json()[0])

        progress_update = ProgressUpdateRequest(
            vocabulary_item_id=vocab_item.id,
            level=1,
            queue_position=5,
            correct_count=3,
            incorrect_count=1,
        )
        save_response = authenticated_api_client.post(
            f"{API_URL}/user/progress",
            json=progress_update.model_dump(by_alias=True),
        )
        assert save_response.status_code == 200

        get_response = authenticated_api_client.get(
            f"{API_URL}/user/progress",
            params={"list_name": list_name},
        )
        assert get_response.status_code == 200
        progress_list = get_response.json()
        assert isinstance(progress_list, list)

        saved_progress = next(
            (p for p in progress_list if p["vocabularyItemId"] == vocab_item.id),
            None,
        )
        if saved_progress:
            validated = UserProgressResponse.model_validate(saved_progress)
            assert validated.level == 1
            assert validated.correct_count == 3

    def test_bulk_progress_update(self, authenticated_api_client):
        lists_response = authenticated_api_client.get(f"{API_URL}/word-lists")
        if lists_response.status_code != 200 or not lists_response.json():
            pytest.skip("No word lists available")

        list_name = lists_response.json()[0]["listName"]
        vocab_response = authenticated_api_client.get(
            f"{API_URL}/translations",
            params={"list_name": list_name},
        )
        if vocab_response.status_code != 200 or len(vocab_response.json()) < 2:
            pytest.skip("Not enough vocabulary items for bulk test")

        vocab_items = [VocabularyItemResponse.model_validate(v) for v in vocab_response.json()[:2]]

        bulk_request = BulkProgressUpdateRequest(
            items=[
                ProgressUpdateRequest(
                    vocabulary_item_id=vocab_items[0].id,
                    level=2,
                    queue_position=10,
                    correct_count=5,
                    incorrect_count=0,
                ),
                ProgressUpdateRequest(
                    vocabulary_item_id=vocab_items[1].id,
                    level=1,
                    queue_position=3,
                    correct_count=2,
                    incorrect_count=1,
                ),
            ]
        )

        response = authenticated_api_client.post(
            f"{API_URL}/user/progress/bulk",
            json=bulk_request.model_dump(by_alias=True),
        )
        assert response.status_code == 200


@pytest.mark.integration
class TestContentVersion:
    def test_get_content_version(self, authenticated_api_client):
        response = authenticated_api_client.get(f"{API_URL}/content-version")

        assert response.status_code == 200
        version = ContentVersionResponse.model_validate(response.json())
        assert version.version_id
        assert version.version_name
        assert version.is_active is True


@pytest.mark.integration
@pytest.mark.skipif(SKIP_TTS_TESTS, reason="TTS tests disabled")
class TestTextToSpeech:
    def test_tts_languages(self, authenticated_api_client):
        response = authenticated_api_client.get(f"{API_URL}/tts/languages")

        assert response.status_code == 200
        languages = TTSLanguagesResponse.model_validate(response.json())
        assert isinstance(languages.available, bool)
        assert isinstance(languages.supported_languages, list)

    def test_tts_synthesize(self, authenticated_api_client):
        tts_request = TTSRequest(text="Hello, this is a test", language="en")

        response = authenticated_api_client.post(
            f"{API_URL}/tts/synthesize",
            json=tts_request.model_dump(by_alias=True),
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


@pytest.mark.integration
class TestAdminVocabulary:
    def test_admin_required_for_vocabulary_crud(self, authenticated_api_client):
        response = authenticated_api_client.get(f"{API_URL}/admin/vocabulary")
        assert response.status_code == 403

    def test_admin_list_vocabulary(self, admin_api_client):
        response = admin_api_client.get(f"{API_URL}/admin/vocabulary")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_admin_search_vocabulary(self, admin_api_client):
        response = admin_api_client.get(
            f"{API_URL}/admin/vocabulary/search",
            params={"query": "test"},
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_admin_create_vocabulary_item(self, admin_api_client):
        vocab_item = VocabularyItemCreate(
            source_text=random_word("integration"),
            source_language="en",
            target_text="интеграционное_тестовое_слово",
            target_language="ru",
            list_name="test-integration-list",
            difficulty_level="A1",
            source_usage_example="This is an integration test word.",
            target_usage_example="Это интеграционное тестовое слово.",
        )

        response = admin_api_client.post(
            f"{API_URL}/admin/vocabulary",
            json=vocab_item.model_dump(by_alias=True),
        )

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        return data["id"]

    def test_admin_get_vocabulary_item(self, admin_api_client):
        source_word = random_word("get")
        create_response = admin_api_client.post(
            f"{API_URL}/admin/vocabulary",
            json=VocabularyItemCreate(
                source_text=source_word,
                source_language="en",
                target_text="тестовое_слово_для_получения",
                target_language="ru",
                list_name="test-integration-list",
            ).model_dump(by_alias=True),
        )
        item_id = create_response.json()["id"]

        response = admin_api_client.get(f"{API_URL}/admin/vocabulary/{item_id}")

        assert response.status_code == 200
        item = VocabularyItemDetailResponse.model_validate(response.json())
        assert item.id == item_id
        assert item.source_text == source_word

    def test_admin_update_vocabulary_item(self, admin_api_client):
        create_response = admin_api_client.post(
            f"{API_URL}/admin/vocabulary",
            json=VocabularyItemCreate(
                source_text=random_word("update"),
                source_language="en",
                target_text="слово_для_обновления",
                target_language="ru",
                list_name="test-integration-list",
            ).model_dump(by_alias=True),
        )
        item_id = create_response.json()["id"]

        update_data = VocabularyItemUpdate(
            target_text="обновлённое_слово",
            source_usage_example="Updated example sentence.",
        )

        response = admin_api_client.put(
            f"{API_URL}/admin/vocabulary/{item_id}",
            json=update_data.model_dump(by_alias=True, exclude_none=True),
        )

        assert response.status_code == 200

        get_response = admin_api_client.get(f"{API_URL}/admin/vocabulary/{item_id}")
        updated_item = VocabularyItemDetailResponse.model_validate(get_response.json())
        assert updated_item.target_text == "обновлённое_слово"
        assert updated_item.source_usage_example == "Updated example sentence."

    def test_admin_delete_vocabulary_item(self, admin_api_client):
        create_response = admin_api_client.post(
            f"{API_URL}/admin/vocabulary",
            json=VocabularyItemCreate(
                source_text=random_word("delete"),
                source_language="en",
                target_text="слово_для_удаления",
                target_language="ru",
                list_name="test-integration-list",
            ).model_dump(by_alias=True),
        )
        item_id = create_response.json()["id"]

        response = admin_api_client.delete(f"{API_URL}/admin/vocabulary/{item_id}")
        assert response.status_code == 200

        get_response = admin_api_client.get(f"{API_URL}/admin/vocabulary/{item_id}")
        if get_response.status_code == 200:
            item = get_response.json()
            assert item.get("isActive") is False


@pytest.mark.integration
class TestAccountDeletion:
    def test_delete_account(self, api_client):
        registration = UserRegistration(
            username=random_username(),
            password=random_password(),
        )
        reg_response = api_client.post(
            f"{API_URL}/auth/register",
            json=registration.model_dump(by_alias=True),
        )
        assert reg_response.status_code == 201
        token = TokenResponse.model_validate(reg_response.json()).token

        delete_response = api_client.delete(
            f"{API_URL}/auth/delete-account",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert delete_response.status_code == 200

        login_response = api_client.post(
            f"{API_URL}/auth/login",
            json={"username": registration.username, "password": registration.password},
        )
        assert login_response.status_code == 401


@pytest.mark.integration
class TestInputValidation:
    def test_username_too_short(self, api_client):
        response = api_client.post(
            f"{API_URL}/auth/register",
            json={"username": "ab", "password": "ValidPass123!"},
        )
        assert response.status_code == 422
        data = response.json()
        assert "username" in str(data).lower()

    def test_username_too_long(self, api_client):
        response = api_client.post(
            f"{API_URL}/auth/register",
            json={"username": "a" * 51, "password": "ValidPass123!"},
        )
        assert response.status_code == 422

    def test_password_too_short(self, api_client):
        response = api_client.post(
            f"{API_URL}/auth/register",
            json={"username": random_username(), "password": "Short1!"},
        )
        assert response.status_code == 422
        data = response.json()
        assert "password" in str(data).lower()

    def test_password_too_long(self, api_client):
        response = api_client.post(
            f"{API_URL}/auth/register",
            json={"username": random_username(), "password": "A1!" + "a" * 130},
        )
        assert response.status_code == 422

    def test_progress_invalid_level(self, authenticated_api_client):
        response = authenticated_api_client.post(
            f"{API_URL}/user/progress",
            json={
                "vocabularyItemId": "00000000-0000-0000-0000-000000000000",
                "level": 10,
                "queuePosition": 0,
                "correctCount": 0,
                "incorrectCount": 0,
            },
        )
        assert response.status_code == 422

    def test_progress_negative_counts(self, authenticated_api_client):
        response = authenticated_api_client.post(
            f"{API_URL}/user/progress",
            json={
                "vocabularyItemId": "00000000-0000-0000-0000-000000000000",
                "level": 1,
                "queuePosition": -5,
                "correctCount": 0,
                "incorrectCount": 0,
            },
        )
        assert response.status_code == 422

    def test_tts_text_too_long(self, authenticated_api_client):
        response = authenticated_api_client.post(
            f"{API_URL}/tts/synthesize",
            json={"text": "a" * 501, "language": "en"},
        )
        assert response.status_code == 422

    def test_tts_invalid_language(self, authenticated_api_client):
        response = authenticated_api_client.post(
            f"{API_URL}/tts/synthesize",
            json={"text": "Hello", "language": "invalid"},
        )
        assert response.status_code == 422


@pytest.mark.integration
class TestEdgeCases:
    def test_get_translations_nonexistent_list(self, authenticated_api_client):
        response = authenticated_api_client.get(
            f"{API_URL}/translations",
            params={"list_name": "nonexistent-list-12345"},
        )
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert response.json() == []

    def test_get_progress_nonexistent_list(self, authenticated_api_client):
        response = authenticated_api_client.get(
            f"{API_URL}/user/progress",
            params={"list_name": "nonexistent-list-12345"},
        )
        assert response.status_code == 200
        assert response.json() == []

    def test_admin_get_nonexistent_vocabulary_item(self, admin_api_client):
        response = admin_api_client.get(f"{API_URL}/admin/vocabulary/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 404

    def test_admin_update_nonexistent_vocabulary_item(self, admin_api_client):
        response = admin_api_client.put(
            f"{API_URL}/admin/vocabulary/00000000-0000-0000-0000-000000000000",
            json={"targetText": "updated"},
        )
        assert response.status_code == 404

    def test_admin_delete_nonexistent_vocabulary_item(self, admin_api_client):
        response = admin_api_client.delete(f"{API_URL}/admin/vocabulary/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 404

    def test_empty_bulk_progress_rejected(self, authenticated_api_client):
        response = authenticated_api_client.post(
            f"{API_URL}/user/progress/bulk",
            json={"items": []},
        )
        assert response.status_code == 422

    def test_refresh_with_invalid_token(self, api_client):
        response = api_client.post(
            f"{API_URL}/auth/refresh",
            json={"refresh_token": "invalid_refresh_token_12345"},
        )
        assert response.status_code in [401, 403]


@pytest.mark.integration
class TestPaginationAndFilters:
    def test_admin_vocabulary_pagination(self, admin_api_client):
        response = admin_api_client.get(
            f"{API_URL}/admin/vocabulary",
            params={"limit": 5, "offset": 0},
        )
        assert response.status_code == 200
        first_page = response.json()
        assert len(first_page) <= 5

        if len(first_page) == 5:
            response2 = admin_api_client.get(
                f"{API_URL}/admin/vocabulary",
                params={"limit": 5, "offset": 5},
            )
            assert response2.status_code == 200

    def test_admin_vocabulary_search_filters(self, admin_api_client):
        response = admin_api_client.get(
            f"{API_URL}/admin/vocabulary/search",
            params={"query": "zzzznonexistent12345"},
        )
        assert response.status_code == 200
        assert response.json() == []

    def test_progress_filter_by_list(self, authenticated_api_client):
        lists_response = authenticated_api_client.get(f"{API_URL}/word-lists")
        if lists_response.status_code != 200 or not lists_response.json():
            pytest.skip("No word lists available")

        list_name = lists_response.json()[0]["listName"]
        response = authenticated_api_client.get(
            f"{API_URL}/user/progress",
            params={"list_name": list_name},
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)


@pytest.mark.integration
class TestSecurityBasic:
    def test_sql_injection_in_username(self, api_client):
        response = api_client.post(
            f"{API_URL}/auth/login",
            json={
                "username": "admin'; DROP TABLE users; --",
                "password": "password123",
            },
        )
        assert response.status_code in [401, 422]

        health = api_client.get(f"{API_URL}/health")
        assert health.status_code == 200

    def test_xss_in_vocabulary_search(self, admin_api_client):
        response = admin_api_client.get(
            f"{API_URL}/admin/vocabulary/search",
            params={"query": "<script>alert('xss')</script>"},
        )
        assert response.status_code == 200
        data = response.json()
        if data:
            assert "<script>" not in str(data)

    def test_path_traversal_in_vocabulary_id(self, admin_api_client):
        response = admin_api_client.get(f"{API_URL}/admin/vocabulary/../../../etc/passwd")
        assert response.status_code in [400, 404, 422]

    def test_oversized_payload_rejected(self, api_client):
        response = api_client.post(
            f"{API_URL}/auth/register",
            json={"username": "a" * 10000, "password": "b" * 10000},
        )
        assert response.status_code in [400, 413, 422]

    def test_malformed_jwt_rejected(self, api_client):
        response = api_client.get(
            f"{API_URL}/user/progress",
            headers={"Authorization": "Bearer not.a.valid.jwt.token"},
        )
        assert response.status_code in [401, 403]

    def test_expired_token_format(self, api_client):
        fake_expired_token = (
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoidGVzdCIsImV4cCI6MH0.invalid_signature"  # gitleaks:allow
        )
        response = api_client.get(
            f"{API_URL}/user/progress",
            headers={"Authorization": f"Bearer {fake_expired_token}"},
        )
        assert response.status_code in [401, 403]
