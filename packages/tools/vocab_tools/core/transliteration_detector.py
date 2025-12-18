import re
import unicodedata

LATIN_TO_CYRILLIC = {
    "a": "а",
    "b": "б",
    "c": "с",
    "d": "д",
    "e": "е",
    "f": "ф",
    "g": "г",
    "h": "х",
    "i": "и",
    "j": "й",
    "k": "к",
    "l": "л",
    "m": "м",
    "n": "н",
    "o": "о",
    "p": "п",
    "q": "к",
    "r": "р",
    "s": "с",
    "t": "т",
    "u": "у",
    "v": "в",
    "w": "в",
    "x": "кс",
    "y": "и",
    "z": "з",
    "ch": "ч",
    "sh": "ш",
    "th": "т",
    "ph": "ф",
    "sch": "ш",
    "tsch": "ч",
    "tion": "ция",
    "sion": "сия",
    "ism": "изм",
    "ist": "ист",
    "meant": "мент",
    "ness": "нес",
    "ity": "ити",
    "ty": "ти",
    "cy": "ция",
    "gy": "гия",
    "phy": "фия",
    "logy": "логия",
    "graphy": "графия",
    "nomy": "номия",
    "ture": "тура",
    "ure": "ура",
    "or": "ор",
    "er": "ер",
    "ar": "ар",
    "al": "ал",
    "el": "ел",
    "ol": "ол",
    "ul": "ул",
    "il": "ил",
    "an": "ан",
    "en": "ен",
    "on": "он",
    "un": "ун",
    "in": "ин",
    "ä": "е",
    "ö": "ё",
    "ü": "ю",
    "ß": "сс",
    "á": "а",
    "é": "е",
    "í": "и",
    "ó": "о",
    "ú": "у",
    "ñ": "нь",
}

CYRILLIC_TO_LATIN = {
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "g",
    "д": "d",
    "е": "e",
    "ё": "yo",
    "ж": "zh",
    "з": "z",
    "и": "i",
    "й": "y",
    "к": "k",
    "л": "l",
    "м": "m",
    "н": "n",
    "о": "o",
    "п": "p",
    "р": "r",
    "с": "s",
    "т": "t",
    "у": "u",
    "ф": "f",
    "х": "h",
    "ц": "ts",
    "ч": "ch",
    "ш": "sh",
    "щ": "sch",
    "ъ": "",
    "ы": "y",
    "ь": "",
    "э": "e",
    "ю": "yu",
    "я": "ya",
}


def normalize_for_comparison(text: str) -> str:
    text = text.lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^a-zа-яё]", "", text)
    return text


def transliterate_to_cyrillic(word: str) -> str:
    word = word.lower()

    sorted_patterns = sorted(LATIN_TO_CYRILLIC.keys(), key=len, reverse=True)

    result = word
    for pattern in sorted_patterns:
        if len(pattern) > 1:
            result = result.replace(pattern, LATIN_TO_CYRILLIC[pattern])

    final = []
    for char in result:
        if char in LATIN_TO_CYRILLIC:
            final.append(LATIN_TO_CYRILLIC[char])
        elif "а" <= char <= "я" or char == "ё":
            final.append(char)
        else:
            final.append(char)

    return "".join(final)


def transliterate_to_latin(word: str) -> str:
    word = word.lower()
    result = []
    for char in word:
        if char in CYRILLIC_TO_LATIN:
            result.append(CYRILLIC_TO_LATIN[char])
        else:
            result.append(char)
    return "".join(result)


def levenshtein_distance(s1: str, s2: str) -> int:
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)

    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def similarity_ratio(s1: str, s2: str) -> float:
    if not s1 or not s2:
        return 0.0
    distance = levenshtein_distance(s1, s2)
    max_len = max(len(s1), len(s2))
    return 1.0 - (distance / max_len)


class TransliterationDetector:
    def __init__(self, similarity_threshold: float = 0.7):
        self.similarity_threshold = similarity_threshold

    def is_transliteration(self, source_word: str, target_word: str, source_lang: str) -> bool:
        source_norm = normalize_for_comparison(source_word)
        target_norm = normalize_for_comparison(target_word)

        if len(source_norm) < 3 or len(target_norm) < 3:
            return False

        if source_lang in ("en", "es", "de"):
            transliterated = transliterate_to_cyrillic(source_word)
            transliterated_norm = normalize_for_comparison(transliterated)

            similarity = similarity_ratio(transliterated_norm, target_norm)
            if similarity >= self.similarity_threshold:
                return True

            source_latin = normalize_for_comparison(source_word)
            target_latin = transliterate_to_latin(target_word)
            target_latin_norm = normalize_for_comparison(target_latin)

            similarity = similarity_ratio(source_latin, target_latin_norm)
            if similarity >= self.similarity_threshold:
                return True

        elif source_lang == "ru":
            transliterated = transliterate_to_latin(source_word)
            transliterated_norm = normalize_for_comparison(transliterated)
            target_norm = normalize_for_comparison(target_word)

            similarity = similarity_ratio(transliterated_norm, target_norm)
            if similarity >= self.similarity_threshold:
                return True

        return False

    def detect_transliterations(
        self, words: list[str], source_lang: str, russian_translations: dict[str, str] | None = None
    ) -> list[str]:
        transliterations = []

        for word in words:
            if russian_translations and word in russian_translations:
                translation = russian_translations[word]
                if self.is_transliteration(word, translation, source_lang):
                    transliterations.append(word)
            elif self._looks_like_international_word(word, source_lang):
                transliterations.append(word)

        return transliterations

    def _looks_like_international_word(self, word: str, source_lang: str) -> bool:
        word_lower = word.lower()

        international_suffixes = [
            "tion",
            "sion",
            "ism",
            "ist",
            "meant",
            "ity",
            "ty",
            "phy",
            "logy",
            "graphy",
            "nomy",
            "scope",
            "meter",
            "graph",
            "phone",
            "gram",
            "ción",
            "sión",
            "ismo",
            "ista",
            "mento",
            "dad",
            "tad",
            "tion",
            "ismus",
            "ist",
            "ität",
            "logie",
            "graphie",
            "ция",
            "сия",
            "изм",
            "ист",
            "мент",
            "логия",
            "графия",
        ]

        international_prefixes = [
            "tele",
            "auto",
            "photo",
            "video",
            "audio",
            "micro",
            "macro",
            "mini",
            "maxi",
            "super",
            "ultra",
            "hyper",
            "anti",
            "pro",
            "inter",
            "trans",
            "multi",
            "poly",
            "mono",
            "bio",
            "geo",
            "теле",
            "авто",
            "фото",
            "видео",
            "аудио",
            "микро",
            "макро",
        ]

        for suffix in international_suffixes:
            if word_lower.endswith(suffix) and len(word_lower) > len(suffix) + 2:
                return True

        for prefix in international_prefixes:
            if word_lower.startswith(prefix) and len(word_lower) > len(prefix) + 2:
                return True

        return False


def get_transliteration_detector(threshold: float = 0.7) -> TransliterationDetector:
    return TransliterationDetector(similarity_threshold=threshold)
