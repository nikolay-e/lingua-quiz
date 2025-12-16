"""
Language-specific processors using Strategy Pattern.

Each language has its own processor with specialized normalization,
lemmatization fallbacks, and validation rules.
"""

from .base import LanguageProcessor
from .factory import get_processor

__all__ = ["LanguageProcessor", "get_processor"]
