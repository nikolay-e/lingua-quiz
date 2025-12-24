import os

from pydantic import BaseModel, ConfigDict, Field, field_validator

PIPELINE_STAGE_CHOICES = {
    "normalize",
    "validate",
    "lemmatize",
    "foreign_filter",
    "nlp",
    "inflection_filter",
    "categorize",
    "stats",
}


class ParallelizationConfig(BaseModel):
    default_workers: int = Field(default=14, ge=1, le=64)
    batch_size: int = Field(default=1000, ge=100, le=10000)
    backend: str = Field(default="loky", pattern="^(loky|multiprocessing|threading)$")

    @field_validator("default_workers", mode="before")
    @classmethod
    def resolve_default_workers(cls, v):
        if v == -1 or v is None:
            return os.cpu_count() or 4
        return v


class AnalysisDefaults(BaseModel):
    min_word_length: int = Field(ge=1, le=10)
    max_word_length: int = Field(ge=5, le=100)
    frequency_threshold: float = Field(gt=0)
    top_words_count: int = Field(ge=100)
    id_gap_threshold: int = Field(ge=10)
    ner_frequency_threshold: float | None = Field(default=0.0005, ge=0, le=1)
    dedup_frequency_replacement_margin: float = Field(default=1.2, ge=1.0, le=10.0)
    max_rank: int = Field(default=20000, ge=1000)
    fetch_buffer_multiplier: float = Field(default=1.5, ge=1.0, le=10.0)
    source_lemmatize: bool = Field(default=False)
    pipeline: list[str] = Field(default_factory=list)

    @field_validator("pipeline")
    @classmethod
    def validate_pipeline(cls, v: list[str]) -> list[str]:
        invalid = [stage for stage in v if stage not in PIPELINE_STAGE_CHOICES]
        if invalid:
            raise ValueError(f"Invalid pipeline stage(s): {', '.join(invalid)}")
        return v


class CEFRLevel(BaseModel):
    words: int = Field(ge=0)
    rank_range: list[int] = Field(min_length=2, max_length=2)
    zipf_threshold: float = Field(ge=0, le=10)
    coverage_target: str
    description: str

    @field_validator("rank_range")
    @classmethod
    def validate_rank_range(cls, v: list[int]) -> list[int]:
        if v[0] >= v[1]:
            raise ValueError("rank_range start must be less than end")
        return v


class Normalization(BaseModel):
    unicode_normalization_form: str = Field(pattern="^(NFC|NFD|NFKC|NFKD)$")
    preserve_diacritics: bool
    articles: list[str] = Field(default_factory=list)
    remove_hyphens: bool
    comma_separator: bool
    special_chars: list[str] = Field(default_factory=list)


class InflectionPatterns(BaseModel):
    plural_noun: list[str] = Field(default_factory=list)
    past_tense: list[str] = Field(default_factory=list)
    past_participle: list[str] = Field(default_factory=list)
    present_participle: list[str] = Field(default_factory=list)
    comparative: list[str] = Field(default_factory=list)
    superlative: list[str] = Field(default_factory=list)
    third_person: list[str] = Field(default_factory=list)


class MorphologyConfig(BaseModel):
    plural_singular_suffix_pairs: list[tuple[str, str]] = Field(default_factory=list)
    umlaut_pairs: dict[str, str] = Field(default_factory=dict)
    reverse_umlauts: dict[str, str] = Field(default_factory=dict)


class LemmatizationExceptions(BaseModel):
    short_lemmas: list[str]
    reason: str


class LemmatizationConfig(BaseModel):
    exceptions_map: dict[str, str] = Field(default_factory=dict)
    word_zipf_delta_threshold: float | None = Field(default=1.0, ge=0, le=10)


class InflectionExceptions(BaseModel):
    irregular_verbs: list[str] = Field(default_factory=list)
    aspectual_pairs_keep_both: bool | None = None
    reason: str | None = None


class Blacklist(BaseModel):
    contractions: list[str] = Field(default_factory=list)
    profanity: list[str]
    abbreviations: list[str]
    interjections: list[str]
    anglicisms: list[str] = Field(default_factory=list)
    slang: list[str] = Field(default_factory=list)
    proper_nouns: list[str]
    technical: list[str] = Field(default_factory=list)
    lemma_errors: list[str] = Field(default_factory=list)
    ocr_errors: list[str] = Field(default_factory=list)
    verb_inflections: list[str] = Field(default_factory=list)
    too_short: list[str] = Field(default_factory=list)


class ForeignLanguageFilter(BaseModel):
    language: str
    min_foreign_zipf: float = Field(default=4.0, ge=0, le=10)
    max_native_zipf: float = Field(default=3.0, ge=0, le=10)
    min_zipf_delta: float = Field(default=1.5, ge=0, le=10)


class Filtering(BaseModel):
    min_word_length: int = Field(ge=1, le=10)
    short_word_whitelist: list[str]
    inflection_frequency_ratio: float = Field(ge=0, le=1)
    raw_frequency_multiplier: float = Field(default=2.5, ge=1.0, le=10.0)
    test_whitelist: list[str]
    ner_frequency_threshold: float | None = Field(default=None, ge=0, le=1)
    ner_whitelist: list[str] = Field(default_factory=list)
    exclude_patterns: list[str] = Field(default_factory=list)
    foreign_language_filters: list[ForeignLanguageFilter] = Field(default_factory=list)
    pipeline_override: list[str] = Field(default_factory=list)

    @field_validator("pipeline_override")
    @classmethod
    def validate_pipeline_override(cls, v: list[str]) -> list[str]:
        invalid = [stage for stage in v if stage not in PIPELINE_STAGE_CHOICES]
        if invalid:
            raise ValueError(f"Invalid pipeline stage(s): {', '.join(invalid)}")
        return v


class POSCategories(BaseModel):
    essential_nouns: list[str]
    essential_verbs: list[str]
    essential_adjectives: list[str]
    function_words: list[str]
    modifiers: list[str] = Field(default_factory=list)
    connectors: list[str] = Field(default_factory=list)


class LanguageConfig(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str
    wordfreq_code: str
    spacy_models: list[str] = Field(min_length=1)
    stanza_code: str | None = None
    max_word_length: int | None = Field(default=None, ge=5, le=100)
    plugin: str | None = None

    normalization: Normalization
    morphology: MorphologyConfig | None = None
    inflection_patterns: InflectionPatterns
    inflection_exceptions: InflectionExceptions | None = None
    lemmatization_exceptions: LemmatizationExceptions
    lemmatization: LemmatizationConfig | None = None
    skip_words: list[str] = Field(default_factory=list)
    blacklist: Blacklist
    filtering: Filtering
    pos_categories: POSCategories

    @field_validator("wordfreq_code")
    @classmethod
    def validate_wordfreq_code(cls, v: str) -> str:
        if not v.islower():
            raise ValueError("wordfreq_code must be lowercase")
        return v


class Config(BaseModel):
    model_config = ConfigDict(extra="allow")

    parallelization: ParallelizationConfig = Field(default_factory=ParallelizationConfig)
    analysis_defaults: AnalysisDefaults
    cefr_levels: dict[str, CEFRLevel]
    cefr_cumulative_totals: dict[str, int]
    languages: dict[str, LanguageConfig]
    essential_vocabulary_categories: list[str] = Field(default_factory=list)

    @field_validator("cefr_levels")
    @classmethod
    def validate_cefr_levels(cls, v: dict[str, CEFRLevel]) -> dict[str, CEFRLevel]:
        required_levels = {"a1", "a2", "b1", "b2"}
        missing = required_levels - set(v.keys())
        if missing:
            raise ValueError(f"Missing required CEFR levels: {missing}")
        return v

    @field_validator("cefr_cumulative_totals")
    @classmethod
    def validate_cefr_cumulative_totals(cls, v: dict[str, int]) -> dict[str, int]:
        required_levels = {"a1", "a2", "b1", "b2"}
        missing = required_levels - set(v.keys())
        if missing:
            raise ValueError(f"Missing required CEFR cumulative totals: {missing}")

        # Validate all values are non-negative
        for level, count in v.items():
            if count < 0:
                raise ValueError(f"CEFR cumulative total for {level} must be non-negative, got {count}")

        standard_order = ["a0", "a1", "a2", "b1", "b2", "c1", "c2"]
        prev_count = -1
        for level in standard_order:
            if level in v:
                if v[level] < prev_count:
                    raise ValueError(
                        f"CEFR cumulative totals must be non-decreasing: {level}={v[level]} < previous={prev_count}"
                    )
                prev_count = v[level]

        return v

    @field_validator("languages")
    @classmethod
    def validate_languages(cls, v: dict[str, LanguageConfig]) -> dict[str, LanguageConfig]:
        if not v:
            raise ValueError("At least one language must be configured")
        return v

    def get_language(self, code: str) -> LanguageConfig | None:
        return self.languages.get(code)

    def get_cefr_level(self, level: str) -> CEFRLevel | None:
        return self.cefr_levels.get(level.lower())

    def get_all_blacklist_words(self, language_code: str) -> list[str]:
        lang_config = self.get_language(language_code)
        if not lang_config:
            return []

        blacklist = lang_config.blacklist
        all_words = []

        # Flatten all blacklist categories
        all_words.extend(blacklist.contractions)
        all_words.extend(blacklist.profanity)
        all_words.extend(blacklist.abbreviations)
        all_words.extend(blacklist.interjections)
        all_words.extend(blacklist.anglicisms)
        all_words.extend(blacklist.slang)
        all_words.extend(blacklist.proper_nouns)
        all_words.extend(blacklist.technical)
        all_words.extend(blacklist.lemma_errors)
        all_words.extend(blacklist.ocr_errors)
        all_words.extend(blacklist.verb_inflections)
        all_words.extend(blacklist.too_short)

        return all_words
