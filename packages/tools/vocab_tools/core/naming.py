from ..config.constants import LANGUAGE_CODE_TO_NAME, LANGUAGE_NAME_TO_CODE, get_language_name

DEFAULT_TARGET_LANGUAGE = "Russian"


def list_name_to_filename(list_name: str) -> str:
    parts = list_name.split()
    if len(parts) >= 3:
        lang = parts[0].lower()
        level = parts[-1].lower()
        return f"{lang}-{level}.json"
    return f"{list_name.lower().replace(' ', '-')}.json"


def filename_to_list_name(filename: str, target_language: str = DEFAULT_TARGET_LANGUAGE) -> str:
    name = filename.replace(".json", "")
    parts = name.split("-")
    if len(parts) == 2:
        lang, level = parts
        lang_name = get_language_name(lang)
        return f"{lang_name} {target_language} {level.upper()}"
    return name


def normalize_list_name(name: str, target_language: str = DEFAULT_TARGET_LANGUAGE) -> str:
    parts = name.lower().replace("-", " ").split()
    if len(parts) == 2:
        lang_code, level = parts
        lang_name = get_language_name(lang_code)
        return f"{lang_name} {target_language} {level.upper()}"
    return name


def build_list_name(lang_code: str, level: str, target_language: str = DEFAULT_TARGET_LANGUAGE) -> str:
    lang_name = LANGUAGE_CODE_TO_NAME.get(lang_code, lang_code.title())
    return f"{lang_name} {target_language} {level.upper()}"


def extract_language_code(list_name: str) -> str:
    parts = list_name.lower().split()
    if len(parts) >= 2:
        source_lang = parts[0]
        return LANGUAGE_NAME_TO_CODE.get(source_lang, source_lang[:2])
    return "unknown"


def extract_language_code_from_filename(filename: str) -> str:
    name = filename.replace(".json", "")
    parts = name.split("-")
    if len(parts) >= 1:
        source_lang = parts[0].lower()
        return LANGUAGE_NAME_TO_CODE.get(source_lang, source_lang[:2] if len(source_lang) > 2 else source_lang)
    return "unknown"


__all__ = [
    "list_name_to_filename",
    "filename_to_list_name",
    "normalize_list_name",
    "build_list_name",
    "extract_language_code",
    "extract_language_code_from_filename",
    "DEFAULT_TARGET_LANGUAGE",
]
