import re
from typing import Any

from wordfreq import word_frequency

from .base_normalizer import UniversalNormalizer
from .frequency_service import get_frequency_service
from .lemmatization_service import LemmatizationService
from .processing_pipeline import ProcessingContext, ProcessingStage
from .word_validator import WordValidator


class NormalizationStage(ProcessingStage):
    def __init__(self, normalizer: UniversalNormalizer):
        self.normalizer = normalizer

    def process(self, context: ProcessingContext) -> ProcessingContext:
        context.normalized = self.normalizer.normalize(context.word)
        return context

    @property
    def name(self) -> str:
        return "normalize"


class ValidationStage(ProcessingStage):
    def __init__(self, validator: WordValidator):
        self.validator = validator

    def process(self, context: ProcessingContext) -> ProcessingContext:
        if not context.normalized:
            context.should_filter = True
            context.filter_stage = self.name
            context.filter_reason = "no_normalized"
            return context

        if not self.validator.is_valid(context.word, context.normalized):
            category, reason = self.validator.get_rejection_reason(context.word, context.normalized)
            context.should_filter = True
            context.filter_stage = self.name
            context.filter_reason = category
        return context

    @property
    def name(self) -> str:
        return "validate"


class LemmatizationStage(ProcessingStage):
    def __init__(self, lemmatization_service: LemmatizationService):
        self.lemmatization_service = lemmatization_service

    def process(self, context: ProcessingContext) -> ProcessingContext:
        context.lemma = self.lemmatization_service.lemmatize(context.word)
        return context

    @property
    def name(self) -> str:
        return "lemmatize"


class ForeignLanguageFilterStage(ProcessingStage):
    def __init__(self, language_code: str, filters: list[dict[str, Any]]):
        self.native_service = None
        self.filters = []

        if filters:
            self.native_service = get_frequency_service(language_code)
            for config in filters:
                language = config.get("language")
                if not language:
                    continue
                self.filters.append(
                    {
                        "language": language,
                        "service": get_frequency_service(language),
                        "min_foreign_zipf": float(config.get("min_foreign_zipf", 4.0)),
                        "max_native_zipf": float(config.get("max_native_zipf", 3.0)),
                        "min_zipf_delta": float(config.get("min_zipf_delta", 1.5)),
                    }
                )

    def process(self, context: ProcessingContext) -> ProcessingContext:
        if not self.filters:
            return context

        candidate = (context.lemma or context.normalized or context.word).lower()
        if not candidate:
            return context

        native_zipf = self.native_service.get_zipf(candidate) if self.native_service else 0.0

        for config in self.filters:
            foreign_zipf = config["service"].get_zipf(candidate)
            if (
                foreign_zipf >= config["min_foreign_zipf"]
                and native_zipf <= config["max_native_zipf"]
                and (foreign_zipf - native_zipf) >= config["min_zipf_delta"]
            ):
                context.should_filter = True
                context.filter_stage = self.name
                context.filter_reason = f"foreign_language:{config['language']}"
                break

        return context

    @property
    def name(self) -> str:
        return "foreign_filter"


POS_TEMPLATES = {
    "en": ("I saw the {w}.", "They will {w} it."),
    "de": ("Ich sehe das {w}.", "Wir {w} jetzt."),
    "es": ("Veo el {w}.", "Ellos {w} ahora."),
    "ru": ("Это {w}.", None),
}

NOUN_SUFFIXES = {
    "en": ("tion", "meant", "ness", "ship", "ity", "ance", "ence", "er", "or", "ist", "ism"),
    "de": ("ung", "heit", "keit", "tion", "tät", "schaft", "chen", "lein", "nis", "ling", "in"),
    "es": ("ción", "sión", "dad", "tad", "aje", "ista", "miento", "ura", "ez"),
    "ru": ("ость", "ние", "тель", "ция", "ство", "ка"),
}

VERB_SUFFIXES = {
    "es": ("ar", "er", "ir"),
    "de": ("en", "ern", "eln"),
    "ru": ("ть", "ать", "ять", "еть", "ить"),
}


class NLPAnalysisStage(ProcessingStage):
    def __init__(
        self,
        nlp_model: Any,
        language_code: str,
        ner_frequency_threshold: float,
        ner_whitelist: set[str] | None = None,
        batch_size: int = 1000,
    ):
        self.nlp_model = nlp_model
        self.language_code = language_code
        self.ner_frequency_threshold = ner_frequency_threshold
        self.ner_whitelist = ner_whitelist or set()
        self.batch_size = batch_size
        self._frequency_cache: dict[str, float] = {}
        self._noun_tpl, self._verb_tpl = POS_TEMPLATES.get(language_code, ("{w}.", None))

    def _looks_like_noun(self, word: str) -> bool:
        word_lower = word.lower()
        if self.language_code == "de" and word and word[0].isupper():
            return True
        suffixes = NOUN_SUFFIXES.get(self.language_code, ())
        if any(word_lower.endswith(s) for s in suffixes):
            verb_suffixes = VERB_SUFFIXES.get(self.language_code, ())
            if not any(word_lower.endswith(v) for v in verb_suffixes):
                return True
        return False

    def _find_target_token(self, doc: Any, word: str) -> Any | None:
        word_lower = word.lower()
        for tok in doc:
            if tok.text.lower() == word_lower:
                return tok
        return doc[2] if len(doc) > 2 else (doc[0] if doc else None)

    def _tag_with_context(self, word: str) -> tuple[Any, Any]:
        noun_text = self._noun_tpl.format(w=word)
        doc1 = self.nlp_model(noun_text)
        tok1 = self._find_target_token(doc1, word)

        if tok1 is None:
            return None, {}

        suspicious = (tok1.pos_ in {"VERB", "AUX"} and self._looks_like_noun(word)) or (
            tok1.pos_ == "ADV" and word and word[0].isupper()
        )

        if not suspicious or not self._verb_tpl:
            return tok1, doc1

        verb_text = self._verb_tpl.format(w=word)
        doc2 = self.nlp_model(verb_text)
        tok2 = self._find_target_token(doc2, word)

        if tok2 is None:
            return tok1, doc1

        if tok1.pos_ in {"NOUN", "PROPN", "ADJ"} or tok2.pos_ in {"VERB", "AUX"}:
            return tok1, doc1
        if tok2.pos_ in {"NOUN", "PROPN", "ADJ"}:
            return tok2, doc2

        return tok1, doc1

    def _tag_batch_with_context(self, words: list[str]) -> list[tuple[Any, Any]]:
        noun_sentences = [self._noun_tpl.format(w=w) for w in words]
        noun_docs = list(self.nlp_model.pipe(noun_sentences, batch_size=self.batch_size))

        results = []
        need_verb_check = []

        for i, (word, doc) in enumerate(zip(words, noun_docs, strict=True)):
            tok = self._find_target_token(doc, word)
            if tok is None:
                results.append((None, {}))
                continue

            suspicious = (tok.pos_ in {"VERB", "AUX"} and self._looks_like_noun(word)) or (
                tok.pos_ == "ADV" and word and word[0].isupper()
            )

            if suspicious and self._verb_tpl:
                need_verb_check.append((i, word, tok, doc))
                results.append(None)
            else:
                results.append((tok, doc))

        if need_verb_check and self._verb_tpl:
            verb_sentences = [self._verb_tpl.format(w=item[1]) for item in need_verb_check]
            verb_docs = list(self.nlp_model.pipe(verb_sentences, batch_size=self.batch_size))

            for (idx, word, tok1, doc1), doc2 in zip(need_verb_check, verb_docs, strict=True):
                tok2 = self._find_target_token(doc2, word)
                if tok2 is None:
                    results[idx] = (tok1, doc1)
                elif tok1.pos_ in {"NOUN", "PROPN", "ADJ"} or tok2.pos_ in {"VERB", "AUX"}:
                    results[idx] = (tok1, doc1)
                elif tok2.pos_ in {"NOUN", "PROPN", "ADJ"}:
                    results[idx] = (tok2, doc2)
                else:
                    results[idx] = (tok1, doc1)

        return results

    def process(self, context: ProcessingContext) -> ProcessingContext:
        token, doc = self._tag_with_context(context.word)

        if token is None:
            context.should_filter = True
            context.filter_stage = self.name
            context.filter_reason = "failed_parse"
            return context

        context.pos_tag = token.pos_
        context.morphology = self._extract_morphology(token)
        context.frequency = self._get_frequency(context.word)

        word_lower = context.word.lower()
        if word_lower in self.ner_whitelist:
            return context

        if context.pos_tag == "PROPN":
            # Only filter low-frequency proper nouns; keep common words like "a", "y", "mi"
            if self.ner_frequency_threshold is not None and context.frequency < self.ner_frequency_threshold:
                context.should_filter = True
                context.filter_stage = self.name
                context.filter_reason = "proper_noun"
                return context
            # High-frequency PROPN - likely misclassified, keep it
            return context

        if (
            token.ent_type_
            and token.ent_type_ not in ["ORDINAL", "CARDINAL"]
            and self.ner_frequency_threshold is not None
            and context.frequency < self.ner_frequency_threshold
        ):
            context.should_filter = True
            context.filter_stage = self.name
            context.filter_reason = f"named_entity:{token.ent_type_}"

        return context

    def process_batch(self, contexts: list[ProcessingContext]) -> list[ProcessingContext]:
        if not contexts:
            return contexts

        words = [ctx.word for ctx in contexts]
        tag_results = self._tag_batch_with_context(words)

        for context, (token, _doc) in zip(contexts, tag_results, strict=True):
            if token is None:
                context.should_filter = True
                context.filter_stage = self.name
                context.filter_reason = "failed_parse"
                continue

            context.pos_tag = token.pos_
            context.morphology = self._extract_morphology(token)
            context.frequency = self._get_frequency(context.word)

            word_lower = context.word.lower()
            if word_lower in self.ner_whitelist:
                continue

            if context.pos_tag == "PROPN":
                # Only filter low-frequency proper nouns; keep common words like "a", "y", "mi"
                if self.ner_frequency_threshold is not None and context.frequency < self.ner_frequency_threshold:
                    context.should_filter = True
                    context.filter_stage = self.name
                    context.filter_reason = "proper_noun"
                # High-frequency PROPN - likely misclassified, keep it
                continue

            if (
                token.ent_type_
                and token.ent_type_ not in ["ORDINAL", "CARDINAL"]
                and self.ner_frequency_threshold is not None
                and context.frequency < self.ner_frequency_threshold
            ):
                context.should_filter = True
                context.filter_stage = self.name
                context.filter_reason = f"named_entity:{token.ent_type_}"

        return contexts

    def _get_frequency(self, word: str) -> float:
        if word not in self._frequency_cache:
            self._frequency_cache[word] = word_frequency(word, self.language_code)
        return self._frequency_cache[word]

    def _extract_morphology(self, token: Any) -> dict[str, Any]:
        morphology: dict[str, Any] = {}
        if hasattr(token, "morph") and token.morph:
            for feat in token.morph:
                key, value = feat.split("=") if "=" in feat else (feat, True)
                morphology[key] = value
        return morphology

    @property
    def name(self) -> str:
        return "nlp"


class InflectionFilteringStage(ProcessingStage):
    def __init__(
        self,
        language_code: str,
        inflection_frequency_ratio: float,
        inflection_patterns: dict[str, list[str]],
        existing_words: set[str],
        filter_inflections: bool,
        inflection_exceptions: dict[str, Any] | None = None,
    ):
        self.language_code = language_code
        self.inflection_frequency_ratio = inflection_frequency_ratio
        self.inflection_patterns = inflection_patterns
        self.existing_words = existing_words
        self.filter_inflections = filter_inflections
        self._compiled_patterns = []
        self._frequency_cache: dict[str, float] = {}

        # Build set of exception words that should never be filtered as inflections
        self.exception_words: set[str] = set()
        if inflection_exceptions:
            for _key, values in inflection_exceptions.items():
                if isinstance(values, list):
                    self.exception_words.update(v.lower() for v in values)

        for _, patterns in inflection_patterns.items():
            for pattern in patterns:
                self._compiled_patterns.append(re.compile(pattern, re.IGNORECASE))

    def _get_frequency(self, word: str) -> float:
        if word not in self._frequency_cache:
            self._frequency_cache[word] = word_frequency(word, self.language_code)
        return self._frequency_cache[word]

    def process(self, context: ProcessingContext) -> ProcessingContext:
        if not self.filter_inflections:
            return context

        # Skip filtering for exception words (e.g., modal verbs, common irregulars)
        if context.word.lower() in self.exception_words:
            return context

        if not context.lemma or not context.morphology:
            return context

        lemma_freq = self._get_frequency(context.lemma)

        if context.lemma != context.word.lower() and context.lemma in self.existing_words:
            if (
                context.frequency is not None
                and lemma_freq > 0
                and context.frequency < lemma_freq * self.inflection_frequency_ratio
            ):
                freq_ratio = context.frequency / lemma_freq if lemma_freq > 0 else 0
                context.should_filter = True
                context.filter_stage = self.name
                context.filter_reason = f"existing_lemma:{context.lemma}:freq_ratio={freq_ratio:.2f}"
                return context

        if self._is_likely_inflected(context.word, context.lemma, context.morphology):
            if (
                context.frequency is not None
                and lemma_freq > 0
                and context.frequency < lemma_freq * self.inflection_frequency_ratio
            ):
                freq_ratio = context.frequency / lemma_freq if lemma_freq > 0 else 0
                context.should_filter = True
                context.filter_stage = self.name
                context.filter_reason = f"pattern_match:{context.lemma}:freq_ratio={freq_ratio:.2f}"

        return context

    def _is_likely_inflected(self, word: str, lemma: str, morphology: dict[str, Any]) -> bool:
        if word.lower() == lemma:
            return False

        for pattern in self._compiled_patterns:
            if pattern.search(word) and not pattern.search(lemma):
                return True
        return False

    @property
    def name(self) -> str:
        return "inflection_filter"


class CategorizationStage(ProcessingStage):
    def __init__(self, pos_categories: dict[str, list[str]]):
        self.pos_categories = pos_categories

    def process(self, context: ProcessingContext) -> ProcessingContext:
        if not context.pos_tag:
            context.category = "other"
            return context

        for category, pos_tags in self.pos_categories.items():
            if context.pos_tag in pos_tags:
                context.category = category
                return context

        context.category = "other"
        return context

    @property
    def name(self) -> str:
        return "categorize"


class StatisticsCollectionStage(ProcessingStage):
    def __init__(self, stats_collector: "FilteringStatsCollector | None"):
        self.stats_collector = stats_collector

    def process(self, context: ProcessingContext) -> ProcessingContext:
        if self.stats_collector and context.should_filter and context.filter_reason:
            stage = context.filter_stage or "unknown"
            self.stats_collector.add_filtered(context.word, stage, context.filter_reason)
        return context

    @property
    def name(self) -> str:
        return "stats"


class FilteringStatsCollector:
    def __init__(self, max_examples: int = 10):
        self.max_examples = max_examples
        self.by_category: dict[tuple[str, str], int] = {}
        self.examples: dict[tuple[str, str], list[str]] = {}
        self.total_filtered = 0

    def add_filtered(self, word: str, stage: str, reason: str) -> None:
        self.total_filtered += 1
        key = (stage, reason)
        self.by_category[key] = self.by_category.get(key, 0) + 1

        if key not in self.examples:
            self.examples[key] = []
        if len(self.examples[key]) < self.max_examples:
            self.examples[key].append(word)
