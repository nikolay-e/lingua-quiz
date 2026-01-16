from pathlib import Path

from ..config.constants import get_pos_description
from ..core.vocabulary_analyzer import VocabularyAnalyzer


class SpanishVocabularyAnalyzer(VocabularyAnalyzer):
    _use_normalization = True

    def __init__(self, migrations_directory: Path = None, silent: bool = False):
        super().__init__("es", migrations_directory, silent=silent)

        from ..config.config_loader import get_config_loader

        config_loader = get_config_loader()
        lang_config = config_loader.get_language_config("es")
        self.spanish_articles = set(lang_config.get("normalization", {}).get("articles", []))

        if not silent:
            print("🇪🇸 Initializing Spanish vocabulary analyzer...")

    def _pre_categorize_hook(self, word: str) -> str | None:
        if word.lower() in self.spanish_articles:
            return "function_words"
        return None

    def _generate_reason(self, word: str, pos_tag: str, morphology: str, rank: int | None = None) -> str:
        description = get_pos_description(pos_tag, language_prefix="Spanish").capitalize()

        if morphology and pos_tag in ["NOUN", "ADJ"]:
            if "Gender=Masc" in morphology and "Number=Sing" in morphology:
                description += " (masculine singular)"
            elif "Gender=Fem" in morphology and "Number=Sing" in morphology:
                description += " (feminine singular)"
            elif "Gender=Masc" in morphology and "Number=Plur" in morphology:
                description += " (masculine plural)"
            elif "Gender=Fem" in morphology and "Number=Plur" in morphology:
                description += " (feminine plural)"

        return f"{description} - high frequency Spanish vocabulary"
