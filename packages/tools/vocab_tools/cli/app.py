import sys

import typer
from rich.console import Console

from .commands import analyze as analyze_cmd
from .commands import detect_a0 as detect_a0_cmd
from .commands import export as export_cmd
from .commands import generate as generate_cmd
from .commands import generate_all as generate_all_cmd
from .commands import import_cmd
from .commands import move as move_cmd
from .commands import sync as sync_cmd
from .commands import validate as validate_cmd

app = typer.Typer(
    name="vocab-tools",
    help="Vocabulary processing toolkit for LinguaQuiz CEFR word lists",
    add_completion=True,
    rich_markup_mode="rich",
    no_args_is_help=False,
)

console = Console()

app.command(name="analyze", help="Analyze vocabulary and generate comprehensive report with validation")(
    analyze_cmd.analyze
)
app.command(name="detect-a0", help="Detect A0 transliterations in existing vocabularies")(detect_a0_cmd.detect_a0)
app.command(name="export", help="Export vocabulary from database to JSON files")(export_cmd.export)
app.command(name="generate", help="Generate frequency word lists from subtitle data")(generate_cmd.generate)
app.command(name="generate-all", help="Generate CEFR vocabularies for all levels and languages")(
    generate_all_cmd.generate_all
)
app.command(name="import", help="Import vocabulary from JSON files to database")(import_cmd.import_vocabulary)
app.command(name="move", help="Move words to their correct CEFR levels based on frequency")(move_cmd.move)
app.command(name="sync", help="Synchronize vocabulary between local files and database")(sync_cmd.sync)
app.command(name="validate", help="Validate vocabulary data quality")(validate_cmd.validate)


def main():
    if len(sys.argv) == 1:
        console.print("\n[bold blue]Starting interactive mode...[/bold blue]")
        console.print("[dim]Tip: Use 'vocab-tools <command>' for direct execution[/dim]\n")

        from vocab_tools.cli.interactive_mode import run_interactive_mode

        run_interactive_mode()
    else:
        app()


if __name__ == "__main__":
    main()
