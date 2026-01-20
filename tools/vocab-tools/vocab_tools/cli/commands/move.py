from collections import defaultdict

import typer
from rich import box
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from ...analysis.level_coverage_analyzer import CEFR_FREQUENCY_RANGES, LevelCoverageAnalyzer
from ...core.api_client import StagingAPIClient
from ._utils import get_list_name, resolve_language_alias

console = Console()


def move(
    language_level: str = typer.Argument(
        ...,
        help="Language and level to move words FROM (e.g., en-a1, spanish-a1)",
    ),
    dry_run: bool = typer.Option(
        False,
        "--dry-run",
        "-n",
        help="Show what would be moved without making changes",
    ),
    yes: bool = typer.Option(
        False,
        "--yes",
        "-y",
        help="Skip confirmation prompt",
    ),
) -> None:
    try:
        lang_code, level = resolve_language_alias(language_level)
        list_name = get_list_name(lang_code, level)

        console.print()
        console.print(
            Panel.fit(
                f"[bold]MOVE WORDS FROM {lang_code.upper()} {level.upper()}[/bold]\nList: {list_name}",
                border_style="blue",
            )
        )

        client = StagingAPIClient()

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            progress.add_task("Fetching vocabulary and analyzing...", total=None)
            entries = client.fetch_vocabulary(list_name)

            analyzer = LevelCoverageAnalyzer()

            from ...config.config_loader import get_config_loader
            from ...core.base_normalizer import get_universal_normalizer

            config_loader = get_config_loader()
            normalizer = get_universal_normalizer(lang_code, config_loader)

            expected_range = CEFR_FREQUENCY_RANGES.get(level, (1, 1000))

            _, _, mismatches = analyzer._analyze_words_from_entries(
                entries, normalizer, lang_code, level, expected_range, f"{lang_code}-{level}", show_progress=False
            )

        entry_by_word = {}
        for entry in entries:
            word_variants = normalizer.extract_word_variants(entry.source_text)
            for word in word_variants:
                if word:
                    entry_by_word[word.lower()] = entry

        by_target_level = defaultdict(list)
        for mismatch in mismatches:
            if mismatch.expected_level == "unknown":
                continue

            target = mismatch.expected_level.upper()
            entry = entry_by_word.get(mismatch.word.lower())
            if entry and entry.id:
                by_target_level[target].append(
                    {
                        "word": mismatch.word,
                        "entry_id": entry.id,
                        "rank": mismatch.actual_rank,
                        "target_list": get_list_name(lang_code, mismatch.expected_level),
                    }
                )

        if not by_target_level:
            console.print("\n[green]All words are in the correct level![/green]")
            return

        console.print()
        move_table = Table(title="Words to Move", box=box.ROUNDED)
        move_table.add_column("Target Level", style="bold")
        move_table.add_column("Count", justify="right")

        level_order = ["A2", "B1", "B2", "C1", "C2", "D"]
        total = 0
        for target in level_order:
            if target in by_target_level:
                count = len(by_target_level[target])
                total += count
                move_table.add_row(f"→ {target}", str(count))

        move_table.add_row("Total", str(total), style="bold")
        console.print(move_table)

        if dry_run:
            console.print("\n[yellow]Dry run - no changes made[/yellow]")

            for target in level_order:
                if target in by_target_level:
                    console.print(f"\n[bold]→ {target}:[/bold]")
                    for item in by_target_level[target][:10]:
                        console.print(f"  • {item['word']} (rank {item['rank']})")
                    if len(by_target_level[target]) > 10:
                        console.print(f"  ... and {len(by_target_level[target]) - 10} more")
            return

        if not yes:
            console.print()
            confirm = typer.confirm(f"Move {total} words to their correct levels?")
            if not confirm:
                console.print("[yellow]Cancelled[/yellow]")
                raise typer.Exit(0)

        console.print()
        moved = 0
        errors = 0

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Moving words...", total=total)

            for target in level_order:
                if target not in by_target_level:
                    continue

                for item in by_target_level[target]:
                    try:
                        client.update_vocabulary_item(
                            item_id=item["entry_id"],
                            list_name=item["target_list"],
                        )
                        moved += 1
                    except Exception as e:
                        errors += 1
                        console.print(f"[red]Error moving {item['word']}: {e}[/red]")

                    progress.advance(task)

        console.print()
        if errors == 0:
            console.print(f"[green]Successfully moved {moved} words[/green]")
        else:
            console.print(f"[yellow]Moved {moved} words, {errors} errors[/yellow]")

    except ValueError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1) from None
    except Exception as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1) from None
