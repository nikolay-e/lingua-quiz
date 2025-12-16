"""
Spanish-specific language processor.
"""

from ..config.config_loader import get_config_loader
from .base import BaseLanguageProcessor

SPANISH_LEMMA_FALLBACK: dict[str, str] = {
    "estabas": "estar",
    "estaba": "estar",
    "estaban": "estar",
    "quieras": "querer",
    "quiera": "querer",
    "hablado": "hablar",
    "llegado": "llegar",
    "tomado": "tomar",
    "viste": "ver",
    "vio": "ver",
    "comiendo": "comer",
    "tengo": "tener",
    "eres": "ser",
    "fuiste": "ir",
    "vayas": "ir",
    "vamos": "ir",
    "conocí": "conocer",
    "bonita": "bonito",
    "gatos": "gato",
    "casas": "casa",
}


class SpanishProcessor(BaseLanguageProcessor):
    def __init__(self):
        super().__init__("es")

    def normalize(self, text: str) -> str:
        text = text.lower().strip()
        return text

    def get_lemma_fallback(self, word: str, model_lemma: str) -> str:
        if model_lemma == word:
            return SPANISH_LEMMA_FALLBACK.get(word, model_lemma)
        return model_lemma

    def get_blacklist(self) -> set[str]:
        if self._blacklist is None:
            config = get_config_loader()
            self._blacklist = config.get_blacklist_words("es")
        return self._blacklist
