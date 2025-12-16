"""
Base language processor protocol and abstract implementation.
"""

from abc import ABC, abstractmethod
from typing import Protocol


class LanguageProcessor(Protocol):
    language_code: str

    def normalize(self, text: str) -> str: ...

    def get_lemma_fallback(self, word: str, model_lemma: str) -> str: ...

    def get_blacklist(self) -> set[str]: ...

    def is_valid_word(self, word: str) -> bool: ...


class BaseLanguageProcessor(ABC):
    def __init__(self, language_code: str):
        self.language_code = language_code
        self._blacklist: set[str] | None = None

    def normalize(self, text: str) -> str:
        return text.lower().strip()

    def get_lemma_fallback(self, word: str, model_lemma: str) -> str:
        return model_lemma

    @abstractmethod
    def get_blacklist(self) -> set[str]: ...

    def is_valid_word(self, word: str) -> bool:
        if not word or len(word) < 2:
            return False
        if word in self.get_blacklist():
            return False
        return True
