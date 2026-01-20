from pathlib import Path
from typing import Any

from ..core.io import load_translation_file, save_translation_file


def format_vocabulary_json(input_path: Path, output_path: Path | None = None, dry_run: bool = False) -> dict[str, Any]:
    if output_path is None:
        output_path = input_path

    data = load_translation_file(input_path)

    translations = data.get("translations", [])

    stats = {
        "original_count": len(translations),
        "final_count": len(translations),
    }

    if not dry_run:
        save_translation_file(output_path, data)

    return stats


def format_all_vocabulary_files(
    vocabulary_dir: Path, dry_run: bool = False, file_pattern: str = "*-russian-*.json"
) -> dict[str, dict[str, Any]]:
    results = {}

    for json_file in sorted(vocabulary_dir.glob(file_pattern)):
        print(f"Processing {json_file.name}...")
        try:
            stats = format_vocabulary_json(json_file, dry_run=dry_run)
            results[json_file.name] = stats
            print(f"  Total: {stats['final_count']} word pairs")
        except Exception as e:
            print(f"  ERROR: {e}")
            results[json_file.name] = {"error": str(e)}

    return results
