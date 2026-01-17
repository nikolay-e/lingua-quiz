import os

import requests

from .exceptions import MissingCredentialsError, VocabularyCreateError, VocabularyFetchError, VocabularyUpdateError
from .models import VocabularyEntry


class StagingAPIClient:
    def __init__(
        self,
        base_url: str | None = None,
        token: str | None = None,
        username: str | None = None,
        password: str | None = None,
    ):
        self.base_url = base_url or os.environ.get("STAGING_API_URL", "https://staging.lingua-quiz.org")
        self.token = token or os.environ.get("STAGING_API_TOKEN")

        if not self.token:
            username = username or os.environ.get("STAGING_API_USERNAME")
            password = password or os.environ.get("STAGING_API_PASSWORD")

            if not username or not password:
                raise MissingCredentialsError(
                    "API credentials not configured. Set environment variables:\n"
                    "  STAGING_API_TOKEN (preferred) or\n"
                    "  STAGING_API_USERNAME and STAGING_API_PASSWORD"
                )

            self.token = self._login(username, password)

    def _login(self, username: str, password: str) -> str:
        url = f"{self.base_url}/api/auth/login"
        headers = {
            "Content-Type": "application/json",
            "Origin": self.base_url,
        }
        response = requests.post(
            url,
            headers=headers,
            json={"username": username, "password": password},
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("token", "")

    def _get_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "Origin": self.base_url,
        }

    def create_vocabulary_item(
        self,
        source_text: str,
        target_text: str,
        list_name: str,
        source_language: str = "en",
        target_language: str = "ru",
        difficulty_level: str | None = None,
        source_usage_example: str = "",
        target_usage_example: str = "",
    ) -> dict:
        url = f"{self.base_url}/api/admin/vocabulary"
        data = {
            "sourceText": source_text,
            "sourceLanguage": source_language,
            "targetText": target_text,
            "targetLanguage": target_language,
            "listName": list_name,
            "difficultyLevel": difficulty_level,
            "sourceUsageExample": source_usage_example,
            "targetUsageExample": target_usage_example,
        }

        try:
            response = requests.post(url, headers=self._get_headers(), json=data, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise VocabularyCreateError(source_text, e) from e

    def fetch_vocabulary(self, list_name: str) -> list[VocabularyEntry]:
        url = f"{self.base_url}/api/translations"
        params = {"list_name": list_name}

        try:
            response = requests.get(url, headers=self._get_headers(), params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            return [VocabularyEntry.from_api_dict(item) for item in data]
        except requests.RequestException as e:
            raise VocabularyFetchError(list_name, e) from e

    def search_vocabulary(self, query: str, limit: int = 100) -> list[VocabularyEntry]:
        url = f"{self.base_url}/api/admin/vocabulary/search"
        params = {"query": query, "limit": limit}

        response = requests.get(url, headers=self._get_headers(), params=params, timeout=30)
        response.raise_for_status()

        data = response.json()
        return [VocabularyEntry.from_api_dict(item) for item in data]

    def list_vocabulary(
        self, list_name: str | None = None, limit: int = 1000, offset: int = 0
    ) -> list[VocabularyEntry]:
        url = f"{self.base_url}/api/admin/vocabulary"
        params: dict[str, str | int] = {"limit": limit, "offset": offset}
        if list_name:
            params["list_name"] = list_name

        response = requests.get(url, headers=self._get_headers(), params=params, timeout=30)
        response.raise_for_status()

        data = response.json()
        return [VocabularyEntry.from_api_dict(item) for item in data]

    def update_vocabulary_item(
        self,
        item_id: str,
        list_name: str | None = None,
        source_text: str | None = None,
        target_text: str | None = None,
        source_usage_example: str | None = None,
        target_usage_example: str | None = None,
        difficulty_level: str | None = None,
        is_active: bool | None = None,
    ) -> dict:
        url = f"{self.base_url}/api/admin/vocabulary/{item_id}"
        data = {}

        if list_name is not None:
            data["listName"] = list_name
        if source_text is not None:
            data["sourceText"] = source_text
        if target_text is not None:
            data["targetText"] = target_text
        if source_usage_example is not None:
            data["sourceUsageExample"] = source_usage_example
        if target_usage_example is not None:
            data["targetUsageExample"] = target_usage_example
        if difficulty_level is not None:
            data["difficultyLevel"] = difficulty_level
        if is_active is not None:
            data["isActive"] = is_active

        try:
            response = requests.put(url, headers=self._get_headers(), json=data, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise VocabularyUpdateError(item_id, e) from e


def get_api_client() -> StagingAPIClient:
    return StagingAPIClient()


class VocabularyAPIAdapter:
    def __init__(self, base_url: str | None = None, token: str | None = None):
        self.client = StagingAPIClient(base_url, token)
        self._list_names_cache: dict[str, list[str]] | None = None

    def _get_all_list_names(self) -> dict[str, list[str]]:
        if self._list_names_cache is not None:
            return self._list_names_cache

        url = f"{self.client.base_url}/api/word-lists"
        response = requests.get(url, headers=self.client._get_headers(), timeout=30)
        response.raise_for_status()
        word_lists = response.json()

        list_names_by_lang: dict[str, set[str]] = {}
        for item in word_lists:
            list_name = item.get("listName", "")
            if list_name:
                lang_code = self._extract_language_code(list_name)
                if lang_code not in list_names_by_lang:
                    list_names_by_lang[lang_code] = set()
                list_names_by_lang[lang_code].add(list_name)

        self._list_names_cache = {lang: sorted(names) for lang, names in list_names_by_lang.items()}
        return self._list_names_cache

    def _extract_language_code(self, list_name: str) -> str:
        from .naming import extract_language_code

        return extract_language_code(list_name)

    def _list_name_to_filename(self, list_name: str) -> str:
        from .naming import list_name_to_filename

        return list_name_to_filename(list_name)

    def _filename_to_list_name(self, filename: str) -> str:
        from .naming import filename_to_list_name

        return filename_to_list_name(filename)

    def discover_migration_files(self) -> dict[str, list[str]]:
        list_names = self._get_all_list_names()
        result: dict[str, list[str]] = {}

        for lang_code, names in list_names.items():
            filenames = [self._list_name_to_filename(name) for name in names]
            result[lang_code] = filenames

        return result

    def parse_migration_file(self, filename: str) -> list[VocabularyEntry]:
        list_name = self._filename_to_list_name(filename)
        return self.client.fetch_vocabulary(list_name)

    def get_vocabulary_by_list(self, list_name: str) -> list[VocabularyEntry]:
        return self.client.fetch_vocabulary(list_name)


def get_vocabulary_adapter() -> VocabularyAPIAdapter:
    return VocabularyAPIAdapter()
