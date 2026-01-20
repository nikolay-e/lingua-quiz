import json
from datetime import UTC, datetime
from pathlib import Path

from .models import VocabularyEntry
from .naming import extract_language_code


def load_vocabulary_json(file_path: Path) -> tuple[str, list[dict]]:
    with open(file_path, encoding="utf-8") as f:
        data = json.load(f)

    list_name = data.get("listName", "")
    words = data.get("words", [])

    if not list_name and "translations" in data:
        list_name = data.get("word_list_name", "")
        words = [
            {
                "id": t.get("id"),
                "sourceText": t.get("source_word", ""),
                "targetText": t.get("target_word", ""),
                "sourceUsageExample": t.get("source_example", ""),
                "targetUsageExample": t.get("target_example", ""),
            }
            for t in data.get("translations", [])
        ]

    return list_name, words


def save_vocabulary_json(
    file_path: Path,
    words: list[dict] | list[VocabularyEntry],
    list_name: str,
    timestamp_key: str = "exportedAt",
) -> None:
    if words and isinstance(words[0], VocabularyEntry):
        words_data = [entry.to_api_dict() for entry in words]
    else:
        words_data = words

    data = {
        "listName": list_name,
        timestamp_key: datetime.now(UTC).isoformat(),
        "totalWords": len(words_data),
        "words": words_data,
    }

    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def load_vocabulary_words(file_path: Path) -> list[dict]:
    if not file_path.exists():
        return []

    try:
        with open(file_path, encoding="utf-8") as f:
            data = json.load(f)
        return data.get("words", [])
    except Exception:
        return []


def extract_source_language_from_list(list_name: str) -> str:
    code = extract_language_code(list_name)
    return code if code != "unknown" else "en"


def load_translation_file(file_path: Path) -> dict:
    if not file_path.exists():
        return {}
    with open(file_path, encoding="utf-8") as f:
        return json.load(f)


def save_translation_file(file_path: Path, data: dict) -> None:
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


__all__ = [
    "load_vocabulary_json",
    "save_vocabulary_json",
    "load_vocabulary_words",
    "extract_source_language_from_list",
    "load_translation_file",
    "save_translation_file",
]
