from functools import lru_cache
from typing import Literal

from wordfreq import word_frequency, zipf_frequency

LanguageCodeType = Literal["en", "es", "de", "ru"]


@lru_cache(maxsize=50000)
def _cached_zipf(word: str, language_code: str) -> float:
    return zipf_frequency(word, language_code)


@lru_cache(maxsize=50000)
def _cached_frequency(word: str, language_code: str) -> float:
    return word_frequency(word, language_code)


class FrequencyService:
    _instances: dict[str, "FrequencyService"] = {}

    def __init__(self, language_code: LanguageCodeType):
        self.language_code = language_code

    @classmethod
    def get_instance(cls, language_code: LanguageCodeType) -> "FrequencyService":
        if language_code not in cls._instances:
            cls._instances[language_code] = cls(language_code)
        return cls._instances[language_code]

    def get_zipf(self, word: str) -> float:
        return _cached_zipf(word, self.language_code)

    def get_frequency(self, word: str) -> float:
        return _cached_frequency(word, self.language_code)

    def is_common(self, word: str, threshold: float = 3.0) -> bool:
        return self.get_zipf(word) >= threshold

    def compare_frequency(self, word1: str, word2: str) -> int:
        z1 = self.get_zipf(word1)
        z2 = self.get_zipf(word2)
        if z1 > z2:
            return 1
        elif z1 < z2:
            return -1
        return 0


def get_frequency_service(language_code: LanguageCodeType) -> FrequencyService:
    return FrequencyService.get_instance(language_code)
