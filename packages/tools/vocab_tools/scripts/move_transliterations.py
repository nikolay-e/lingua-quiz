"""Move transliterations from A1/A2 to A0."""

from pathlib import Path

from ..config.config_loader import get_config_loader
from ..config.constants import get_language_code
from ..core.base_normalizer import get_universal_normalizer
from ..core.io import load_translation_file, save_translation_file
from ..core.transliteration_detector import TransliterationDetector

_detector = TransliterationDetector(similarity_threshold=0.65)
_config_loader = get_config_loader()
_normalizer = get_universal_normalizer("en", _config_loader)


def is_transliteration(source: str, target: str, lang_code: str = "en") -> bool:
    target_variants = _normalizer.extract_word_variants(target)

    for variant in target_variants:
        is_trans, _ = _detector.is_transliteration(source, variant, source_lang=lang_code, target_lang="ru")
        if is_trans:
            return True

    return False


def move_transliterations(lang_name: str, from_level: str = "a1") -> None:
    lang_code = get_language_code(lang_name) or "en"

    backend_path = Path(__file__).parent.parent.parent.parent / "backend"
    vocab_dir = backend_path / "migrations" / "data" / "vocabulary"

    source_file = vocab_dir / f"{lang_name}-russian-{from_level}.json"
    if not source_file.exists():
        print(f"⚠️  {source_file.name} not found")
        return

    source_data = load_translation_file(source_file)
    if not source_data:
        print(f"⚠️  {source_file.name} is empty or invalid")
        return

    source_entries = source_data.get("translations", [])

    transliterations = []
    remaining_entries = []

    for entry in source_entries:
        if is_transliteration(entry["source_word"], entry["target_word"], lang_code):
            transliterations.append(entry)
        else:
            remaining_entries.append(entry)

    if not transliterations:
        print(f"✓  {lang_name.upper()}-{from_level.upper()}: No transliterations found")
        return

    print(f"\n{lang_name.upper()}-{from_level.upper()}: Found {len(transliterations)} transliterations:")
    for t in transliterations[:10]:
        print(f"  {t['source_word']:<20} → {t['target_word']}")
    if len(transliterations) > 10:
        print(f"  ... and {len(transliterations) - 10} more")

    a0_file = vocab_dir / f"{lang_name}-russian-a0.json"
    a0_data = load_translation_file(a0_file)

    if a0_data:
        a0_entries = a0_data.get("translations", [])
    else:
        a0_data = {
            "source_language": source_data.get("source_language", lang_name.capitalize()),
            "target_language": "Russian",
            "word_list_name": f"{lang_name.capitalize()} Russian A0",
            "translations": [],
        }
        a0_entries = []

    a0_entries.extend(transliterations)
    a0_data["translations"] = a0_entries
    source_data["translations"] = remaining_entries

    save_translation_file(a0_file, a0_data)
    save_translation_file(source_file, source_data)

    print(f"✅ Moved {len(transliterations)} words to {lang_name.upper()}-A0")
    print(f"   {source_file.name}: {len(source_entries)} → {len(remaining_entries)} words")
    print(f"   {a0_file.name}: {len(a0_entries) - len(transliterations)} → {len(a0_entries)} words")


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python move_transliterations.py <language> [level]")
        print("Example: python move_transliterations.py english a1")
        print("Example: python move_transliterations.py spanish a2")
        sys.exit(1)

    lang = sys.argv[1]
    level = sys.argv[2] if len(sys.argv) > 2 else "a1"

    move_transliterations(lang, level)
