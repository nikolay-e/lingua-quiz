from pathlib import Path

import yaml
from pydantic import ValidationError

from .models import Config


class ConfigLoader:
    _instance = None
    _config: Config = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._load_config()
        return cls._instance

    def _load_config(self):
        config_path = Path(__file__).parent.parent.parent / "config.yaml"

        if not config_path.exists():
            raise FileNotFoundError(f"Configuration file not found at {config_path}")

        try:
            with open(config_path, encoding="utf-8") as f:
                raw_config = yaml.safe_load(f)

            self._config = Config(**raw_config)

        except ValidationError as e:
            raise ValueError(f"Configuration validation failed:\n{e}") from e

    @property
    def config(self) -> Config:
        return self._config

    def get_language_config(self, language_code: str) -> dict:
        lang_config = self._config.get_language(language_code)
        if not lang_config:
            raise ValueError(f"Unsupported language code: {language_code}")
        return lang_config.model_dump()

    def get_supported_languages(self) -> list[str]:
        return list(self._config.languages.keys())

    def get_analysis_defaults(self) -> dict:
        return self._config.analysis_defaults.model_dump()

    def get_essential_vocabulary_categories(self) -> list[str]:
        return []

    def get_language_name(self, language_code: str) -> str:
        lang_config = self._config.get_language(language_code)
        if not lang_config:
            raise ValueError(f"Unsupported language code: {language_code}")
        return lang_config.name

    def get_wordfreq_code(self, language_code: str) -> str:
        lang_config = self._config.get_language(language_code)
        if not lang_config:
            return language_code
        return lang_config.wordfreq_code

    def get_spacy_models(self, language_code: str) -> list[str]:
        lang_config = self._config.get_language(language_code)
        if not lang_config:
            raise ValueError(f"Unsupported language code: {language_code}")
        return lang_config.spacy_models

    def get_skip_words(self, language_code: str) -> set[str]:
        lang_config = self._config.get_language(language_code)
        if not lang_config:
            return set()
        return set(lang_config.skip_words)

    def get_pos_categories(self, language_code: str) -> dict:
        lang_config = self._config.get_language(language_code)
        if not lang_config:
            raise ValueError(f"Unsupported language code: {language_code}")
        return lang_config.pos_categories.model_dump()

    def get_inflection_patterns(self, language_code: str) -> dict:
        lang_config = self._config.get_language(language_code)
        if not lang_config:
            raise ValueError(f"Unsupported language code: {language_code}")
        return lang_config.inflection_patterns.model_dump()

    def get_blacklist_words(self, language_code: str) -> list[str]:
        return self._config.get_all_blacklist_words(language_code)

    def get_filtering_config(self, language_code: str) -> dict:
        lang_config = self._config.get_language(language_code)
        if not lang_config:
            raise ValueError(f"Unsupported language code: {language_code}")
        return lang_config.filtering.model_dump()

    def get_cumulative_total(self, level: str) -> int:
        cumulative_totals = self._config.cefr_cumulative_totals
        return cumulative_totals.get(level.lower(), 1500)

    def get_raw_frequency_multiplier(self, language_code: str) -> float:
        lang_config = self._config.get_language(language_code)
        if not lang_config:
            return 2.5  # Default fallback
        return lang_config.filtering.raw_frequency_multiplier


def get_config_loader() -> ConfigLoader:
    return ConfigLoader()
