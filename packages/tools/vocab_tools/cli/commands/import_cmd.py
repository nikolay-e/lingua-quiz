import json
from pathlib import Path
from typing import Annotated

import typer
from rich.console import Console
from rich.panel import Panel
from rich.progress import BarColumn, Progress, SpinnerColumn, TextColumn
from rich.table import Table

from vocab_tools.core.api_client import MissingCredentialsError, VocabularyEntry, get_api_client

console = Console()


def _load_vocabulary_from_file(file_path: Path) -> tuple[str, list[dict]]:
    with open(file_path, encoding="utf-8") as f:
        data = json.load(f)

    list_name = data.get("listName", "")
    words = data.get("words", [])

    if not list_name and "translations" in data:
        list_name = data.get("word_list_name", "")
        words = [
            {
                "sourceText": t.get("source_word", ""),
                "targetText": t.get("target_word", ""),
                "sourceUsageExample": t.get("source_example", ""),
                "targetUsageExample": t.get("target_example", ""),
            }
            for t in data.get("translations", [])
        ]

    return list_name, words


def _get_existing_words(client, list_name: str) -> dict[str, VocabularyEntry]:
    entries = client.list_vocabulary(list_name=list_name, limit=10000)
    return {e.source_text.lower(): e for e in entries}


def import_vocabulary(
    input_path: Annotated[
        Path,
        typer.Argument(help="JSON file or directory containing vocabulary files to import"),
    ],
    dry_run: Annotated[
        bool,
        typer.Option("--dry-run", "-n", help="Preview changes without making them"),
    ] = False,
    update_existing: Annotated[
        bool,
        typer.Option("--update", "-u", help="Update existing words if they differ"),
    ] = False,
    skip_existing: Annotated[
        bool,
        typer.Option("--skip-existing", "-s", help="Skip words that already exist (default)"),
    ] = True,
    batch_size: Annotated[
        int,
        typer.Option("--batch-size", "-b", help="Number of words to process in each batch"),
    ] = 50,
):
    """
    Import vocabulary from JSON files to database.

    Uploads vocabulary data from local JSON files to the staging API.
    Supports both single files and directories.

    Examples:
        vocab-tools import ./exported_vocabularies/spanish-a1.json
        vocab-tools import ./exported_vocabularies/ --update
        vocab-tools import ./data/es-a1.json --dry-run
    """
    console.print(
        Panel(
            "[bold blue]VOCABULARY IMPORT[/bold blue]\n"
            f"[dim]{'DRY RUN - no changes will be made' if dry_run else 'Uploading vocabulary to staging API...'}[/dim]",
            expand=False,
        )
    )

    if dry_run:
        console.print("[yellow]DRY RUN MODE - No changes will be made[/yellow]\n")

    try:
        client = get_api_client()
    except MissingCredentialsError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1) from None

    if input_path.is_file():
        files = [input_path]
    elif input_path.is_dir():
        files = list(input_path.glob("*.json"))
    else:
        console.print(f"[red]Error: Path not found: {input_path}[/red]")
        raise typer.Exit(1)

    if not files:
        console.print("[yellow]No JSON files found to import.[/yellow]")
        raise typer.Exit(0)

    console.print(f"[green]Found {len(files)} file(s) to import[/green]\n")

    stats = {"created": 0, "updated": 0, "skipped": 0, "errors": 0}

    for file_path in files:
        console.print(f"[bold]Processing: {file_path.name}[/bold]")

        try:
            list_name, words = _load_vocabulary_from_file(file_path)
        except Exception as e:
            console.print(f"  [red]Error loading file: {e}[/red]")
            stats["errors"] += 1
            continue

        if not list_name:
            console.print("  [yellow]Warning: No list name found, skipping[/yellow]")
            continue

        if not words:
            console.print("  [yellow]Warning: No words found, skipping[/yellow]")
            continue

        console.print(f"  List: {list_name}, Words: {len(words)}")

        existing_words = {}
        if update_existing or skip_existing:
            try:
                existing_words = _get_existing_words(client, list_name)
                console.print(f"  [dim]Found {len(existing_words)} existing words[/dim]")
            except Exception:
                pass

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            console=console,
        ) as progress:
            task = progress.add_task("Importing...", total=len(words))

            for word in words:
                source_text = word.get("sourceText", "")
                target_text = word.get("targetText", "")

                if not source_text or not target_text:
                    stats["skipped"] += 1
                    progress.advance(task)
                    continue

                existing = existing_words.get(source_text.lower())

                if existing:
                    if update_existing and _word_differs(existing, word):
                        if not dry_run:
                            try:
                                client.update_vocabulary_item(
                                    item_id=existing.id,
                                    target_text=target_text,
                                    source_usage_example=word.get("sourceUsageExample"),
                                    target_usage_example=word.get("targetUsageExample"),
                                    difficulty_level=word.get("difficultyLevel"),
                                )
                                stats["updated"] += 1
                            except Exception:
                                stats["errors"] += 1
                        else:
                            stats["updated"] += 1
                    else:
                        stats["skipped"] += 1
                else:
                    if not dry_run:
                        try:
                            source_lang = word.get("sourceLanguage", _extract_source_lang(list_name))
                            target_lang = word.get("targetLanguage", "ru")

                            client.create_vocabulary_item(
                                source_text=source_text,
                                target_text=target_text,
                                list_name=list_name,
                                source_language=source_lang,
                                target_language=target_lang,
                                difficulty_level=word.get("difficultyLevel"),
                                source_usage_example=word.get("sourceUsageExample", ""),
                                target_usage_example=word.get("targetUsageExample", ""),
                            )
                            stats["created"] += 1
                        except Exception as e:
                            console.print(f"  [red]Error creating '{source_text}': {e}[/red]")
                            stats["errors"] += 1
                    else:
                        stats["created"] += 1

                progress.advance(task)

    table = Table(title="Import Summary", show_header=True)
    table.add_column("Action", style="cyan")
    table.add_column("Count", style="green")
    table.add_row("Created", str(stats["created"]))
    table.add_row("Updated", str(stats["updated"]))
    table.add_row("Skipped", str(stats["skipped"]))
    table.add_row("Errors", str(stats["errors"]) if stats["errors"] == 0 else f"[red]{stats['errors']}[/red]")

    console.print()
    console.print(table)

    if dry_run:
        console.print("\n[yellow]DRY RUN - No changes were made[/yellow]")
    else:
        console.print("\n[bold green]Import complete![/bold green]")


def _word_differs(existing: VocabularyEntry, new_word: dict) -> bool:
    if existing.target_text != new_word.get("targetText", ""):
        return True
    if existing.source_usage_example != (new_word.get("sourceUsageExample") or ""):
        return True
    if existing.target_usage_example != (new_word.get("targetUsageExample") or ""):
        return True
    return False


def _extract_source_lang(list_name: str) -> str:
    lang_mapping = {
        "spanish": "es",
        "english": "en",
        "german": "de",
        "russian": "ru",
    }
    parts = list_name.lower().split()
    if parts:
        return lang_mapping.get(parts[0], "en")
    return "en"
