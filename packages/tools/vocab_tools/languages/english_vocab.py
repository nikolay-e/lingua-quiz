from pathlib import Path

from ..config.constants import get_pos_description
from ..core.vocabulary_analyzer import VocabularyAnalyzer


class EnglishVocabularyAnalyzer(VocabularyAnalyzer):
    _use_normalization = False

    def __init__(self, migrations_directory: Path = None, silent: bool = False):
        super().__init__("en", migrations_directory, silent=silent)
        if not silent:
            print("󠁧󠁢󠁥󠁮󠁧󠁿 Initializing English vocabulary analyzer...")

    def _generate_reason(self, word: str, pos_tag: str, morphology: str, rank: int | None = None) -> str:
        description = get_pos_description(pos_tag).capitalize()

        if morphology:
            if "Number=Plur" in morphology and pos_tag == "NOUN":
                description = "Plural noun"
            elif "Degree=Cmp" in morphology and pos_tag == "ADJ":
                description = "Comparative adjective"
            elif "Degree=Sup" in morphology and pos_tag == "ADJ":
                description = "Superlative adjective"
            elif "Tense=Past" in morphology and pos_tag == "VERB":
                description = "Past tense verb"

        if rank:
            return f"Top {rank:,} word; classified as {description.lower()}"
        return f"High frequency {description.lower()}"
