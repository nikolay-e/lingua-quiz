from pathlib import Path

import typer
from rich.console import Console
from rich.progress import BarColumn, Progress, SpinnerColumn, TextColumn
from rich.table import Table

from ...core.api_client import StagingAPIClient, VocabularyEntry
from ...core.transliteration_detector import get_transliteration_detector
from ..output.formatters import print_error, print_header, print_success

console = Console()

SUPPORTED_LANGUAGES = ["en", "es", "de", "ru"]
CEFR_LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"]


def _get_list_name(lang_code: str, level: str) -> str:
    lang_map = {"en": "English", "es": "Spanish", "de": "German", "ru": "Russian"}
    lang_name = lang_map.get(lang_code, lang_code.title())
    return f"{lang_name} Russian {level.upper()}"


def _detect_transliterations_in_entries(
    entries: list[VocabularyEntry],
    source_lang: str,
    threshold: float = 0.7,
) -> list[VocabularyEntry]:
    detector = get_transliteration_detector(threshold=threshold)
    transliterations = []

    for entry in entries:
        if detector.is_transliteration(entry.source_text, entry.target_text, source_lang):
            transliterations.append(entry)

    return transliterations


def _detect_impl(
    language: str | None = None,
    threshold: float = 0.7,
    output_file: Path | None = None,
    dry_run: bool = True,
) -> None:
    languages = [language] if language else [lang for lang in SUPPORTED_LANGUAGES if lang != "ru"]

    print_header(
        "DETECTING A0 TRANSLITERATIONS",
        f"Languages: {', '.join(lang.upper() for lang in languages)}",
    )
    console.print(f"Similarity threshold: [cyan]{threshold}[/cyan]")
    console.print(f"Mode: [cyan]{'dry-run (preview)' if dry_run else 'detect and report'}[/cyan]\n")

    try:
        client = StagingAPIClient()
    except Exception as exc:
        print_error(f"Failed to connect to API: {exc}")
        raise typer.Exit(1) from exc

    all_transliterations: dict[str, list[VocabularyEntry]] = {}
    total_checked = 0
    total_found = 0

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        console=console,
    ) as progress:
        total_lists = len(languages) * len(CEFR_LEVELS)
        main_task = progress.add_task("Scanning vocabularies...", total=total_lists)

        for lang in languages:
            all_transliterations[lang] = []

            for level in CEFR_LEVELS:
                list_name = _get_list_name(lang, level)
                progress.update(main_task, description=f" {lang.upper()} {level.upper()}...")

                try:
                    entries = client.fetch_vocabulary(list_name)
                    total_checked += len(entries)

                    translits = _detect_transliterations_in_entries(entries, lang, threshold)
                    all_transliterations[lang].extend(translits)
                    total_found += len(translits)

                except Exception:
                    pass

                progress.advance(main_task)

    table = Table(title="Detected Transliterations (A0 Candidates)", show_header=True)
    table.add_column("Language", style="cyan")
    table.add_column("Count", justify="right")
    table.add_column("Examples", style="dim")

    for lang in languages:
        translits = all_transliterations[lang]
        examples = ", ".join([t.source_text for t in translits[:5]])
        if len(translits) > 5:
            examples += f" (+{len(translits) - 5} more)"
        table.add_row(lang.upper(), str(len(translits)), examples)

    console.print()
    console.print(table)
    console.print()
    console.print(f"[bold]Summary:[/bold] Found {total_found} transliterations in {total_checked} words checked")

    if output_file and not dry_run:
        import json

        output_data = {
            "threshold": threshold,
            "total_found": total_found,
            "by_language": {},
        }

        for lang, translits in all_transliterations.items():
            output_data["by_language"][lang] = [
                {
                    "source": t.source_text,
                    "target": t.target_text,
                    "list": t.list_name,
                }
                for t in translits
            ]

        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)

        console.print(f"\n[green]Results saved to:[/green] {output_file}")

    if total_found > 0:
        console.print("\n[yellow]These words should be moved to A0 level (transliterations)[/yellow]")
        console.print("[dim]Use --no-dry-run to save results to a file[/dim]")

    print_success("DETECTION COMPLETE")


def detect_a0(
    language: str | None = typer.Argument(
        None,
        help="Language code (en, es, de) or leave empty for all. Russian (ru) is target language.",
    ),
    threshold: float = typer.Option(
        0.7,
        "--threshold",
        "-t",
        help="Similarity threshold for transliteration detection (0.0-1.0)",
    ),
    output_file: Path | None = typer.Option(
        None,
        "--output",
        "-o",
        help="Output file for detected transliterations (JSON)",
    ),
    dry_run: bool = typer.Option(
        True,
        "--dry-run/--no-dry-run",
        help="Preview mode (default) or save results",
    ),
) -> None:
    if language:
        language = language.lower()
        if language not in SUPPORTED_LANGUAGES:
            print_error(f"Unknown language: {language}")
            console.print(f"\n[yellow]Available:[/yellow] {', '.join(SUPPORTED_LANGUAGES)}\n")
            raise typer.Exit(1)
        if language == "ru":
            print_error("Russian is the target language. Select source language (en, es, de).")
            raise typer.Exit(1)

    if not 0.0 <= threshold <= 1.0:
        print_error("Threshold must be between 0.0 and 1.0")
        raise typer.Exit(1)

    _detect_impl(language=language, threshold=threshold, output_file=output_file, dry_run=dry_run)
