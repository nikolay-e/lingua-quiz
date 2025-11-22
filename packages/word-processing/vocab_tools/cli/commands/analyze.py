"""CLI command for vocabulary analysis."""

from pathlib import Path

import typer
from rich import box
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from ...analysis.full_report_generator import FullReportGenerator

console = Console()


def get_list_name(lang_code: str, level: str) -> str:
    """Convert lang_code and level to API list name format."""
    lang_map = {"en": "English", "es": "Spanish", "de": "German", "ru": "Russian"}
    lang_name = lang_map.get(lang_code, lang_code.title())
    return f"{lang_name} Russian {level.upper()}"


def resolve_language_alias(language_level: str) -> tuple[str, str]:
    """Parse language-level string like 'en-a1' or 'spanish-a1'."""
    lang_aliases = {
        "english": "en",
        "spanish": "es",
        "german": "de",
        "russian": "ru",
    }

    parts = language_level.lower().replace("_", "-").split("-")
    if len(parts) != 2:
        raise ValueError(f"Invalid format: {language_level}. Use 'en-a1' or 'spanish-a1'")

    lang, level = parts
    lang_code = lang_aliases.get(lang, lang)

    valid_levels = ["a0", "a1", "a2", "b1", "b2", "c1", "c2"]
    if level not in valid_levels:
        raise ValueError(f"Invalid level: {level}. Use one of: {', '.join(valid_levels)}")

    return lang_code, level


def analyze(
    language_level: str = typer.Argument(
        ...,
        help="Language and level (e.g., en-a1, spanish-a1, de-b1)",
    ),
    output_dir: Path = typer.Option(
        Path(__file__).parent.parent.parent.parent / "reports",
        "--output",
        "-o",
        help="Output directory for reports",
    ),
) -> None:
    """Analyze vocabulary and generate comprehensive report."""
    try:
        lang_code, level = resolve_language_alias(language_level)
        list_name = get_list_name(lang_code, level)

        console.print()
        console.print(
            Panel.fit(
                f"[bold]ANALYZING {lang_code.upper()} {level.upper()} VOCABULARY[/bold]\nList: {list_name}",
                border_style="blue",
            )
        )

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            progress.add_task("Fetching vocabulary from API...", total=None)
            generator = FullReportGenerator(lang_code, list_name)
            result = generator.generate_full_report(output_dir)

        console.print()
        summary_table = Table(title="📊 Analysis Summary", box=box.ROUNDED)
        summary_table.add_column("Metric", style="bold")
        summary_table.add_column("Value", justify="right")

        summary_table.add_row("Total words", f"{result['total_words']:,}")
        summary_table.add_row("Unique words", f"{result['unique_words']:,}")
        summary_table.add_row("Duplicates", f"{result['duplicates_count']}")
        summary_table.add_row("Errors", f"{result['validation_errors']}")
        summary_table.add_row("Warnings", f"{result['validation_warnings']}")

        console.print(summary_table)

        freq = result.get("frequency_analysis", {})
        if freq and "error" not in freq:
            console.print()
            freq_table = Table(title="📈 Frequency Coverage", box=box.ROUNDED)
            freq_table.add_column("Metric", style="bold")
            freq_table.add_column("Value", justify="right")

            freq_table.add_row("Rank range", f"{freq['rank_range'][0]}-{freq['rank_range'][1]}")
            freq_table.add_row("Coverage", f"{freq['coverage_percent']}%")
            freq_table.add_row("Found/Expected", f"{freq['found_words']}/{freq['expected_words']}")

            console.print(freq_table)

            if freq["missing_total"] > 0:
                console.print()
                missing_table = Table(title="🔍 Missing Words", box=box.ROUNDED)
                missing_table.add_column("Priority", style="bold")
                missing_table.add_column("Count", justify="right")

                missing_table.add_row("🔴 Critical (<100)", f"{freq['missing_critical']}")
                missing_table.add_row("🟠 High (<500)", f"{freq['missing_high']}")
                missing_table.add_row("🟡 Medium (<1000)", f"{freq['missing_medium']}")
                missing_table.add_row("Total", f"{freq['missing_total']}", style="bold")

                console.print(missing_table)

        level = result.get("level_analysis", {})
        if level and level.get("words_out_of_range", 0) > 0:
            console.print()
            move_table = Table(title="🔄 Words to Move (out of range)", box=box.ROUNDED)
            move_table.add_column("Target Level", style="bold")
            move_table.add_column("Count", justify="right")

            by_target = level.get("by_target_level", {})
            level_order = ["A2", "B1", "B2", "C1", "C2", "D", "NOT_FOUND", "UNKNOWN"]
            total = 0
            for target in level_order:
                if target in by_target:
                    count = by_target[target]
                    total += count
                    move_table.add_row(f"→ {target}", str(count))

            move_table.add_row("Total", str(total), style="bold")
            console.print(move_table)

        console.print()
        console.print("[bold]📁 Generated Files:[/bold]")
        for name, path in result["files"].items():
            console.print(f"  • {name}: [dim]{path}[/dim]")

        console.print()
        console.print("[green]✅ ANALYSIS COMPLETE[/green]")

    except ValueError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1) from None
    except Exception as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1) from None
