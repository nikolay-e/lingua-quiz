import unicodedata
from typing import ClassVar, Literal

try:
    import stanza

    STANZA_AVAILABLE = True
except ImportError:
    STANZA_AVAILABLE = False

LanguageCodeType = Literal["en", "es", "de", "ru"]

STANZA_LANG_CODES = {
    "en": "en",
    "es": "es",
    "de": "de",
    "ru": "ru",
}


class StanzaLemmatizer:
    SPANISH_ENCLITIC_PRONOUNS: ClassVar[list[str]] = [
        "me",
        "te",
        "le",
        "lo",
        "la",
        "nos",
        "os",
        "les",
        "los",
        "las",
        "se",
    ]

    def __init__(self, language: LanguageCodeType):
        self.language = language
        self._pipeline = None
        self._exceptions_map: dict[str, str] = {}

        if self.language == "es":
            try:
                from ..config.config_loader import get_config_loader

                config_loader = get_config_loader()
                lang_config = config_loader.get_language_config(self.language)
                lemmatization = lang_config.get("lemmatization", {}) or {}
                self._exceptions_map = lemmatization.get("exceptions_map", {}) or {}
            except Exception:
                self._exceptions_map = {}

        if not STANZA_AVAILABLE:
            print("⚠️  Stanza not available. Install with: pip install stanza")
            print("   Falling back to spaCy lemmatization")
            return

        if language not in STANZA_LANG_CODES:
            print(f"⚠️  Stanza does not support language: {language}")
            print("   Falling back to spaCy lemmatization")
            return

        self._load_pipeline()

    def _remove_accents(self, text: str) -> str:
        return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")

    def _strip_spanish_enclitic_pronouns(self, word: str) -> tuple[str, str | None]:
        if self.language != "es":
            return word, None

        word_lower = word.lower()

        for pronoun in self.SPANISH_ENCLITIC_PRONOUNS:
            if word_lower.endswith(pronoun):
                base = word_lower[: -len(pronoun)]

                # Minimum length checks to prevent false matches
                if len(base) < 3:
                    continue

                # Check if base looks like a verb form
                # Infinitives (need 4+ chars to avoid: parte→par, suerte→suer)
                if len(base) >= 4 and base.endswith(("ar", "er", "ir")):
                    return base, pronoun

                # Gerunds (always safe - very specific endings)
                if base.endswith(("ando", "endo", "iendo")):
                    return base, pronoun

                # Imperatives (need 4+ chars to avoid: ese→e, clase→cla)
                # cállate → cálla (5 chars), darte → dar (3 chars - rejected)
                if len(base) >= 4 and base.endswith(("a", "e")):
                    return base, pronoun

        return word, None

    def _lemmatize_without_postprocessing(self, word: str) -> str:
        if not self.is_available():
            return word.lower()

        if not word:
            return ""

        try:
            doc = self._pipeline([[word]])
            if doc.sentences and len(doc.sentences) > 0 and doc.sentences[0].words:
                return doc.sentences[0].words[0].lemma.lower()
        except Exception:
            pass

        return word.lower()

    def _postprocess_spanish_lemma_with_pos(self, word: str, lemma: str, upos: str, feats: str | None) -> str:
        if self.language != "es":
            return lemma

        word_lower = word.lower()

        if word_lower in self._exceptions_map:
            return self._exceptions_map[word_lower]

        features = {}
        if feats:
            for feat in feats.split("|"):
                if "=" in feat:
                    key, value = feat.split("=", 1)
                    features[key] = value

        if upos == "VERB":
            verb_form = features.get("VerbForm")
            if verb_form == "Part" and lemma == word_lower:
                if word_lower.endswith("ado"):
                    return word_lower[:-3] + "ar"
                if word_lower.endswith("ido"):
                    return word_lower[:-3] + "er"
                if word_lower.endswith(("to", "cho", "so")):
                    pass

            base, pronoun = self._strip_spanish_enclitic_pronouns(word_lower)
            if pronoun:
                if base in self._exceptions_map:
                    return self._exceptions_map[base]

                if base.endswith(("ar", "er", "ir")):
                    return base

                if base.endswith(("ando", "endo", "iendo")):
                    base_no_accent = self._remove_accents(base)
                    return self._lemmatize_without_postprocessing(base_no_accent)

                if base.endswith(("a", "e")):
                    base_no_accent = self._remove_accents(base)
                    return self._lemmatize_without_postprocessing(base_no_accent)

        if upos == "ADJ":
            gender = features.get("Gender")
            if gender == "Fem" and lemma == word_lower and word_lower.endswith("a"):
                masculine = word_lower[:-1] + "o"
                return masculine

        return lemma

    def _postprocess_spanish_lemma(self, word: str, lemma: str) -> str:
        if self.language != "es":
            return lemma

        word_lower = word.lower()

        if word_lower in self._exceptions_map:
            return self._exceptions_map[word_lower]

        # Default: trust Stanza
        return lemma

    def _load_pipeline(self):
        if not STANZA_AVAILABLE:
            return

        stanza_lang = STANZA_LANG_CODES[self.language]

        try:
            self._pipeline = stanza.Pipeline(
                stanza_lang,
                processors="tokenize,pos,lemma",
                tokenize_pretokenized=True,
                verbose=False,
                download_method=None,
            )
            print(f"Stanza lemmatizer loaded for {self.language}")
        except Exception as e:
            print(f"⚠️  Failed to load Stanza pipeline: {e}")
            print(f"   Try: python -c \"import stanza; stanza.download('{stanza_lang}')\"")
            print("   Falling back to spaCy lemmatization")
            self._pipeline = None

    def is_available(self) -> bool:
        return self._pipeline is not None

    def lemmatize(self, word: str) -> str:
        if not self.is_available():
            return word.lower()

        if not word:
            return ""

        try:
            # Stanza expects list of sentences, each sentence is list of tokens
            doc = self._pipeline([[word]])
            if doc.sentences and len(doc.sentences) > 0 and doc.sentences[0].words:
                word_obj = doc.sentences[0].words[0]
                lemma = word_obj.lemma.lower()

                # Post-process for Spanish with POS tags
                if self.language == "es":
                    lemma = self._postprocess_spanish_lemma_with_pos(word, lemma, word_obj.upos, word_obj.feats)

                return lemma
        except Exception:
            pass

        return word.lower()

    def lemmatize_with_pos(self, word: str) -> list[tuple[str, str]]:
        if not self.is_available():
            return [(word.lower(), "UNKNOWN")]

        if not word:
            return []

        try:
            # Stanza expects list of sentences, each sentence is list of tokens
            doc = self._pipeline([[word]])
            results = []
            if doc.sentences and len(doc.sentences) > 0:
                for word_obj in doc.sentences[0].words:
                    lemma = word_obj.lemma.lower()
                    pos = word_obj.upos

                    # Post-process for Spanish with POS tags
                    if self.language == "es":
                        lemma = self._postprocess_spanish_lemma_with_pos(word, lemma, pos, word_obj.feats)

                    results.append((lemma, pos))
            return results if results else [(word.lower(), "UNKNOWN")]
        except Exception:
            return [(word.lower(), "UNKNOWN")]

    def lemmatize_batch(self, words: list[str]) -> list[str]:
        if not self.is_available():
            return [w.lower() for w in words]

        if not words:
            return []

        try:
            # Stanza expects list of sentences, each sentence is list of tokens
            # Process each word as separate sentence for proper lemmatization
            sentences = [[word] for word in words]
            doc = self._pipeline(sentences)

            lemmas = []
            for i, sentence in enumerate(doc.sentences):
                if sentence.words:
                    word_obj = sentence.words[0]
                    lemma = word_obj.lemma.lower()

                    # Post-process for Spanish with POS tags
                    if self.language == "es":
                        lemma = self._postprocess_spanish_lemma_with_pos(words[i], lemma, word_obj.upos, word_obj.feats)

                    lemmas.append(lemma)

            return lemmas
        except Exception:
            return [w.lower() for w in words]


def get_stanza_lemmatizer(language: LanguageCodeType) -> StanzaLemmatizer:
    return StanzaLemmatizer(language)
