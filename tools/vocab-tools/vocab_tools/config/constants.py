from functools import lru_cache
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .config_loader import ConfigLoader


@lru_cache(maxsize=1)
def _get_config_loader() -> "ConfigLoader":
    from .config_loader import get_config_loader

    return get_config_loader()


@lru_cache(maxsize=1)
def _get_config():
    return _get_config_loader().config


def _get_essential_vocabulary_categories() -> list[str]:
    return _get_config().essential_vocabulary_categories


def _get_default_analysis_config() -> dict:
    return _get_config().analysis_defaults.model_dump()


def _get_supported_languages() -> list[str]:
    return list(_get_config().languages.keys())


@lru_cache(maxsize=1)
def _get_analysis_skip_words() -> frozenset[str]:
    all_skip_words: set[str] = set()
    config = _get_config()
    for lang_code in config.languages.keys():
        lang_config = config.languages[lang_code]
        all_skip_words.update(lang_config.skip_words)
    return frozenset(all_skip_words)


@lru_cache(maxsize=1)
def _get_word_category_mapping() -> dict:
    config = _get_config()
    for lang_code in config.languages.keys():
        return config.languages[lang_code].pos_categories.model_dump()
    return {}


@lru_cache(maxsize=1)
def _get_nlp_model_preferences() -> dict[str, list[str]]:
    config = _get_config()
    return {lang_code: lang_config.spacy_models for lang_code, lang_config in config.languages.items()}


_LAZY_ATTRS = {
    "ESSENTIAL_VOCABULARY_CATEGORIES": _get_essential_vocabulary_categories,
    "DEFAULT_ANALYSIS_CONFIG": _get_default_analysis_config,
    "SUPPORTED_LANGUAGES": _get_supported_languages,
    "ANALYSIS_SKIP_WORDS": lambda: set(_get_analysis_skip_words()),
    "WORD_CATEGORY_MAPPING": _get_word_category_mapping,
    "NLP_MODEL_PREFERENCES": _get_nlp_model_preferences,
}


def __getattr__(name: str):
    if name in _LAZY_ATTRS:
        return _LAZY_ATTRS[name]()
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


BASE_POS_DESCRIPTIONS = {
    "NOUN": "noun",
    "PROPN": "proper noun",
    "VERB": "verb",
    "ADJ": "adjective",
    "ADV": "adverb",
    "DET": "determiner",
    "PRON": "pronoun",
    "ADP": "preposition",
    "CONJ": "conjunction",
    "SCONJ": "subordinating conjunction",
    "NUM": "number",
    "PART": "particle",
    "AUX": "auxiliary verb",
    "INTJ": "interjection",
}


def get_pos_description(pos_tag: str, language_prefix: str | None = None) -> str:
    base_description = BASE_POS_DESCRIPTIONS.get(pos_tag, "word")

    if language_prefix:
        return f"{language_prefix} {base_description}"

    return base_description


RANK_NOT_FOUND = 999999

RANK_CRITICAL = 100
RANK_HIGH_PRIORITY = 500
RANK_MEDIUM_PRIORITY = 1000
RANK_VERY_COMMON = 1000
RANK_LEGITIMATE = 5000
RANK_LOW_PRIORITY = 10000
RANK_VERY_RARE = 10000

LEMMATIZATION_BATCH_SIZE = 1000

BATCH_PROGRESS_INTERVAL = 5000
BATCH_PROGRESS_INTERVAL_LARGE = 10000

MAX_WORD_LENGTH = 100

MAX_STORED_RESULTS = 500

FREQUENCY_REPLACEMENT_MARGIN = 1.2

FALLBACK_CUMULATIVE_TOTAL = 1500

DEFAULT_QUALITY_SCORE = 100.0

MIGRATION_ID_BASE = 10000000
MIGRATION_SOURCE_ID_BASE = 10000001
MIGRATION_TARGET_ID_BASE = 10000002
MIGRATION_ID_STEP = 2

CEFR_LEVELS = ["a0", "a1", "a2", "b1", "b2", "c1", "c2", "d"]

DEFAULT_CEFR_LEVEL = "a1"

LANGUAGE_ALIASES = {
    "es": "es",
    "spanish": "es",
    "español": "es",
    "de": "de",
    "german": "de",
    "deutsch": "de",
    "en": "en",
    "english": "en",
    "ru": "ru",
    "russian": "ru",
    "русский": "ru",
}

LANGUAGE_CODE_TO_NAME = {
    "en": "English",
    "es": "Spanish",
    "de": "German",
    "ru": "Russian",
}

LEVEL_ALIASES = {
    "a0": "A0",
    "a1": "A1",
    "a2": "A2",
    "b1": "B1",
    "b2": "B2",
    "c1": "C1",
    "c2": "C2",
}

LANGUAGE_NAME_TO_CODE = {v.lower(): k for k, v in LANGUAGE_CODE_TO_NAME.items()}


def get_language_name(code: str) -> str:
    return LANGUAGE_CODE_TO_NAME.get(code.lower(), code.title())


def get_language_code(name_or_alias: str) -> str | None:
    key = name_or_alias.lower().strip()
    if key in LANGUAGE_ALIASES:
        return LANGUAGE_ALIASES[key]
    return None


def normalize_language_code(value: str) -> str | None:
    value_lower = value.lower().strip()
    if value_lower in LANGUAGE_CODE_TO_NAME:
        return value_lower
    return LANGUAGE_ALIASES.get(value_lower)


def is_critical_rank(rank: int) -> bool:
    return rank <= RANK_CRITICAL


def is_high_priority_rank(rank: int) -> bool:
    return rank <= RANK_HIGH_PRIORITY


def is_medium_priority_rank(rank: int) -> bool:
    return rank <= RANK_MEDIUM_PRIORITY


def is_rare_rank(rank: int) -> bool:
    return rank > RANK_VERY_RARE


def get_priority_category(rank: int) -> str:
    if rank <= RANK_CRITICAL:
        return "CRITICAL"
    if rank <= RANK_HIGH_PRIORITY:
        return "HIGH"
    if rank <= RANK_MEDIUM_PRIORITY:
        return "MEDIUM"
    if rank <= RANK_LOW_PRIORITY:
        return "LOW"
    return "VERY_RARE"
