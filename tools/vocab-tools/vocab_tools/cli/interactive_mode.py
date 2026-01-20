from pathlib import Path

from prompt_toolkit import prompt
from prompt_toolkit.completion import Completer, Completion, PathCompleter, WordCompleter
from prompt_toolkit.document import Document
from prompt_toolkit.formatted_text import HTML
from prompt_toolkit.styles import Style
from prompt_toolkit.validation import ValidationError, Validator
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from .commands import generate

console = Console()

style = Style.from_dict(
    {
        "completion-menu.completion": "bg:#008888 #ffffff",
        "completion-menu.completion.current": "bg:#00aaaa #000000",
        "scrollbar.background": "bg:#88aaaa",
        "scrollbar.button": "bg:#222222",
    }
)


class LanguageLevelCompleter(Completer):
    def __init__(self):
        self.options = [
            "en-a1",
            "en-a2",
            "en-b1",
            "en-b2",
            "english-a1",
            "english-a2",
            "english-b1",
            "english-b2",
            "es-a1",
            "es-a2",
            "es-b1",
            "es-b2",
            "spanish-a1",
            "spanish-a2",
            "spanish-b1",
            "spanish-b2",
            "de-a1",
            "de-a2",
            "de-b1",
            "de-b2",
            "german-a1",
            "german-a2",
            "german-b1",
            "german-b2",
            "ru-a1",
            "ru-a2",
            "ru-b1",
            "ru-b2",
            "russian-a1",
            "russian-a2",
            "russian-b1",
            "russian-b2",
        ]

    def get_completions(self, document: Document, _complete_event):
        word = document.text_before_cursor.lower()

        for option in self.options:
            if word in option:
                yield Completion(
                    option,
                    start_position=-len(word),
                    display=option,
                    display_meta="language-level",
                )


class LanguageLevelValidator(Validator):
    def validate(self, document: Document):
        text = document.text.lower()

        if not text:
            return

        if "-" not in text:
            raise ValidationError(message="Format: language-level (e.g., es-a1, spanish-a1)")

        parts = text.split("-")
        if len(parts) != 2:
            raise ValidationError(message="Format: language-level (e.g., es-a1)")

        lang, level = parts

        valid_langs = ["en", "es", "de", "ru", "english", "spanish", "german", "russian"]
        if lang not in valid_langs:
            raise ValidationError(message=f"Invalid language: {lang}. Use: en, es, de, ru")

        valid_levels = ["a1", "a2", "b1", "b2"]
        if level not in valid_levels:
            raise ValidationError(message=f"Invalid level: {level}. Use: a1, a2, b1, b2")


def display_welcome():
    console.print()
    console.print(
        Panel(
            "[bold cyan]vocab-tools[/bold cyan] - Interactive Mode\n\nType command name and press Enter. Use [bold]Ctrl+C[/bold] to exit.",
            border_style="cyan",
        )
    )
    console.print()

    table = Table(show_header=True, header_style="bold cyan", box=None)
    table.add_column("Command", style="cyan", width=12)
    table.add_column("Description", style="white")

    commands = [
        ("analyze", "Analyze vocabulary and generate comprehensive report"),
        ("export", "Export vocabulary from database to JSON files"),
        ("generate", "Generate frequency word lists from subtitle data"),
        ("import", "Import vocabulary from JSON files to database"),
        ("sync", "Synchronize vocabulary between files and database"),
        ("validate", "Validate vocabulary data quality"),
        ("exit", "Exit interactive mode"),
    ]

    for cmd, desc in commands:
        table.add_row(cmd, desc)

    console.print(table)
    console.print()


def prompt_command() -> str | None:
    completer = WordCompleter(
        ["analyze", "export", "generate", "import", "sync", "validate", "exit"],
        ignore_case=True,
        sentence=True,
    )

    try:
        command = (
            prompt(
                HTML("<ansicyan><b>Command:</b></ansicyan> "),
                completer=completer,
                complete_while_typing=True,
                style=style,
            )
            .strip()
            .lower()
        )

        return command if command else None

    except (KeyboardInterrupt, EOFError):
        return "exit"


def prompt_language_level(command_name: str) -> str | None:
    console.print(f"\n[dim]Command: {command_name}[/dim]")

    completer = LanguageLevelCompleter()
    validator = LanguageLevelValidator()

    try:
        lang_level = (
            prompt(
                HTML("<ansicyan><b>Language-Level:</b></ansicyan> "),
                completer=completer,
                complete_while_typing=True,
                validator=validator,
                validate_while_typing=False,
                style=style,
            )
            .strip()
            .lower()
        )

        return lang_level if lang_level else None

    except (KeyboardInterrupt, EOFError):
        console.print("\n[yellow]Cancelled[/yellow]")
        return None


def prompt_language(command_name: str) -> str | None:
    console.print(f"\n[dim]Command: {command_name}[/dim]")
    console.print("[dim]Leave empty for all languages[/dim]")

    completer = WordCompleter(
        ["en", "es", "de", "ru", "english", "spanish", "german", "russian"],
        ignore_case=True,
    )

    try:
        language = (
            prompt(
                HTML("<ansicyan><b>Language (optional):</b></ansicyan> "),
                completer=completer,
                complete_while_typing=True,
                style=style,
            )
            .strip()
            .lower()
        )

        return language if language else None

    except (KeyboardInterrupt, EOFError):
        console.print("\n[yellow]Cancelled[/yellow]")
        return None


def prompt_path(command_name: str, message: str = "Path", default: str = ".") -> Path | None:
    console.print(f"\n[dim]Command: {command_name}[/dim]")

    completer = PathCompleter(only_directories=True, expanduser=True)

    try:
        path_str = prompt(
            HTML(f"<ansicyan><b>{message}:</b></ansicyan> "),
            completer=completer,
            complete_while_typing=True,
            style=style,
            default=default,
        ).strip()

        return Path(path_str).expanduser() if path_str else Path(default)

    except (KeyboardInterrupt, EOFError):
        console.print("\n[yellow]Cancelled[/yellow]")
        return None


def prompt_yes_no(message: str, default: bool = False) -> bool:
    default_str = "Y/n" if default else "y/N"
    try:
        answer = (
            prompt(
                HTML(f"<ansicyan><b>{message}</b></ansicyan> [{default_str}]: "),
                style=style,
            )
            .strip()
            .lower()
        )

        if not answer:
            return default
        return answer in ("y", "yes", "да")

    except (KeyboardInterrupt, EOFError):
        return False


def run_interactive_mode():
    display_welcome()

    while True:
        command = prompt_command()

        if not command or command == "exit":
            console.print("\n[cyan]Goodbye![/cyan]\n")
            break

        try:
            if command == "analyze":
                lang_level = prompt_language_level("analyze")
                if lang_level:
                    console.print()
                    from .commands.analyze import analyze

                    analyze(language_level=lang_level, format="all", top_n=None, output_dir=None)

            elif command == "export":
                console.print("\n[dim]Command: export[/dim]")
                console.print("[dim]Leave empty to export all lists[/dim]")

                completer = LanguageLevelCompleter()
                try:
                    lang_level = (
                        prompt(
                            HTML("<ansicyan><b>List (optional):</b></ansicyan> "),
                            completer=completer,
                            complete_while_typing=True,
                            style=style,
                        )
                        .strip()
                        .lower()
                    )
                except (KeyboardInterrupt, EOFError):
                    console.print("\n[yellow]Cancelled[/yellow]")
                    continue

                output_path = prompt_path("export", "Output directory", "./exported_vocabularies")
                if output_path:
                    console.print()
                    from .commands.export import export

                    export(
                        list_name=lang_level if lang_level else None,
                        output=output_path,
                        format="json",
                        include_inactive=False,
                    )

            elif command == "generate":
                language = prompt_language("generate")
                console.print()
                generate._generate_impl(language=language)

            elif command == "import":
                input_path = prompt_path("import", "Input file/directory", "./exported_vocabularies")
                if input_path:
                    dry_run = prompt_yes_no("Dry run (preview only)?", default=True)
                    update = prompt_yes_no("Update existing words?", default=False)

                    console.print()
                    from .commands.import_cmd import import_vocabulary

                    import_vocabulary(
                        input_path=input_path,
                        dry_run=dry_run,
                        update_existing=update,
                        skip_existing=True,
                        batch_size=50,
                    )

            elif command == "sync":
                sync_path = prompt_path("sync", "Directory to sync", "./vocabularies")
                if sync_path:
                    dry_run = prompt_yes_no("Dry run (preview only)?", default=True)

                    console.print()
                    from .commands.sync import sync

                    sync(
                        directory=sync_path,
                        list_name=None,
                        dry_run=dry_run,
                        pull_only=False,
                        push_only=False,
                        force=False,
                    )

            elif command == "validate":
                console.print("\n[dim]Command: validate[/dim]")
                console.print("[dim]Leave empty to validate all lists[/dim]")

                completer = LanguageLevelCompleter()
                try:
                    lang_level = (
                        prompt(
                            HTML("<ansicyan><b>List (optional):</b></ansicyan> "),
                            completer=completer,
                            complete_while_typing=True,
                            style=style,
                        )
                        .strip()
                        .lower()
                    )
                except (KeyboardInterrupt, EOFError):
                    console.print("\n[yellow]Cancelled[/yellow]")
                    continue

                console.print()
                from .commands.validate import validate

                validate(
                    list_name=lang_level if lang_level else None,
                    check_duplicates=True,
                    check_quality=True,
                    check_syntax=True,
                    cross_file=True,
                    verbose=False,
                )

            else:
                console.print(f"\n[yellow]Unknown command: {command}[/yellow]")
                console.print("[dim]Type 'exit' to quit[/dim]\n")
                continue

        except Exception as e:
            console.print(f"\n[red]Error:[/red] {e}\n")
            import traceback

            console.print(f"[dim]{traceback.format_exc()}[/dim]")

        console.print()
