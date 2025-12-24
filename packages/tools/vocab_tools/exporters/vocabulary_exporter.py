import json
from datetime import UTC, datetime
from pathlib import Path

from ..config.config_loader import get_config_loader
from ..core.vocabulary_processor import FilteredWord, ProcessedVocabulary


class VocabularyExporter:
    CAPITALIZE_NOUNS_LANGUAGES = {"de"}

    GERMAN_NOUN_SUFFIXES = (
        "heit",
        "keit",
        "ung",
        "schaft",
        "tion",
        "sion",
        "tät",
        "ling",
        "nis",
        "chen",
        "lein",
        "haus",
        "mann",
        "frau",
        "kind",
        "werk",
        "zeug",
        "stück",
        "welt",
        "land",
        "stadt",
        "platz",
        "straße",
        "zimmer",
        "buch",
        "geld",
        "zeit",
        "jahr",
        "tag",
        "nacht",
    )

    GERMAN_LIKELY_NOUNS = {
        "auto",
        "mist",
        "sex",
        "tisch",
        "stuhl",
        "bett",
        "wald",
        "field",
        "berg",
        "abend",
        "morgen",
        "mittag",
        "loch",
        "dach",
        "fach",
        "bach",
        "buch",
        "tuch",
        "such",
        "fluss",
        "see",
        "meer",
        "hund",
        "katze",
        "vogel",
        "fisch",
        "pferd",
        "kuh",
        "schwein",
        "huhn",
        "brot",
        "fleisch",
        "obst",
        "wein",
        "bier",
        "kaffee",
        "tee",
        "wasser",
        "milch",
        "saft",
        "suppe",
        "salat",
        "kuchen",
        "eis",
        "arzt",
        "chef",
        "freund",
        "feind",
        "gast",
        "held",
        "herr",
        "hut",
        "rock",
        "hemd",
        "schuh",
        "kleid",
        "anzug",
        "mantel",
        "jacke",
        "hose",
        "bluse",
        "pulli",
        "schal",
        "mütze",
        "arm",
        "bein",
        "kopf",
        "fuß",
        "hand",
        "finger",
        "ohr",
        "auge",
        "nase",
        "mund",
        "zahn",
        "haar",
        "herz",
        "blut",
        "knochen",
        "haut",
        "bauch",
        "rücken",
        "hals",
        "knie",
        "schulter",
        "ellbogen",
        # Dativ Plural nouns (often misclassified as verbs)
        "dingen",
        "nummern",
        "fingern",
        "bullen",
        "bomben",
        "sachen",
        "leuten",
        "kindern",
        "eltern",
        "männern",
        "frauen",
        "augen",
        "ohren",
        "händen",
        "füßen",
        "beinen",
        "armen",
        "schuhen",
        "büchern",
        "bildern",
        "wörtern",
        "liedern",
        "ländern",
        "städten",
        "häusern",
        "zimmern",
        "fenstern",
        "türen",
        "straßen",
        "wegen",
        "bäumen",
        "blumen",
        "tieren",
        "vögeln",
        "fischen",
        "pferden",
        "hunden",
        "katzen",
        # Common nouns misclassified
        "jungs",
        "gegend",
        "keller",
        "geschäft",
        "gegner",
        "geist",
        "moment",
        "problem",
        "thema",
        "system",
        "abendessen",
        "frühstück",
        "mittagessen",
        "bücher",
        "bilder",
        "wörter",
        "lieder",
        "kleider",
        "felder",
        "gelder",
        "länder",
        "männer",
        "väter",
        "mütter",
        "brüder",
        "töchter",
        "söhne",
        "schuhe",
        "pläne",
        "bäume",
        "träume",
        "räume",
        "häuser",
        "mäuse",
        "gläser",
        "messer",
        "fenster",
        "zimmer",
        "butter",
        "mutter",
        "vater",
        "bruder",
        "schwester",
        "tochter",
        "sohn",
    }

    def __init__(self, output_format: str = "json"):
        self.output_format = output_format
        self.config_loader = get_config_loader()

    def _is_likely_german_noun(self, word: str) -> bool:
        word_lower = word.lower()
        if word_lower in self.GERMAN_LIKELY_NOUNS:
            return True
        for suffix in self.GERMAN_NOUN_SUFFIXES:
            if word_lower.endswith(suffix) and len(word_lower) > len(suffix) + 1:
                return True
        return False

    def _format_word(self, word: str, pos: str, language_code: str) -> str:
        if language_code not in self.CAPITALIZE_NOUNS_LANGUAGES:
            return word
        if pos == "NOUN" or self._is_likely_german_noun(word):
            return word.capitalize()
        return word

    def export(self, vocab: ProcessedVocabulary, output_path: Path | str):
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        if self.output_format == "json":
            self._export_json(vocab, output_path)
        elif self.output_format == "csv":
            self._export_csv(vocab, output_path)
        elif self.output_format == "migration":
            self._export_migration_format(vocab, output_path)
        else:
            raise ValueError(f"Unsupported output format: {self.output_format}")

    def _export_json(self, vocab: ProcessedVocabulary, output_path: Path):
        language_name = self.config_loader.get_language_name(vocab.language_code)

        data = {
            "language": vocab.language_code,
            "language_name": language_name,
            "total_words": vocab.total_words,
            "filtered_count": vocab.filtered_count,
            "generated_at": datetime.now(UTC).isoformat(),
            "filtering_applied": {"removed_inflections": True, "removed_named_entities": True, "lemmatization": True},
            "words": [
                {
                    "rank": w.rank,
                    "word": self._format_word(w.word, w.pos_tag, vocab.language_code),
                    "lemma": self._format_word(w.lemma, w.pos_tag, vocab.language_code),
                    "frequency": w.frequency,
                    "pos": w.pos_tag,
                    "category": w.category,
                    "morphology": w.morphology,
                    "reason": w.reason,
                }
                for w in vocab.words
            ],
            "category_summary": {category: len(words) for category, words in vocab.categories.items()},
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def _export_csv(self, vocab: ProcessedVocabulary, output_path: Path):
        with open(output_path, "w", encoding="utf-8", newline="") as f:
            for w in vocab.words:
                f.write(f"{w.lemma}\n")

    def _export_migration_format(self, vocab: ProcessedVocabulary, output_path: Path):
        language_name = self.config_loader.get_language_name(vocab.language_code)

        data = {
            "source_language": language_name,
            "target_language": "Target Language",
            "word_list_name": f"{language_name} Frequency List",
            "translations": [
                {
                    "source_word": w.word,
                    "target_word": "[NEEDS TRANSLATION]",
                    "source_example": "",
                    "target_example": "",
                }
                for w in vocab.words
            ],
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def export_filtered(
        self,
        filtered_words: list[FilteredWord],
        language_code: str,
        output_path: Path | str,
    ):
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        language_name = self.config_loader.get_language_name(language_code)

        by_stage_reason: dict[str, list[dict]] = {}
        for fw in filtered_words:
            key = f"{fw.filter_stage}:{fw.filter_reason}"
            if key not in by_stage_reason:
                by_stage_reason[key] = []
            by_stage_reason[key].append(
                {
                    "word": fw.word,
                    "lemma": fw.lemma,
                    "pos": fw.pos_tag,
                    "frequency": fw.frequency,
                    "rank": fw.rank,
                }
            )

        data = {
            "language": language_code,
            "language_name": language_name,
            "total_filtered": len(filtered_words),
            "generated_at": datetime.now(UTC).isoformat(),
            "by_category": {
                key: {
                    "count": len(words),
                    "examples": words[:50],
                }
                for key, words in sorted(by_stage_reason.items(), key=lambda x: -len(x[1]))
            },
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
