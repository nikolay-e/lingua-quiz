import json
import unicodedata
from pathlib import Path
from typing import Annotated

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()

LANG_CODE_MAP = {
    "spanish": "es",
    "english": "en",
    "german": "de",
    "russian": "ru",
}

LANG_NAME_MAP = {v: k for k, v in LANG_CODE_MAP.items()}


def _strip_accents(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")


def _normalize_word(word: str) -> str:
    return _strip_accents(word.lower().strip())


def _load_db_export(file_path: Path) -> set[str]:
    with open(file_path, encoding="utf-8") as f:
        data = json.load(f)

    words = set()
    for entry in data.get("words", []):
        source_text = entry.get("sourceText", "")
        for variant in source_text.split(","):
            variant = variant.strip()
            if variant:
                words.add(_normalize_word(variant))
    return words


def _load_generated(file_path: Path) -> dict[str, dict]:
    with open(file_path, encoding="utf-8") as f:
        data = json.load(f)

    words = {}
    for entry in data.get("words", []):
        word = entry.get("word", "")
        if word:
            words[_normalize_word(word)] = {
                "rank": entry.get("rank"),
                "lemma": entry.get("lemma"),
                "pos": entry.get("pos"),
                "frequency": entry.get("frequency"),
            }
    return words


def compare(
    language: Annotated[
        str,
        typer.Argument(help="Language code (e.g., 'es', 'de', 'en') or name ('spanish', 'german')"),
    ],
    level: Annotated[
        str,
        typer.Argument(help="CEFR level (e.g., 'a1', 'a2', 'b1')"),
    ] = "a1",
    db_export_dir: Annotated[
        Path,
        typer.Option("--db-dir", "-d", help="Directory with DB exports"),
    ] = Path("./frequency_lists/db_export"),
    generated_dir: Annotated[
        Path,
        typer.Option("--generated-dir", "-g", help="Directory with generated vocabulary"),
    ] = Path("./frequency_lists"),
    show_missing: Annotated[
        int,
        typer.Option("--show-missing", "-m", help="Number of missing words to display"),
    ] = 50,
    show_extra: Annotated[
        int,
        typer.Option("--show-extra", "-e", help="Number of extra words to display"),
    ] = 20,
):
    """
    Compare database vocabulary with generated frequency lists.

    Shows words that are:
    - Missing from DB (in generated but not in database)
    - Extra in DB (in database but not in generated)

    Examples:
        vocab-tools compare es a1
        vocab-tools compare spanish a1 --show-missing 100
        vocab-tools compare de a1 -d ./db_export -g ./generated
    """
    lang_code = LANG_CODE_MAP.get(language.lower(), language.lower())
    lang_name = LANG_NAME_MAP.get(lang_code, language.title())
    level = level.lower()

    db_file = db_export_dir / f"{lang_name}-{level}.json"
    generated_file = generated_dir / f"{lang_code}_{level}_vocabulary.json"

    console.print(
        Panel(
            f"[bold blue]VOCABULARY COMPARISON[/bold blue]\n"
            f"[dim]Language: {lang_name.title()} ({lang_code}), Level: {level.upper()}[/dim]",
            expand=False,
        )
    )

    if not db_file.exists():
        console.print(f"[red]Error:[/red] DB export file not found: {db_file}")
        raise typer.Exit(1)

    if not generated_file.exists():
        console.print(f"[red]Error:[/red] Generated vocabulary file not found: {generated_file}")
        raise typer.Exit(1)

    console.print(f"[dim]Loading DB export: {db_file}[/dim]")
    db_words = _load_db_export(db_file)

    console.print(f"[dim]Loading generated vocabulary: {generated_file}[/dim]")
    generated_words = _load_generated(generated_file)

    generated_set = set(generated_words.keys())

    missing_from_db = generated_set - db_words
    extra_in_db = db_words - generated_set
    common = db_words & generated_set

    summary_table = Table(title="Comparison Summary", show_header=True)
    summary_table.add_column("Metric", style="cyan")
    summary_table.add_column("Count", style="green", justify="right")
    summary_table.add_row("Words in DB", str(len(db_words)))
    summary_table.add_row("Words in Generated", str(len(generated_set)))
    summary_table.add_row("Common words", str(len(common)))
    summary_table.add_row("[yellow]Missing from DB[/yellow]", f"[yellow]{len(missing_from_db)}[/yellow]")
    summary_table.add_row("[red]Extra in DB[/red]", f"[red]{len(extra_in_db)}[/red]")
    summary_table.add_row("Coverage", f"{len(common) / len(generated_set) * 100:.1f}%")

    console.print()
    console.print(summary_table)

    if missing_from_db and show_missing > 0:
        missing_sorted = sorted(
            [(w, generated_words[w]) for w in missing_from_db],
            key=lambda x: x[1]["rank"] or 9999,
        )

        console.print()
        console.print(
            f"[bold yellow]Missing from DB (top {min(show_missing, len(missing_sorted))} by frequency):[/bold yellow]"
        )

        missing_table = Table(show_header=True)
        missing_table.add_column("Rank", style="dim", justify="right")
        missing_table.add_column("Word", style="yellow")
        missing_table.add_column("Lemma")
        missing_table.add_column("POS")

        for word, info in missing_sorted[:show_missing]:
            missing_table.add_row(
                str(info["rank"]) if info["rank"] else "-",
                word,
                info["lemma"] or "-",
                info["pos"] or "-",
            )

        console.print(missing_table)

    if extra_in_db and show_extra > 0:
        extra_sorted = sorted(extra_in_db)

        console.print()
        console.print(f"[bold red]Extra in DB (first {min(show_extra, len(extra_sorted))}):[/bold red]")

        extra_list = ", ".join(extra_sorted[:show_extra])
        if len(extra_sorted) > show_extra:
            extra_list += f" ... and {len(extra_sorted) - show_extra} more"
        console.print(f"  {extra_list}")

    console.print()
    console.print("[bold green]Comparison complete![/bold green]")
