"""Shared utilities for CLI commands.

Re-exports from auto_config for backward compatibility.
"""

from ..auto_config import get_list_name, resolve_language_alias

__all__ = ["get_list_name", "resolve_language_alias"]
