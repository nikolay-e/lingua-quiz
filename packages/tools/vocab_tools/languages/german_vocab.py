from pathlib import Path

from ..config.constants import get_pos_description
from ..core.vocabulary_analyzer import VocabularyAnalyzer


class GermanVocabularyAnalyzer(VocabularyAnalyzer):
    _use_normalization = True

    def __init__(self, migrations_directory: Path = None, silent: bool = False):
        super().__init__("de", migrations_directory, silent=silent)

        from ..config.config_loader import get_config_loader

        config_loader = get_config_loader()
        lang_config = config_loader.get_language_config("de")
        self.german_articles = set(lang_config.get("normalization", {}).get("articles", []))

        if not silent:
            print("🇩🇪 Initializing German vocabulary analyzer...")

    def _pre_categorize_hook(self, word: str) -> str | None:
        if word.lower() in self.german_articles:
            return "function_words"
        return None

    def _generate_reason(self, word: str, pos_tag: str, morphology: str, rank: int | None = None) -> str:
        description = get_pos_description(pos_tag, language_prefix="German").capitalize()

        if morphology and pos_tag == "NOUN":
            if "Gender=Masc" in morphology:
                description += " (masculine)"
            elif "Gender=Fem" in morphology:
                description += " (feminine)"
            elif "Gender=Neut" in morphology:
                description += " (neuter)"

        return f"{description} - high frequency German vocabulary"
