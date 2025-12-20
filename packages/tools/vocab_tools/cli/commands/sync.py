import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from vocab_tools.core.api_client import MissingCredentialsError, VocabularyEntry, get_api_client

from ._utils import entry_to_dict, list_name_to_filename, normalize_list_name

console = Console()


def sync(
    directory: Annotated[
        Path,
        typer.Argument(help="Directory containing vocabulary JSON files to sync"),
    ],
    list_name: Annotated[
        str | None,
        typer.Option("--list", "-l", help="Sync only specific list (e.g., 'es-a1')"),
    ] = None,
    dry_run: Annotated[
        bool,
        typer.Option("--dry-run", "-n", help="Preview changes without making them"),
    ] = False,
    pull_only: Annotated[
        bool,
        typer.Option("--pull", help="Only pull changes from database to files"),
    ] = False,
    push_only: Annotated[
        bool,
        typer.Option("--push", help="Only push changes from files to database"),
    ] = False,
    force: Annotated[
        bool,
        typer.Option("--force", "-f", help="Overwrite without conflict resolution"),
    ] = False,
):
    """
    Synchronize vocabulary between local JSON files and database.

    Performs two-way synchronization:
    - Downloads new/changed words from database to local files
    - Uploads new/changed words from local files to database

    Examples:
        vocab-tools sync ./vocabularies
        vocab-tools sync ./data --pull
        vocab-tools sync ./data --push
        vocab-tools sync ./data -l es-a1 --dry-run
    """
    console.print(
        Panel(
            "[bold blue]VOCABULARY SYNC[/bold blue]\n"
            f"[dim]{'DRY RUN - ' if dry_run else ''}Synchronizing with staging API...[/dim]",
            expand=False,
        )
    )

    if pull_only and push_only:
        console.print("[red]Error: Cannot use --pull and --push together[/red]")
        raise typer.Exit(1)

    if dry_run:
        console.print("[yellow]DRY RUN MODE - No changes will be made[/yellow]\n")

    try:
        client = get_api_client()
    except MissingCredentialsError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1) from None

    directory.mkdir(parents=True, exist_ok=True)

    stats = {
        "pulled": 0,
        "pushed": 0,
        "conflicts": 0,
        "unchanged": 0,
    }

    if list_name:
        list_names = [normalize_list_name(list_name)]
    else:
        list_names = _discover_lists(client, directory)

    if not list_names:
        console.print("[yellow]No vocabulary lists found to sync.[/yellow]")
        raise typer.Exit(0)

    console.print(f"[green]Syncing {len(list_names)} vocabulary list(s)[/green]\n")

    for ln in list_names:
        console.print(f"[bold]Syncing: {ln}[/bold]")

        local_words = _load_local_vocabulary(directory, ln)
        remote_words = _fetch_remote_vocabulary(client, ln)

        local_map = {w["sourceText"].lower(): w for w in local_words}
        remote_map = {e.source_text.lower(): e for e in remote_words}

        if not pull_only:
            push_stats = _push_changes(client, ln, local_map, remote_map, dry_run, force)
            stats["pushed"] += push_stats["pushed"]
            stats["conflicts"] += push_stats["conflicts"]

        if not push_only:
            pull_stats = _pull_changes(directory, ln, local_map, remote_map, dry_run, force)
            stats["pulled"] += pull_stats["pulled"]
            stats["conflicts"] += pull_stats["conflicts"]

        unchanged = len(set(local_map.keys()) & set(remote_map.keys())) - stats["pushed"] - stats["pulled"]
        stats["unchanged"] += max(0, unchanged)

    _print_summary(stats, dry_run)


def _discover_lists(client, directory: Path) -> list[str]:
    list_names = set()

    for json_file in directory.glob("*.json"):
        try:
            with open(json_file, encoding="utf-8") as f:
                data = json.load(f)
            if "listName" in data:
                list_names.add(data["listName"])
        except Exception:
            pass

    try:
        for entry in client.list_vocabulary(limit=10000):
            list_names.add(entry.list_name)
    except Exception:
        pass

    return sorted(list_names)


def _load_local_vocabulary(directory: Path, list_name: str) -> list[dict]:
    filename = list_name_to_filename(list_name)
    file_path = directory / filename

    if not file_path.exists():
        return []

    try:
        with open(file_path, encoding="utf-8") as f:
            data = json.load(f)
        return data.get("words", [])
    except Exception:
        return []


def _fetch_remote_vocabulary(client, list_name: str) -> list[VocabularyEntry]:
    try:
        return client.list_vocabulary(list_name=list_name, limit=10000)
    except Exception:
        return []


def _push_changes(client, list_name: str, local_map: dict, remote_map: dict, dry_run: bool, force: bool) -> dict:
    stats = {"pushed": 0, "conflicts": 0}

    for key, local_word in local_map.items():
        remote_entry = remote_map.get(key)

        if remote_entry is None:
            if not dry_run:
                try:
                    source_lang = local_word.get("sourceLanguage", _extract_source_lang(list_name))
                    client.create_vocabulary_item(
                        source_text=local_word["sourceText"],
                        target_text=local_word["targetText"],
                        list_name=list_name,
                        source_language=source_lang,
                        target_language=local_word.get("targetLanguage", "ru"),
                        difficulty_level=local_word.get("difficultyLevel"),
                        source_usage_example=local_word.get("sourceUsageExample", ""),
                        target_usage_example=local_word.get("targetUsageExample", ""),
                    )
                except Exception:
                    pass
            stats["pushed"] += 1
        elif _word_differs_from_entry(local_word, remote_entry):
            if force:
                if not dry_run:
                    try:
                        client.update_vocabulary_item(
                            item_id=remote_entry.id,
                            target_text=local_word.get("targetText"),
                            source_usage_example=local_word.get("sourceUsageExample"),
                            target_usage_example=local_word.get("targetUsageExample"),
                        )
                    except Exception:
                        pass
                stats["pushed"] += 1
            else:
                stats["conflicts"] += 1

    return stats


def _pull_changes(
    directory: Path, list_name: str, local_map: dict, remote_map: dict, dry_run: bool, force: bool
) -> dict:
    stats = {"pulled": 0, "conflicts": 0}

    updated_words = list(local_map.values())
    changes_made = False

    for key, remote_entry in remote_map.items():
        local_word = local_map.get(key)

        if local_word is None:
            new_word = entry_to_dict(remote_entry)
            updated_words.append(new_word)
            stats["pulled"] += 1
            changes_made = True
        elif _word_differs_from_entry(local_word, remote_entry):
            if force:
                for i, w in enumerate(updated_words):
                    if w.get("sourceText", "").lower() == key:
                        updated_words[i] = entry_to_dict(remote_entry)
                        break
                stats["pulled"] += 1
                changes_made = True
            else:
                stats["conflicts"] += 1

    if changes_made and not dry_run:
        filename = list_name_to_filename(list_name)
        file_path = directory / filename
        _save_vocabulary_to_file(updated_words, file_path, list_name)

    return stats


def _word_differs_from_entry(local_word: dict, remote_entry: VocabularyEntry) -> bool:
    if local_word.get("targetText", "") != remote_entry.target_text:
        return True
    if (local_word.get("sourceUsageExample") or "") != (remote_entry.source_usage_example or ""):
        return True
    if (local_word.get("targetUsageExample") or "") != (remote_entry.target_usage_example or ""):
        return True
    return False


def _save_vocabulary_to_file(words: list[dict], file_path: Path, list_name: str):
    data = {
        "listName": list_name,
        "syncedAt": datetime.now(UTC).isoformat(),
        "totalWords": len(words),
        "words": words,
    }

    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


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


def _print_summary(stats: dict, dry_run: bool):
    console.print()

    table = Table(title="Sync Summary", show_header=True)
    table.add_column("Action", style="cyan")
    table.add_column("Count", style="green")
    table.add_row("Pulled (DB → Local)", str(stats["pulled"]))
    table.add_row("Pushed (Local → DB)", str(stats["pushed"]))
    table.add_row("Unchanged", str(stats["unchanged"]))
    table.add_row(
        "Conflicts",
        str(stats["conflicts"]) if stats["conflicts"] == 0 else f"[yellow]{stats['conflicts']}[/yellow]",
    )

    console.print(table)

    if stats["conflicts"] > 0:
        console.print("\n[yellow]Conflicts detected. Use --force to overwrite.[/yellow]")

    if dry_run:
        console.print("\n[yellow]DRY RUN - No changes were made[/yellow]")
    else:
        console.print("\n[bold green]Sync complete![/bold green]")
