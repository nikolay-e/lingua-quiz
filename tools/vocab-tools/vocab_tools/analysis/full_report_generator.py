"""
Full vocabulary analysis report generator using API data.

Generates comprehensive reports on vocabulary coverage, missing words,
duplicates, and quality issues.
"""

import csv
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from wordfreq import zipf_frequency

from ..core.api_client import StagingAPIClient, VocabularyEntry
from .level_coverage_analyzer import CEFR_FREQUENCY_RANGES, LevelCoverageAnalyzer


class FullReportGenerator:
    def __init__(self, language_code: str, list_name: str, top_n: int = 1000):
        from ..config.config_loader import get_config_loader

        self.language_code = language_code
        self.list_name = list_name
        self.top_n = top_n
        self.config_loader = get_config_loader()
        self.client = StagingAPIClient()

        self.level = self._extract_level_from_list_name()
        level_config = self.config_loader.config.get_cefr_level(self.level)
        if level_config:
            self.rank_range = level_config.rank_range
        else:
            self.rank_range = [1, 1000]

    def _extract_level_from_list_name(self) -> str:
        parts = self.list_name.lower().split()
        if parts:
            return parts[-1]
        return "a1"

    def _fetch_vocabulary(self) -> list[VocabularyEntry]:
        return self.client.fetch_vocabulary(self.list_name)

    def _fetch_previous_levels(self) -> set[str]:
        level_hierarchy = ["a0", "a1", "a2", "b1", "b2", "c1", "c2"]
        current_idx = level_hierarchy.index(self.level) if self.level in level_hierarchy else -1

        previous_words = set()
        if current_idx > 0:
            lang_map = {"en": "English", "es": "Spanish", "de": "German"}
            lang_name = lang_map.get(self.language_code, self.language_code.title())

            for prev_level in level_hierarchy[:current_idx]:
                prev_list = f"{lang_name} Russian {prev_level.upper()}"
                try:
                    entries = self.client.fetch_vocabulary(prev_list)
                    previous_words.update(e.source_text.lower() for e in entries)
                except Exception:  # nosec B112
                    continue

        return previous_words

    def generate_full_report(self, output_dir: Path) -> dict[str, Any]:
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        entries = self._fetch_vocabulary()
        previous_words = self._fetch_previous_levels()

        validation_errors = []
        validation_warnings = []

        for entry in entries:
            if not entry.target_text or "[translation needed" in entry.target_text.lower():
                validation_errors.append(
                    {
                        "type": "empty_translation",
                        "word": entry.source_text,
                        "message": f'Empty or placeholder translation for "{entry.source_text}"',
                    }
                )

            if not entry.source_text:
                validation_errors.append(
                    {
                        "type": "empty_source",
                        "word": entry.target_text,
                        "message": f'Empty source word for translation "{entry.target_text}"',
                    }
                )

            if not entry.source_usage_example:
                validation_warnings.append(
                    {
                        "type": "missing_example",
                        "word": entry.source_text,
                        "message": f'Missing source example for "{entry.source_text}"',
                    }
                )

        source_words = [e.source_text for e in entries if e.source_text]
        word_counts = Counter(source_words)
        duplicates = [(word, count) for word, count in word_counts.items() if count > 1]

        for word, count in duplicates:
            validation_errors.append(
                {
                    "type": "duplicate",
                    "word": word,
                    "message": f'Duplicate word "{word}" appears {count} times',
                }
            )

        existing_words = {e.source_text.lower() for e in entries}
        frequency_analysis = self._analyze_frequency_coverage(existing_words, previous_words)
        level_analysis = self._analyze_words_to_move(entries)

        report_data = {
            "language_code": self.language_code,
            "list_name": self.list_name,
            "level": self.level,
            "top_n": self.top_n,
            "rank_range": self.rank_range,
            "total_words": len(entries),
            "unique_words": len(existing_words),
            "duplicates_count": len(duplicates),
            "validation_errors": len(validation_errors),
            "validation_warnings": len(validation_warnings),
            "frequency_analysis": frequency_analysis,
            "level_analysis": level_analysis,
            "errors": validation_errors,
            "warnings": validation_warnings,
            "duplicates": duplicates,
        }

        files = self._save_reports(output_dir, report_data, entries)
        report_data["files"] = files

        return report_data

    def _analyze_frequency_coverage(self, existing_words: set[str], previous_words: set[str]) -> dict[str, Any]:
        from ..core.frequency_list_loader import find_frequency_list, load_frequency_list

        freq_list_path = find_frequency_list(self.language_code)
        if not freq_list_path:
            return {"error": f"Frequency list not found for {self.language_code}"}

        freq_list = load_frequency_list(freq_list_path)

        min_rank, max_rank = self.rank_range
        in_range_total = 0
        in_range_found = 0
        missing_words = []

        for rank, word_obj in enumerate(freq_list.words, start=1):
            if rank < min_rank or rank > max_rank:
                continue

            in_range_total += 1
            lemma = word_obj.lemma.lower()

            if lemma in existing_words:
                in_range_found += 1
            elif lemma not in previous_words:
                priority = "critical" if rank <= 100 else "high" if rank <= 500 else "medium"
                missing_words.append(
                    {
                        "word": word_obj.lemma,
                        "rank": rank,
                        "priority": priority,
                        "zipf": zipf_frequency(word_obj.lemma, self.language_code),
                    }
                )

        coverage = (in_range_found / in_range_total * 100) if in_range_total > 0 else 0

        missing_critical = len([w for w in missing_words if w["priority"] == "critical"])
        missing_high = len([w for w in missing_words if w["priority"] == "high"])
        missing_medium = len([w for w in missing_words if w["priority"] == "medium"])

        return {
            "rank_range": [min_rank, max_rank],
            "expected_words": in_range_total,
            "found_words": in_range_found,
            "coverage_percent": round(coverage, 1),
            "missing_total": len(missing_words),
            "missing_critical": missing_critical,
            "missing_high": missing_high,
            "missing_medium": missing_medium,
            "missing_words": sorted(missing_words, key=lambda x: x["rank"])[:100],
        }

    def _analyze_words_to_move(self, entries: list[VocabularyEntry]) -> dict[str, Any]:
        analyzer = LevelCoverageAnalyzer()

        from ..config.config_loader import get_config_loader
        from ..core.base_normalizer import get_universal_normalizer

        config_loader = get_config_loader()
        normalizer = get_universal_normalizer(self.language_code, config_loader)

        expected_range = CEFR_FREQUENCY_RANGES.get(self.level, (1, 1000))

        words_in_range, words_out_of_range, mismatches = analyzer._analyze_words_from_entries(
            entries,
            normalizer,
            self.language_code,
            self.level,
            expected_range,
            f"{self.language_code}-{self.level}",
            show_progress=False,
        )

        by_target_level = defaultdict(list)
        for mismatch in mismatches:
            target = mismatch.expected_level.upper() if mismatch.expected_level != "unknown" else "NOT_FOUND"
            by_target_level[target].append(
                {
                    "word": mismatch.word,
                    "rank": mismatch.actual_rank,
                    "reason": mismatch.reason,
                }
            )

        level_counts = {level: len(words) for level, words in by_target_level.items()}

        return {
            "words_in_range": words_in_range,
            "words_out_of_range": words_out_of_range,
            "coverage_percent": (
                round(words_in_range / (words_in_range + words_out_of_range) * 100, 1)
                if (words_in_range + words_out_of_range) > 0
                else 0
            ),
            "by_target_level": level_counts,
            "words_to_move": {level: words[:20] for level, words in by_target_level.items()},
        }

    def _save_reports(self, output_dir: Path, report_data: dict, entries: list[VocabularyEntry]) -> dict[str, Path]:
        files = {}

        json_file = output_dir / f"{self.language_code}_{self.level}_report.json"
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2, default=str)
        files["json"] = json_file

        csv_file = output_dir / f"{self.language_code}_{self.level}_vocabulary.csv"
        with open(csv_file, "w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["source_word", "target_word", "source_example", "target_example"])
            for entry in entries:
                writer.writerow(
                    [
                        entry.source_text,
                        entry.target_text,
                        entry.source_usage_example,
                        entry.target_usage_example,
                    ]
                )
        files["csv"] = csv_file

        md_file = output_dir / f"{self.language_code}_{self.level}_report.md"
        with open(md_file, "w", encoding="utf-8") as f:
            f.write(self._generate_markdown_report(report_data))
        files["markdown"] = md_file

        return files

    def _generate_markdown_report(self, data: dict) -> str:
        lines = [
            f"# {data['language_code'].upper()} {data['level'].upper()} Vocabulary Report",
            "",
            "## Summary",
            f"- **List**: {data['list_name']}",
            f"- **Total words**: {data['total_words']}",
            f"- **Unique words**: {data['unique_words']}",
            f"- **Duplicates**: {data['duplicates_count']}",
            f"- **Errors**: {data['validation_errors']}",
            f"- **Warnings**: {data['validation_warnings']}",
            "",
        ]

        freq = data.get("frequency_analysis", {})
        if freq and "error" not in freq:
            lines.extend(
                [
                    "## Frequency Coverage",
                    f"- **Rank range**: {freq['rank_range'][0]}-{freq['rank_range'][1]}",
                    f"- **Coverage**: {freq['coverage_percent']}%",
                    f"- **Found**: {freq['found_words']}/{freq['expected_words']}",
                    "",
                    "### Missing Words",
                    f"- Critical (<100): {freq['missing_critical']}",
                    f"- High (<500): {freq['missing_high']}",
                    f"- Medium (<1000): {freq['missing_medium']}",
                    "",
                ]
            )

            if freq.get("missing_words"):
                lines.append("#### Top Missing Words")
                lines.append("| Rank | Word | Zipf |")
                lines.append("|------|------|------|")
                for w in freq["missing_words"][:20]:
                    lines.append(f"| {w['rank']} | {w['word']} | {w['zipf']:.1f} |")
                lines.append("")

        level = data.get("level_analysis", {})
        if level and level.get("words_out_of_range", 0) > 0:
            lines.extend(
                [
                    "## Words to Move (Out of Range)",
                    f"- **In range**: {level['words_in_range']}",
                    f"- **Out of range**: {level['words_out_of_range']}",
                    f"- **Level coverage**: {level['coverage_percent']}%",
                    "",
                    "### By Target Level",
                ]
            )

            by_target = level.get("by_target_level", {})
            level_order = ["A2", "B1", "B2", "C1", "C2", "D", "NOT_FOUND", "UNKNOWN"]
            for target in level_order:
                if target in by_target:
                    lines.append(f"- **→ {target}**: {by_target[target]}")
            lines.append("")

            words_to_move = level.get("words_to_move", {})
            for target in level_order:
                if target in words_to_move and words_to_move[target]:
                    lines.append(f"#### Words → {target}")
                    lines.append("| Word | Rank |")
                    lines.append("|------|------|")
                    for w in words_to_move[target][:10]:
                        rank = w["rank"] if w["rank"] else "N/A"
                        lines.append(f"| {w['word']} | {rank} |")
                    if len(words_to_move[target]) > 10:
                        lines.append(f"| ... | +{len(words_to_move[target]) - 10} more |")
                    lines.append("")

        if data.get("errors"):
            lines.extend(
                [
                    "## Errors",
                    "",
                ]
            )
            for err in data["errors"][:20]:
                lines.append(f"- {err['message']}")
            if len(data["errors"]) > 20:
                lines.append(f"- ... and {len(data['errors']) - 20} more")
            lines.append("")

        if data.get("warnings"):
            lines.extend(
                [
                    "## Warnings",
                    "",
                ]
            )
            for warn in data["warnings"][:10]:
                lines.append(f"- {warn['message']}")
            if len(data["warnings"]) > 10:
                lines.append(f"- ... and {len(data['warnings']) - 10} more")

        return "\n".join(lines)
