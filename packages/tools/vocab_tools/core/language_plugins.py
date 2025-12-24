from dataclasses import dataclass
from typing import Protocol, TYPE_CHECKING

if TYPE_CHECKING:
    from .vocabulary_processor import ProcessedWord


class LanguagePlugin(Protocol):
    language_code: str

    def canonical_lemma(self, lemma: str, seen_lemmas: dict[str, "ProcessedWord"]) -> str | None:
        ...


@dataclass(frozen=True)
class DefaultLanguagePlugin:
    language_code: str

    def canonical_lemma(self, lemma: str, seen_lemmas: dict[str, "ProcessedWord"]) -> str | None:
        return None


@dataclass(frozen=True)
class GermanLanguagePlugin:
    language_code: str
    suffix_pairs: list[tuple[str, str]]
    umlaut_pairs: dict[str, str]
    reverse_umlauts: dict[str, str]

    def canonical_lemma(self, lemma: str, seen_lemmas: dict[str, "ProcessedWord"]) -> str | None:
        seen_lower = {k.lower(): k for k in seen_lemmas}

        for variant in _generate_singular_variants(lemma, self.suffix_pairs, self.umlaut_pairs):
            if variant in seen_lower:
                return seen_lower[variant]

        for variant in _generate_plural_variants(lemma, self.suffix_pairs, self.reverse_umlauts):
            if variant in seen_lower:
                return seen_lower[variant]

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


def get_language_plugin(language_code: str, config_loader) -> LanguagePlugin:
    lang_config = config_loader.get_language_config(language_code)
    morphology = lang_config.get("morphology")

    if language_code == "de" and morphology:
        suffix_pairs = [tuple(pair) for pair in morphology.get("plural_singular_suffix_pairs", [])]
        umlaut_pairs = morphology.get("umlaut_pairs", {})
        reverse_umlauts = morphology.get("reverse_umlauts", {}) or {v: k for k, v in umlaut_pairs.items()}
        return GermanLanguagePlugin(language_code, suffix_pairs, umlaut_pairs, reverse_umlauts)

    return DefaultLanguagePlugin(language_code)
