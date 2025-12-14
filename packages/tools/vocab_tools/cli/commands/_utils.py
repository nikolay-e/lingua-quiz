"""Shared utilities for CLI commands."""


def get_list_name(lang_code: str, level: str) -> str:
    """Convert lang_code and level to API list name format."""
    lang_map = {"en": "English", "es": "Spanish", "de": "German", "ru": "Russian"}
    lang_name = lang_map.get(lang_code, lang_code.title())
    return f"{lang_name} Russian {level.upper()}"


def resolve_language_alias(language_level: str) -> tuple[str, str]:
    """Parse language-level string like 'en-a1' or 'spanish-a1'."""
    lang_aliases = {
        "english": "en",
        "spanish": "es",
        "german": "de",
        "russian": "ru",
    }

    parts = language_level.lower().replace("_", "-").split("-")
    if len(parts) != 2:
        raise ValueError(f"Invalid format: {language_level}. Use 'en-a1' or 'spanish-a1'")

    lang, level = parts
    lang_code = lang_aliases.get(lang, lang)

    valid_levels = ["a0", "a1", "a2", "b1", "b2", "c1", "c2"]
    if level not in valid_levels:
        raise ValueError(f"Invalid level: {level}. Use one of: {', '.join(valid_levels)}")

    return lang_code, level
