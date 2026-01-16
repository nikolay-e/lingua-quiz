from .config_loader import get_config_loader

_config_loader = get_config_loader()
_config = _config_loader.config

ESSENTIAL_VOCABULARY_CATEGORIES = _config.essential_vocabulary_categories

DEFAULT_ANALYSIS_CONFIG = _config.analysis_defaults.model_dump()

SUPPORTED_LANGUAGES = list(_config.languages.keys())

_all_skip_words: set[str] = set()
_all_pos_categories: dict = {}
_all_nlp_models: dict[str, list[str]] = {}

for lang_code in SUPPORTED_LANGUAGES:
    lang_config = _config.languages[lang_code]
    _all_skip_words.update(lang_config.skip_words)
    _all_nlp_models[lang_code] = lang_config.spacy_models

    if not _all_pos_categories:
        _all_pos_categories = lang_config.pos_categories.model_dump()

ANALYSIS_SKIP_WORDS: set[str] = _all_skip_words

WORD_CATEGORY_MAPPING = _all_pos_categories

NLP_MODEL_PREFERENCES = _all_nlp_models

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
    """
    Get description for a POS tag.

    Args:
        pos_tag: Part-of-speech tag (e.g., "NOUN", "VERB")
        language_prefix: Optional language prefix (e.g., "German", "Spanish")

    Returns:
        Description string (e.g., "noun", "German noun", "Spanish verb")
    """
    base_description = BASE_POS_DESCRIPTIONS.get(pos_tag, "word")

    if language_prefix:
        return f"{language_prefix} {base_description}"

    return base_description


# ============================================================================
# FREQUENCY RANKS & THRESHOLDS
# ============================================================================

# Rank assigned to words not found in frequency lists
RANK_NOT_FOUND = 999999

# Frequency rank thresholds for word categorization
RANK_CRITICAL = 100  # Critical missing words (top 100)
RANK_HIGH_PRIORITY = 500  # High priority words (top 500)
RANK_MEDIUM_PRIORITY = 1000  # Medium priority words (top 1000)
RANK_VERY_COMMON = 1000  # Very common words threshold
RANK_LEGITIMATE = 5000  # Legitimate vocabulary threshold
RANK_LOW_PRIORITY = 10000  # Low priority threshold
RANK_VERY_RARE = 10000  # Very rare words threshold


# ============================================================================
# BATCH PROCESSING
# ============================================================================

# Batch size for lemmatization operations
LEMMATIZATION_BATCH_SIZE = 1000

# Progress reporting interval for batch processing
BATCH_PROGRESS_INTERVAL = 5000  # Report every 5000 words
BATCH_PROGRESS_INTERVAL_LARGE = 10000  # For large datasets


# ============================================================================
# VALIDATION LIMITS
# ============================================================================

# Maximum word length in characters
MAX_WORD_LENGTH = 100

# History storage limits
MAX_STORED_RESULTS = 500  # Keep last 500 analysis runs


# ============================================================================
# DEDUPLICATION & FREQUENCY COMPARISON
# ============================================================================

# Frequency margin for replacement (20% higher to replace)
FREQUENCY_REPLACEMENT_MARGIN = 1.2


# ============================================================================
# FALLBACK VALUES
# ============================================================================

# Fallback cumulative total for unknown CEFR levels
FALLBACK_CUMULATIVE_TOTAL = 1500

# Default quality score for empty datasets
DEFAULT_QUALITY_SCORE = 100.0


# ============================================================================
# MIGRATION ID OFFSETS
# ============================================================================

# Base offsets for migration ID generation
# Used in vocabulary_exporter.py for deterministic ID assignment
MIGRATION_ID_BASE = 10000000
MIGRATION_SOURCE_ID_BASE = 10000001
MIGRATION_TARGET_ID_BASE = 10000002
MIGRATION_ID_STEP = 2  # Increment by 2 for each word pair


# ============================================================================
# CEFR LEVEL DEFINITIONS
# ============================================================================

# CEFR level hierarchy (for previous level calculations)
CEFR_LEVELS = ["a0", "a1", "a2", "b1", "b2", "c1", "c2", "d"]

# Default CEFR level for fallback
DEFAULT_CEFR_LEVEL = "a1"


# ============================================================================
# LANGUAGE DEFINITIONS
# ============================================================================

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


# ============================================================================
# LANGUAGE HELPER FUNCTIONS
# ============================================================================


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


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def is_critical_rank(rank: int) -> bool:
    """Check if rank is in critical range (top 100)."""
    return rank <= RANK_CRITICAL


def is_high_priority_rank(rank: int) -> bool:
    """Check if rank is in high priority range (top 500)."""
    return rank <= RANK_HIGH_PRIORITY


def is_medium_priority_rank(rank: int) -> bool:
    """Check if rank is in medium priority range (top 1000)."""
    return rank <= RANK_MEDIUM_PRIORITY


def is_rare_rank(rank: int) -> bool:
    """Check if rank indicates very rare word (> 10000)."""
    return rank > RANK_VERY_RARE


def get_priority_category(rank: int) -> str:
    """
    Get priority category for given rank.

    Args:
        rank: Frequency rank (1-based)

    Returns:
        Priority category: "CRITICAL", "HIGH", "MEDIUM", "LOW", or "VERY_RARE"
    """
    if rank <= RANK_CRITICAL:
        return "CRITICAL"
    if rank <= RANK_HIGH_PRIORITY:
        return "HIGH"
    if rank <= RANK_MEDIUM_PRIORITY:
        return "MEDIUM"
    if rank <= RANK_LOW_PRIORITY:
        return "LOW"
    return "VERY_RARE"
