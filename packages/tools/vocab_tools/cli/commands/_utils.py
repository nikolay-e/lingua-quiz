"""Shared utilities for CLI commands."""

from ...config.constants import LANGUAGE_CODE_TO_NAME
from ...core.models import VocabularyEntry
from ...core.naming import list_name_to_filename, normalize_list_name
from ..auto_config import get_list_name, resolve_language_alias


def entry_to_dict(entry: VocabularyEntry) -> dict:
    return entry.to_api_dict()


__all__ = [
    "get_list_name",
    "resolve_language_alias",
    "LANGUAGE_CODE_TO_NAME",
    "normalize_list_name",
    "list_name_to_filename",
    "entry_to_dict",
]
