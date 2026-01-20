from typing import Protocol

from .models import VocabularyEntry


class VocabularyRepository(Protocol):
    def fetch_vocabulary(self, list_name: str) -> list[VocabularyEntry]: ...

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
    ) -> str: ...

    def update_vocabulary_item(
        self,
        item_id: str,
        source_text: str | None = None,
        target_text: str | None = None,
        source_usage_example: str | None = None,
        target_usage_example: str | None = None,
        difficulty_level: str | None = None,
        is_active: bool | None = None,
    ) -> bool: ...

    def delete_vocabulary_item(self, item_id: str) -> bool: ...


def word_differs(entry: VocabularyEntry, word_dict: dict, check_source: bool = True) -> bool:
    if check_source and entry.source_text != word_dict.get("sourceText", ""):
        return True
    if entry.target_text != word_dict.get("targetText", ""):
        return True
    if (entry.source_usage_example or "") != (word_dict.get("sourceUsageExample") or ""):
        return True
    if (entry.target_usage_example or "") != (word_dict.get("targetUsageExample") or ""):
        return True
    return False


def entry_to_dict(entry: VocabularyEntry) -> dict:
    return entry.to_api_dict()


def build_update_params(word_dict: dict) -> dict:
    params = {}
    if "sourceText" in word_dict:
        params["source_text"] = word_dict["sourceText"]
    if "targetText" in word_dict:
        params["target_text"] = word_dict["targetText"]
    if "sourceUsageExample" in word_dict:
        params["source_usage_example"] = word_dict["sourceUsageExample"]
    if "targetUsageExample" in word_dict:
        params["target_usage_example"] = word_dict["targetUsageExample"]
    if "difficultyLevel" in word_dict:
        params["difficulty_level"] = word_dict["difficultyLevel"]
    return params
