from dataclasses import dataclass
from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from .vocabulary_processor import ProcessedWord


@dataclass(frozen=True)
class CanonicalMatch:
    matched_lemma: str
    replace_reason: str
    filter_reason: str


class LanguagePlugin(Protocol):
    language_code: str

    def canonical_lemma(self, lemma: str, seen_lemmas: dict[str, "ProcessedWord"]) -> CanonicalMatch | None: ...


@dataclass(frozen=True)
class DefaultLanguagePlugin:
    language_code: str

    def canonical_lemma(self, lemma: str, seen_lemmas: dict[str, "ProcessedWord"]) -> CanonicalMatch | None:
        return None


@dataclass(frozen=True)
class GermanLanguagePlugin:
    language_code: str
    suffix_pairs: list[tuple[str, str]]
    umlaut_pairs: dict[str, str]
    reverse_umlauts: dict[str, str]

    def canonical_lemma(self, lemma: str, seen_lemmas: dict[str, "ProcessedWord"]) -> CanonicalMatch | None:
        seen_lower = {k.lower(): k for k in seen_lemmas}

        for variant in _generate_singular_variants(lemma, self.suffix_pairs, self.umlaut_pairs):
            if variant in seen_lower:
                return CanonicalMatch(
                    matched_lemma=seen_lower[variant],
                    replace_reason="replaced_by_shorter",
                    filter_reason="existing_preferred",
                )

        for variant in _generate_plural_variants(lemma, self.suffix_pairs, self.reverse_umlauts):
            if variant in seen_lower:
                return CanonicalMatch(
                    matched_lemma=seen_lower[variant],
                    replace_reason="replaced_by_shorter",
                    filter_reason="existing_preferred",
                )

        return None


def _generate_singular_variants(
    word: str, suffix_pairs: list[tuple[str, str]], umlaut_pairs: dict[str, str]
) -> list[str]:
    word_lower = word.lower()
    variants = []

    for plural_suffix, singular_suffix in suffix_pairs:
        if word_lower.endswith(plural_suffix):
            base = word_lower[: -len(plural_suffix)] if plural_suffix else word_lower
            candidate = base + singular_suffix

            if len(candidate) >= 2:
                variants.append(candidate)

            for umlaut, vowel in umlaut_pairs.items():
                if umlaut in base:
                    de_umlauted = base.replace(umlaut, vowel)
                    variants.append(de_umlauted + singular_suffix)

    return variants


def _generate_plural_variants(
    word: str, suffix_pairs: list[tuple[str, str]], reverse_umlauts: dict[str, str]
) -> list[str]:
    word_lower = word.lower()
    variants = []

    for plural_suffix, singular_suffix in suffix_pairs:
        if singular_suffix and word_lower.endswith(singular_suffix):
            base = word_lower[: -len(singular_suffix)]
        elif not singular_suffix:
            base = word_lower
        else:
            continue

        candidate = base + plural_suffix
        if len(candidate) > len(word_lower):
            variants.append(candidate)

        for vowel, umlaut in reverse_umlauts.items():
            if vowel in base:
                umlauted = base.replace(vowel, umlaut)
                variants.append(umlauted + plural_suffix)

    return variants


PLUGIN_FACTORIES = {
    "german_morphology": lambda code, cfg: _build_german_plugin(code, cfg),
}


def _build_german_plugin(language_code: str, lang_config) -> LanguagePlugin:
    morphology = lang_config.morphology
    if not morphology:
        return DefaultLanguagePlugin(language_code)

    suffix_pairs = list(morphology.plural_singular_suffix_pairs or [])
    umlaut_pairs = dict(morphology.umlaut_pairs or {})
    reverse_umlauts = dict(morphology.reverse_umlauts or {}) or {v: k for k, v in umlaut_pairs.items()}
    return GermanLanguagePlugin(language_code, suffix_pairs, umlaut_pairs, reverse_umlauts)


def get_language_plugin(language_code: str, config_loader) -> LanguagePlugin:
    lang_config = config_loader.config.get_language(language_code)
    if not lang_config:
        return DefaultLanguagePlugin(language_code)

    plugin_name = getattr(lang_config, "plugin", None)
    if plugin_name:
        factory = PLUGIN_FACTORIES.get(plugin_name)
        if factory:
            return factory(language_code, lang_config)

    return DefaultLanguagePlugin(language_code)
