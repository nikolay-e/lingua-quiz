#!/usr/bin/env python3
import json
import uuid
from datetime import UTC, datetime
from pathlib import Path

EXPORTED_DIR = Path("exported_vocabularies")
GENERATED_DIR = Path("frequency_lists")
OUTPUT_DIR = Path("import_candidates")

LANG_MAP = {
    "en": {"name": "English", "target": "Russian"},
    "es": {"name": "Spanish", "target": "Russian"},
    "de": {"name": "German", "target": "Russian"},
    "ru": {"name": "Russian", "target": "English"},
}

LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"]


def load_exported_words(lang_code: str) -> dict[str, set[str]]:
    """Load all exported words for a language, grouped by level. Returns lowercase words."""
    lang_name = LANG_MAP[lang_code]["name"].lower()
    words_by_level = {level: set() for level in LEVELS}
    words_by_level["a0"] = set()
    words_by_level["other"] = set()

    for file in EXPORTED_DIR.glob(f"{lang_name}-*.json"):
        level = file.stem.split("-")[-1].lower()
        try:
            with open(file) as f:
                data = json.load(f)
            for word in data.get("words", []):
                source_text = word.get("sourceText", "").lower().strip()
                if source_text:
                    if level in words_by_level:
                        words_by_level[level].add(source_text)
                    else:
                        words_by_level["other"].add(source_text)
        except Exception as e:
            print(f"  Warning: Could not load {file}: {e}")

    return words_by_level


def load_generated_words(lang_code: str, level: str) -> list[dict]:
    """Load generated words for a specific language and level."""
    file = GENERATED_DIR / f"{lang_code}_{level}_vocabulary.json"
    if not file.exists():
        return []

    with open(file) as f:
        data = json.load(f)

    return data.get("words", [])


def create_import_entry(word_data: dict, lang_code: str, level: str) -> dict:
    """Create an import entry in the exported format."""
    lang_info = LANG_MAP[lang_code]
    list_name = f"{lang_info['name']} {lang_info['target']} {level.upper()}"

    return {
        "id": str(uuid.uuid4()),
        "sourceText": word_data["word"],
        "targetText": "",
        "sourceLanguage": lang_info["name"],
        "targetLanguage": lang_info["target"],
        "listName": list_name,
        "difficultyLevel": level,
        "sourceUsageExample": "",
        "targetUsageExample": "",
        "isActive": True,
        "_meta": {
            "rank": word_data.get("rank"),
            "frequency": word_data.get("frequency"),
            "pos": word_data.get("pos"),
            "lemma": word_data.get("lemma"),
        },
    }


def process_language(lang_code: str):
    """Process a single language and generate import candidates."""
    print(f"\n{'=' * 60}")
    print(f"Processing {LANG_MAP[lang_code]['name'].upper()}")
    print(f"{'=' * 60}")

    exported_by_level = load_exported_words(lang_code)
    all_exported = set()
    for words in exported_by_level.values():
        all_exported.update(words)

    print(f"Total words already in DB: {len(all_exported)}")
    for level, words in exported_by_level.items():
        if words:
            print(f"  {level.upper()}: {len(words)} words")

    total_new = 0
    results = {}

    for level in LEVELS:
        generated = load_generated_words(lang_code, level)
        if not generated:
            print(f"\n{level.upper()}: No generated file found")
            continue

        new_words = []
        for word_data in generated:
            word_lower = word_data["word"].lower().strip()
            if word_lower not in all_exported:
                new_words.append(create_import_entry(word_data, lang_code, level))
                all_exported.add(word_lower)

        results[level] = new_words
        total_new += len(new_words)

        print(f"\n{level.upper()}: {len(generated)} generated, {len(new_words)} NEW to import")
        if new_words:
            print(f"  First 5: {', '.join(w['sourceText'] for w in new_words[:5])}")

    OUTPUT_DIR.mkdir(exist_ok=True)

    for level, words in results.items():
        if words:
            output_file = OUTPUT_DIR / f"{lang_code}_{level}_import.json"
            output_data = {
                "listName": f"{LANG_MAP[lang_code]['name']} {LANG_MAP[lang_code]['target']} {level.upper()}",
                "generatedAt": datetime.now(UTC).isoformat(),
                "totalWords": len(words),
                "note": "Import candidates - words from frequency list not yet in database",
                "words": words,
            }
            with open(output_file, "w") as f:
                json.dump(output_data, f, indent=2, ensure_ascii=False)
            print(f"  Saved: {output_file}")

    return total_new


def main():
    print("Smart Import: Finding words to add from frequency lists")
    print("=" * 60)

    grand_total = 0
    for lang_code in LANG_MAP:
        grand_total += process_language(lang_code)

    print(f"\n{'=' * 60}")
    print(f"TOTAL NEW WORDS TO IMPORT: {grand_total}")
    print(f"Output directory: {OUTPUT_DIR.absolute()}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
