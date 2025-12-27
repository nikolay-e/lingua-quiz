import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated

import typer
from rich.console import Console
from rich.panel import Panel
from rich.progress import BarColumn, Progress, SpinnerColumn, TextColumn
from rich.table import Table

from vocab_tools.core.api_client import (
    MissingCredentialsError,
    VocabularyAPIAdapter,
    VocabularyEntry,
)

from ._utils import entry_to_dict, list_name_to_filename, normalize_list_name

console = Console()


def _save_vocabulary_to_file(entries: list[VocabularyEntry], output_path: Path, list_name: str):
    data = {
        "listName": list_name,
        "exportedAt": datetime.now(UTC).isoformat(),
        "totalWords": len(entries),
        "words": [entry_to_dict(entry) for entry in entries],
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def export(
    list_name: Annotated[
        str | None,
        typer.Argument(
            help="Vocabulary list to export (e.g., 'es-a1', 'spanish-a1'). If not specified, exports all lists."
        ),
    ] = None,
    output: Annotated[
        Path,
        typer.Option("--output", "-o", help="Output directory for exported files"),
    ] = Path("./exported_vocabularies"),
    format: Annotated[
        str,
        typer.Option("--format", "-f", help="Output format: json (default)"),
    ] = "json",
    include_inactive: Annotated[
        bool,
        typer.Option("--include-inactive", help="Include inactive (soft-deleted) words"),
    ] = False,
):
    """
    Export vocabulary from database to JSON files.

    Downloads vocabulary data from the staging API and saves it to local JSON files
    for editing, backup, or version control.

    Examples:
        vocab-tools export es-a1
        vocab-tools export --output ./backup
        vocab-tools export spanish-a1 -o ./data
    """
    console.print(
        Panel(
            "[bold blue]VOCABULARY EXPORT[/bold blue]\n[dim]Downloading vocabulary from staging API...[/dim]",
            expand=False,
        )
    )
    try:
        adapter = VocabularyAPIAdapter()
    except MissingCredentialsError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1) from None

    output.mkdir(parents=True, exist_ok=True)

    if list_name:
        list_names = [normalize_list_name(list_name)]
    else:
        console.print("[dim]Discovering available vocabulary lists...[/dim]")
        discovered = adapter.discover_migration_files()
        list_names = []
        for lang_lists in discovered.values():
            for filename in lang_lists:
                ln = adapter._filename_to_list_name(filename)
                list_names.append(ln)

        if not list_names:
            console.print("[yellow]No vocabulary lists found in the database.[/yellow]")
            raise typer.Exit(0)

        console.print(f"[green]Found {len(list_names)} vocabulary lists[/green]")

    exported_count = 0
    total_words = 0

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        console=console,
    ) as progress:
        task = progress.add_task("Exporting...", total=len(list_names))

        for ln in list_names:
            progress.update(task, description=f"Exporting {ln}...")

            try:
                entries = adapter.get_vocabulary_by_list(ln)

                if not include_inactive:
                    entries = [e for e in entries if e.is_active]

                if entries:
                    filename = list_name_to_filename(ln)
                    output_path = output / filename
                    _save_vocabulary_to_file(entries, output_path, ln)
                    exported_count += 1
                    total_words += len(entries)

            except Exception as e:
                console.print(f"[yellow]Warning: Failed to export {ln}: {e}[/yellow]")

            progress.advance(task)

    table = Table(title="Export Summary", show_header=True)
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="green")
    table.add_row("Connection", "REST API")
    table.add_row("Lists Exported", str(exported_count))
    table.add_row("Total Words", str(total_words))
    table.add_row("Output Directory", str(output.absolute()))
    table.add_row("Format", format)

    console.print()
    console.print(table)
    console.print("\n[bold green]Export complete![/bold green]")
