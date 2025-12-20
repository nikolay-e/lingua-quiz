"""Shared utilities for CLI commands."""

from ..auto_config import get_list_name, resolve_language_alias

LANG_MAPPING = {
    "es": "Spanish",
    "en": "English",
    "de": "German",
    "ru": "Russian",
}


def normalize_list_name(name: str) -> str:
    parts = name.lower().replace("-", " ").split()
    if len(parts) == 2:
        lang_code, level = parts
        lang_name = LANG_MAPPING.get(lang_code, lang_code.title())
        return f"{lang_name} Russian {level.upper()}"
    return name


def list_name_to_filename(list_name: str) -> str:
    parts = list_name.split()
    if len(parts) >= 3:
        lang = parts[0].lower()
        level = parts[-1].lower()
        return f"{lang}-{level}.json"
    return f"{list_name.lower().replace(' ', '-')}.json"


def entry_to_dict(entry) -> dict:
    return {
        "id": entry.id,
        "sourceText": entry.source_text,
        "targetText": entry.target_text,
        "sourceLanguage": entry.source_language,
        "targetLanguage": entry.target_language,
        "listName": entry.list_name,
        "difficultyLevel": entry.difficulty_level,
        "sourceUsageExample": entry.source_usage_example,
        "targetUsageExample": entry.target_usage_example,
        "isActive": entry.is_active,
    }


__all__ = [
    "get_list_name",
    "resolve_language_alias",
    "LANG_MAPPING",
    "normalize_list_name",
    "list_name_to_filename",
    "entry_to_dict",
]
