"""
Factory for creating language-specific processors.
"""

from typing import Literal

from .base import BaseLanguageProcessor
from .spanish import SpanishProcessor

LanguageCodeType = Literal["en", "es", "de", "ru"]

_PROCESSORS: dict[str, type[BaseLanguageProcessor]] = {
    "es": SpanishProcessor,
}


class DefaultProcessor(BaseLanguageProcessor):
    def get_blacklist(self) -> set[str]:
        if self._blacklist is None:
            from ..config.config_loader import get_config_loader

            config = get_config_loader()
            self._blacklist = config.get_blacklist_words(self.language_code)
        return self._blacklist


def get_processor(language_code: LanguageCodeType) -> BaseLanguageProcessor:
    if language_code in _PROCESSORS:
        return _PROCESSORS[language_code]()
    return DefaultProcessor(language_code)
