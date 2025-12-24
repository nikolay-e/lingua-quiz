import re
from collections import defaultdict
from collections.abc import Callable
from dataclasses import dataclass

from ..config.config_loader import get_config_loader
from ..config.constants import get_pos_description
from .base_normalizer import get_universal_normalizer
from .language_plugins import get_language_plugin
from .lemmatization_service import get_lemmatization_service
from .nlp_models import get_nlp_model
from .processing_pipeline import ProcessingContext, ProcessingStage
from .processing_stages import (
    NOUN_SUFFIXES,
    CategorizationStage,
    FilteringStatsCollector,
    ForeignLanguageFilterStage,
    InflectionFilteringStage,
    LemmatizationStage,
    NLPAnalysisStage,
    NormalizationStage,
    StatisticsCollectionStage,
    ValidationStage,
)
from .word_source import WordSource
from .word_validator import WordValidator


@dataclass
class ProcessedWord:
    word: str
    lemma: str
    pos_tag: str
    category: str
    frequency: float
    rank: int | None
    morphology: dict
    reason: str
    metadata: dict


@dataclass
class FilteredWord:
    word: str
    lemma: str | None
    pos_tag: str | None
    frequency: float | None
    rank: int | None
    filter_stage: str
    filter_reason: str


@dataclass
class ProcessedVocabulary:
    language_code: str
    words: list[ProcessedWord]
    categories: dict[str, list[ProcessedWord]]
    total_words: int
    filtered_count: int
    filtering_stats: "FilteringStats | None" = None
    filtered_words: list[FilteredWord] | None = None


@dataclass
class FilteringStats:
    total_analyzed: int
    total_filtered: int
    by_category: dict[tuple[str, str], int]
    examples: dict[tuple[str, str], list[str]]

    def add_filtered(self, word: str, stage: str, reason: str, max_examples: int = 10):
        key = (stage, reason)
        self.by_category[key] = self.by_category.get(key, 0) + 1
        if key not in self.examples:
            self.examples[key] = []
        if len(self.examples[key]) < max_examples:
            self.examples[key].append(word)


@dataclass(frozen=True)
class PipelineDeps:
    processor: "VocabularyProcessor"
    existing_words: set[str]
    filter_inflections: bool
    stats_collector: FilteringStatsCollector | None


STAGE_FACTORIES: dict[str, Callable[[PipelineDeps], "ProcessingStage"]] = {
    "normalize": lambda deps: NormalizationStage(deps.processor.normalizer),
    "validate": lambda deps: ValidationStage(deps.processor.validator),
    "lemmatize": lambda deps: LemmatizationStage(deps.processor.lemmatization_service),
    "foreign_filter": lambda deps: ForeignLanguageFilterStage(
        deps.processor.language_code,
        deps.processor.foreign_language_filters,
    ),
    "nlp": lambda deps: NLPAnalysisStage(
        deps.processor.nlp_model,
        deps.processor.language_code,
        deps.processor.ner_frequency_threshold,
        deps.processor.ner_whitelist,
    ),
    "inflection_filter": lambda deps: InflectionFilteringStage(
        deps.processor.language_code,
        deps.processor.inflection_frequency_ratio,
        deps.processor.inflection_patterns,
        deps.existing_words,
        deps.filter_inflections,
        deps.processor.inflection_exceptions,
    ),
    "categorize": lambda deps: CategorizationStage(deps.processor.pos_categories),
    "stats": lambda deps: StatisticsCollectionStage(deps.stats_collector),
}


class VocabularyProcessor:
    def __init__(self, language_code: str, silent: bool = False):
        self.language_code = language_code
        self.silent = silent
        self.config_loader = get_config_loader()
        self.lang_config = self.config_loader.get_language_config(language_code)
        self.language_plugin = get_language_plugin(language_code, self.config_loader)

        analysis_defaults = self.config_loader.get_analysis_defaults()

        self.normalizer = get_universal_normalizer(language_code, self.config_loader)
        self.skip_words = self.config_loader.get_skip_words(language_code)
        self.pos_categories = self.config_loader.get_pos_categories(language_code)
        self.inflection_patterns = self.config_loader.get_inflection_patterns(language_code)
        self.inflection_exceptions = self.lang_config.get("inflection_exceptions", {})

        filtering_config = self.lang_config.get("filtering", {})
        self.inflection_frequency_ratio = filtering_config.get("inflection_frequency_ratio", 0.5)
        default_ner_threshold = analysis_defaults.get("ner_frequency_threshold", 0.0005)
        self.ner_frequency_threshold = filtering_config.get("ner_frequency_threshold", default_ner_threshold)
        self.ner_whitelist = self.config_loader.get_ner_whitelist(language_code)
        self.foreign_language_filters = filtering_config.get("foreign_language_filters", [])
        self.pipeline_override = filtering_config.get("pipeline_override", [])
        self.pipeline_default = analysis_defaults.get("pipeline", [])
        self.dedup_frequency_replacement_margin = analysis_defaults.get("dedup_frequency_replacement_margin", 1.2)

        default_max_length = analysis_defaults.get("max_word_length", 20)
        validator_config = {
            "min_word_length": filtering_config.get("min_word_length", 2),
            "max_word_length": self.lang_config.get("max_word_length", default_max_length),
            "skip_words": self.skip_words,
            "blacklist": self.lang_config.get("blacklist", {}),
            "filtering": filtering_config,
        }
        self.validator = WordValidator(validator_config)

        self._nlp_model = None
        self.lemmatization_service = get_lemmatization_service(language_code)

    @property
    def nlp_model(self):
        if self._nlp_model is None:
            model_preferences = self.config_loader.get_spacy_models(self.language_code)
            self._nlp_model = get_nlp_model(self.language_code, model_preferences, silent=self.silent)
        return self._nlp_model

    def _build_stages(
        self, existing_words: set[str], filter_inflections: bool, stats_collector: FilteringStatsCollector | None
    ) -> tuple[list, NLPAnalysisStage | None, list]:
        stage_names = self._resolve_pipeline_stages()
        deps = PipelineDeps(
            processor=self,
            existing_words=existing_words,
            filter_inflections=filter_inflections,
            stats_collector=stats_collector,
        )

        pre_nlp_stages = []
        nlp_stage = None
        post_nlp_stages = []

        nlp_index = stage_names.index("nlp") if "nlp" in stage_names else -1

        for i, stage_name in enumerate(stage_names):
            factory = STAGE_FACTORIES.get(stage_name)
            if not factory:
                raise ValueError(f"Unknown pipeline stage: {stage_name}")
            stage = factory(deps)

            if stage_name == "nlp":
                nlp_stage = stage
            elif nlp_index == -1 or i < nlp_index:
                pre_nlp_stages.append(stage)
            else:
                post_nlp_stages.append(stage)

        return pre_nlp_stages, nlp_stage, post_nlp_stages

    def _resolve_pipeline_stages(self) -> list[str]:
        if self.pipeline_override:
            return self.pipeline_override
        if self.pipeline_default:
            return self.pipeline_default
        return [
            "normalize",
            "validate",
            "lemmatize",
            "foreign_filter",
            "nlp",
            "inflection_filter",
            "categorize",
            "stats",
        ]

    def process_words(
        self,
        word_source: WordSource,
        existing_words: set[str] | None = None,
        filter_inflections: bool = True,
        target_count: int | None = None,
        collect_stats: bool = True,
        strict_lemma_only: bool = False,
        batch_size: int = 1000,
    ) -> ProcessedVocabulary:
        if existing_words is None:
            existing_words = set()

        stats_collector = FilteringStatsCollector() if collect_stats else None
        pre_nlp_stages, nlp_stage, post_nlp_stages = self._build_stages(
            existing_words, filter_inflections, stats_collector
        )

        processed_words = []
        filtered_words_list: list[FilteredWord] = []
        categories = defaultdict(list)
        seen_lemmas = {}
        filtered_count = 0
        total_analyzed = 0

        target_with_buffer = int(target_count * 1.2) if target_count else None
        word_iter = iter(word_source.get_words())
        source_exhausted = False

        while not source_exhausted:
            if target_with_buffer and len(processed_words) >= target_with_buffer:
                break

            batch_contexts = []
            for _ in range(batch_size):
                word_obj = next(word_iter, None)
                if word_obj is None:
                    source_exhausted = True
                    break

                total_analyzed += 1
                context = ProcessingContext(word=word_obj.text, metadata=word_obj.metadata or {})

                for stage in pre_nlp_stages:
                    if context.should_filter:
                        break
                    context = stage.process(context)

                if context.should_filter:
                    filtered_count += 1
                    if stats_collector and context.filter_reason:
                        stats_collector.add_filtered(
                            context.word, context.filter_stage or "unknown", context.filter_reason
                        )
                    if collect_stats:
                        filtered_words_list.append(
                            FilteredWord(
                                word=context.word,
                                lemma=context.lemma,
                                pos_tag=context.pos_tag,
                                frequency=context.frequency,
                                rank=context.metadata.get("rank"),
                                filter_stage=context.filter_stage or "unknown",
                                filter_reason=context.filter_reason or "unknown",
                            )
                        )
                else:
                    batch_contexts.append(context)

            if not batch_contexts:
                continue

            if nlp_stage:
                batch_contexts = nlp_stage.process_batch(batch_contexts)

            for context in batch_contexts:
                if not context.should_filter:
                    for stage in post_nlp_stages:
                        if context.should_filter:
                            break
                        context = stage.process(context)

                if context.should_filter:
                    filtered_count += 1
                    if collect_stats:
                        filtered_words_list.append(
                            FilteredWord(
                                word=context.word,
                                lemma=context.lemma,
                                pos_tag=context.pos_tag,
                                frequency=context.frequency,
                                rank=context.metadata.get("rank"),
                                filter_stage=context.filter_stage or "unknown",
                                filter_reason=context.filter_reason or "unknown",
                            )
                        )
                    continue

                if strict_lemma_only and context.word.lower() != context.lemma:
                    filtered_count += 1
                    if stats_collector:
                        stats_collector.add_filtered(context.word, "strict_mode", f"inflection:{context.lemma}")
                    if collect_stats:
                        filtered_words_list.append(
                            FilteredWord(
                                word=context.word,
                                lemma=context.lemma,
                                pos_tag=context.pos_tag,
                                frequency=context.frequency,
                                rank=context.metadata.get("rank"),
                                filter_stage="strict_mode",
                                filter_reason=f"inflection:{context.lemma}",
                            )
                        )
                    continue

                processed = self._context_to_processed_word(context)
                lemma_key = self._normalize_lemma_key(processed.lemma)

                if lemma_key in seen_lemmas:
                    filtered_count = self._handle_duplicate(
                        processed, lemma_key, seen_lemmas, processed_words, categories, filtered_count, stats_collector
                    )
                    continue

                canonical_match = self.language_plugin.canonical_lemma(processed.lemma, seen_lemmas)
                if canonical_match:
                    existing_key = self._normalize_lemma_key(canonical_match.matched_lemma)
                    if existing_key in seen_lemmas:
                        existing = seen_lemmas[existing_key]
                        if len(processed.lemma) < len(existing.lemma):
                            processed_words[:] = [
                                w for w in processed_words if self._normalize_lemma_key(w.lemma) != existing_key
                            ]
                            categories[existing.category] = [
                                w
                                for w in categories[existing.category]
                                if self._normalize_lemma_key(w.lemma) != existing_key
                            ]
                            del seen_lemmas[existing_key]
                            if stats_collector:
                                stats_collector.add_filtered(
                                    existing.word, "canonical", f"{canonical_match.replace_reason}:{processed.lemma}"
                                )
                        else:
                            filtered_count += 1
                            if stats_collector:
                                stats_collector.add_filtered(
                                    processed.word,
                                    "canonical",
                                    f"{canonical_match.filter_reason}:{canonical_match.matched_lemma}",
                                )
                            continue

                processed_words.append(processed)
                categories[processed.category].append(processed)
                seen_lemmas[lemma_key] = processed

        if target_count and len(processed_words) > target_count:
            processed_words = processed_words[:target_count]

        stats = self._build_filtering_stats(stats_collector, total_analyzed, filtered_count) if collect_stats else None

        return ProcessedVocabulary(
            language_code=self.language_code,
            words=processed_words,
            categories=dict(categories),
            total_words=len(processed_words),
            filtered_count=filtered_count,
            filtering_stats=stats,
            filtered_words=filtered_words_list if collect_stats else None,
        )

    def _normalize_lemma_key(self, lemma: str) -> str:
        key = (lemma or "").strip().lower()
        key = re.sub(r"[^\wäöüßáéíóúñçёй]+", "", key)
        return key

    def _capitalize_german_noun(self, word: str, lemma: str, pos_tag: str) -> tuple[str, str]:
        if self.language_code != "de":
            return word, lemma
        if "-" in word or any(c.isdigit() for c in word):
            return word, lemma
        if word.isupper():
            return word, lemma

        should_capitalize = pos_tag in {"NOUN", "PROPN"}
        if not should_capitalize:
            de_noun_suffixes = NOUN_SUFFIXES.get("de", ())
            word_lower = word.lower()
            should_capitalize = any(word_lower.endswith(s) for s in de_noun_suffixes)

        if should_capitalize:
            return word.capitalize(), lemma.capitalize() if lemma else lemma
        return word, lemma

    def _context_to_processed_word(self, context: ProcessingContext) -> ProcessedWord:
        word, lemma = self._capitalize_german_noun(context.word, context.lemma, context.pos_tag)

        reason = self._generate_reason(word, lemma, context.pos_tag, context.morphology, context.metadata.get("rank"))

        return ProcessedWord(
            word=word,
            lemma=lemma,
            pos_tag=context.pos_tag,
            category=context.category,
            frequency=context.frequency,
            rank=context.metadata.get("rank"),
            morphology=context.morphology,
            reason=reason,
            metadata=context.metadata,
        )

    def _handle_duplicate(
        self,
        processed: ProcessedWord,
        lemma_key: str,
        seen_lemmas: dict,
        processed_words: list,
        categories: dict,
        filtered_count: int,
        stats_collector: FilteringStatsCollector | None,
    ) -> int:
        existing_processed = seen_lemmas[lemma_key]
        should_replace = False
        replacement_reason = ""

        is_current_lemma = processed.word.lower() == (processed.lemma or "").lower()
        is_existing_lemma = existing_processed.word.lower() == (existing_processed.lemma or "").lower()

        if is_current_lemma and not is_existing_lemma:
            should_replace = True
            replacement_reason = f"replaced_by_lemma:{processed.lemma}"
        elif not is_current_lemma and is_existing_lemma:
            filtered_count += 1
            if stats_collector:
                stats_collector.add_filtered(processed.word, "dedupe", f"lemma_exists:{processed.lemma}")
            return filtered_count
        elif processed.frequency > existing_processed.frequency * self.dedup_frequency_replacement_margin:
            should_replace = True
            replacement_reason = f"replaced_by_higher_freq:{processed.lemma}:freq={processed.frequency:.6f}"
        else:
            filtered_count += 1
            if stats_collector:
                stats_collector.add_filtered(processed.word, "dedupe", f"lower_freq:{processed.lemma}")
            return filtered_count

        if should_replace:
            existing_key = self._normalize_lemma_key(existing_processed.lemma)
            processed_words[:] = [w for w in processed_words if self._normalize_lemma_key(w.lemma) != existing_key]
            categories[existing_processed.category] = [
                w for w in categories[existing_processed.category] if self._normalize_lemma_key(w.lemma) != existing_key
            ]

            processed_words.append(processed)
            categories[processed.category].append(processed)
            seen_lemmas[lemma_key] = processed

            if stats_collector:
                stats_collector.add_filtered(existing_processed.word, "dedupe", replacement_reason)

        return filtered_count

    def _build_filtering_stats(
        self, stats_collector: FilteringStatsCollector, total_analyzed: int, filtered_count: int
    ) -> FilteringStats:
        return FilteringStats(
            total_analyzed=total_analyzed,
            total_filtered=filtered_count,
            by_category=stats_collector.by_category,
            examples=stats_collector.examples,
        )

    def _generate_reason(self, word: str, lemma: str, pos_tag: str, morphology: dict, rank: int | None) -> str:
        parts = []

        if rank:
            parts.append(f"Top {rank} word")

        if morphology.get("_description"):
            parts.append(f"classified as {morphology['_description']}")
        else:
            pos_desc = get_pos_description(pos_tag)
            parts.append(f"classified as {pos_desc}")

        if morphology.get("_is_marked"):
            parts.append("marked form")

        return "; ".join(parts)

    def print_filtering_report(self, stats: FilteringStats, verbose: int = 1):
        if not stats or stats.total_filtered == 0:
            return

        print("\nFiltering Statistics:")
        print(f"   • Total analyzed: {stats.total_analyzed:,}")
        print(f"   • Filtered out: {stats.total_filtered:,} ({stats.total_filtered / stats.total_analyzed * 100:.1f}%)")
        print(
            f"   • Passed: {stats.total_analyzed - stats.total_filtered:,} ({(stats.total_analyzed - stats.total_filtered) / stats.total_analyzed * 100:.1f}%)"
        )

        if verbose >= 1:
            print("\nFiltering Breakdown:")

            stage_totals = defaultdict(int)
            stage_reasons: dict[str, dict[str, int]] = {}

            for (stage, reason), count in stats.by_category.items():
                stage_totals[stage] += count
                stage_reasons.setdefault(stage, {})
                stage_reasons[stage][reason] = stage_reasons[stage].get(reason, 0) + count

            for stage, total in sorted(stage_totals.items(), key=lambda x: x[1], reverse=True):
                print(f"   • {stage} filters: {total:,} words ({total / stats.total_filtered * 100:.1f}%)")
                for reason, count in sorted(stage_reasons.get(stage, {}).items(), key=lambda x: x[1], reverse=True):
                    print(f"      - {reason}: {count}")

        if verbose >= 2 and stats.examples:
            print("\nExamples (first 10 per category):")
            for stage, reason in sorted(stats.examples.keys()):
                examples = stats.examples[(stage, reason)][:10]
                examples_str = ", ".join(examples)
                print(f"   • {stage}:{reason}: [{examples_str}]")
