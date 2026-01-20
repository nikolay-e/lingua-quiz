from concurrent.futures import ProcessPoolExecutor, as_completed
from typing import Annotated

import typer
from rich.console import Console
from rich.panel import Panel
from rich.progress import BarColumn, Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table
from rich.tree import Tree

from vocab_tools.config.config_loader import get_config_loader
from vocab_tools.core.api_client import MissingCredentialsError, VocabularyAPIAdapter
from vocab_tools.validation.migration_validator import MigrationValidator

from ._utils import normalize_list_name

console = Console()


def _validate_list_worker(
    list_name: str,
    check_duplicates: bool,
    check_quality: bool,
    check_syntax: bool,
    verbose: bool,
) -> tuple[str, dict]:
    try:
        validator = MigrationValidator()
        entries = validator.db_parser.get_vocabulary_by_list(list_name)
        word_count = len(entries)

        issues = []
        warnings = []

        if check_duplicates:
            dup_issues = _check_duplicates(entries, verbose)
            issues.extend(dup_issues)

        if check_quality:
            quality_issues, quality_warnings = _check_quality(entries, verbose)
            issues.extend(quality_issues)
            warnings.extend(quality_warnings)

        if check_syntax:
            syntax_issues = _check_syntax(entries, verbose)
            issues.extend(syntax_issues)

        return list_name, {
            "status": "success",
            "word_count": word_count,
            "issues": issues,
            "warnings": warnings,
        }
    except Exception as e:
        return list_name, {
            "status": "error",
            "word_count": 0,
            "issues": [{"type": "error", "message": str(e)}],
            "warnings": [],
        }


def validate(
    list_name: Annotated[
        str | None,
        typer.Argument(help="Specific vocabulary list to validate (e.g., 'es-a1'). Validates all if not specified."),
    ] = None,
    check_duplicates: Annotated[
        bool,
        typer.Option("--duplicates/--no-duplicates", help="Check for duplicate words"),
    ] = True,
    check_quality: Annotated[
        bool,
        typer.Option("--quality/--no-quality", help="Check word quality (empty fields, placeholders)"),
    ] = True,
    check_syntax: Annotated[
        bool,
        typer.Option("--syntax/--no-syntax", help="Check answer syntax (brackets, alternatives)"),
    ] = True,
    cross_file: Annotated[
        bool,
        typer.Option("--cross-file/--no-cross-file", help="Check duplicates across different lists"),
    ] = True,
    verbose: Annotated[
        bool,
        typer.Option("--verbose", "-v", help="Show detailed validation output"),
    ] = False,
    workers: Annotated[
        int | None,
        typer.Option("--workers", "-j", help="Number of parallel workers (default: 14 from config)"),
    ] = None,
):
    """
    Validate vocabulary data quality.

    Runs comprehensive validation checks on vocabulary in the database:
    - Duplicate detection (within and across lists)
    - Quality checks (empty fields, placeholders, identical translations)
    - Syntax validation (brackets, alternatives, grouping)

    Examples:
        vocab-tools validate
        vocab-tools validate es-a1
        vocab-tools validate --no-cross-file
        vocab-tools validate -v
    """
    config_loader = get_config_loader()

    console.print(
        Panel(
            "[bold blue]VOCABULARY VALIDATION[/bold blue]\n[dim]Checking data quality...[/dim]",
            expand=False,
        )
    )

    try:
        validator = MigrationValidator()
    except MissingCredentialsError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1) from None

    if list_name:
        list_names = [normalize_list_name(list_name)]
    else:
        console.print("[dim]Discovering vocabulary lists...[/dim]")
        adapter = VocabularyAPIAdapter()
        discovered = adapter.discover_migration_files()
        list_names = []
        for lang_lists in discovered.values():
            for filename in lang_lists:
                ln = adapter._filename_to_list_name(filename)
                list_names.append(ln)

    if not list_names:
        console.print("[yellow]No vocabulary lists found to validate.[/yellow]")
        raise typer.Exit(0)

    if workers is None:
        max_workers = config_loader.get_default_workers()
    else:
        if workers < 1:
            console.print("[red]Workers must be >= 1[/red]")
            raise typer.Exit(1)
        max_workers = workers

    console.print(f"[green]Validating {len(list_names)} vocabulary list(s)[/green]")
    if max_workers > 1:
        console.print(f"[dim]Using {max_workers} parallel workers[/dim]")
    console.print()

    all_issues: dict[str, list[dict]] = {}
    all_warnings: dict[str, list[dict]] = {}
    total_words = 0

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        main_task = progress.add_task(f"Validating {len(list_names)} lists...", total=len(list_names))

        if max_workers > 1 and len(list_names) > 1:
            with ProcessPoolExecutor(max_workers=max_workers) as executor:
                futures = {
                    executor.submit(
                        _validate_list_worker, ln, check_duplicates, check_quality, check_syntax, verbose
                    ): ln
                    for ln in list_names
                }
                for future in as_completed(futures):
                    ln = futures[future]
                    try:
                        _, result = future.result()
                        total_words += result["word_count"]
                        if result["issues"]:
                            all_issues[ln] = result["issues"]
                        if result["warnings"]:
                            all_warnings[ln] = result["warnings"]
                    except Exception as e:
                        all_issues[ln] = [{"type": "error", "message": str(e)}]
                    progress.advance(main_task)
                    progress.update(main_task, description=f" Validated {ln}")
        else:
            for ln in list_names:
                progress.update(main_task, description=f" Validating {ln}...")
                _, result = _validate_list_worker(ln, check_duplicates, check_quality, check_syntax, verbose)
                total_words += result["word_count"]
                if result["issues"]:
                    all_issues[ln] = result["issues"]
                if result["warnings"]:
                    all_warnings[ln] = result["warnings"]
                progress.advance(main_task)

    if cross_file and len(list_names) > 1:
        console.print("\n[bold]Cross-file duplicate check...[/bold]")
        cross_issues = _check_cross_file_duplicates(validator, list_names, verbose)
        if cross_issues:
            all_issues["cross-file"] = cross_issues
            console.print(f"  [red]{len(cross_issues)} cross-file duplicates found[/red]")
        else:
            console.print("  [green]No cross-file duplicates[/green]")

    _print_summary(all_issues, all_warnings, total_words, verbose)


def _check_duplicates(entries, verbose: bool) -> list[dict]:
    issues = []
    seen = {}

    for entry in entries:
        key = entry.source_text.lower().strip()
        if key in seen:
            issues.append(
                {
                    "type": "duplicate",
                    "word": entry.source_text,
                    "message": f"Duplicate of '{seen[key].source_text}'",
                }
            )
        else:
            seen[key] = entry

    return issues


def _check_quality(entries, verbose: bool) -> tuple[list[dict], list[dict]]:
    issues = []
    warnings = []

    for entry in entries:
        if not entry.source_text.strip():
            issues.append({"type": "empty_source", "word": "(empty)", "message": "Empty source text"})

        if not entry.target_text.strip():
            issues.append({"type": "empty_target", "word": entry.source_text, "message": "Empty target text"})

        if entry.source_text.lower() == entry.target_text.lower():
            issues.append(
                {
                    "type": "identical",
                    "word": entry.source_text,
                    "message": "Source and target are identical",
                }
            )

        if "[translation" in entry.target_text.lower() or "[needs" in entry.target_text.lower():
            issues.append(
                {
                    "type": "placeholder",
                    "word": entry.source_text,
                    "message": f"Placeholder found: {entry.target_text}",
                }
            )

        if not entry.source_usage_example and not entry.target_usage_example:
            warnings.append(
                {
                    "type": "missing_examples",
                    "word": entry.source_text,
                    "message": "Missing usage examples",
                }
            )

    return issues, warnings


def _check_syntax(entries, verbose: bool) -> list[dict]:
    issues = []

    for entry in entries:
        for text, field_name in [(entry.target_text, "target"), (entry.source_text, "source")]:
            bracket_count = text.count("[") - text.count("]")
            if bracket_count != 0:
                issues.append(
                    {
                        "type": "unbalanced_brackets",
                        "word": entry.source_text,
                        "message": f"Unbalanced [] in {field_name}: {text}",
                    }
                )

            paren_count = text.count("(") - text.count(")")
            if paren_count != 0:
                issues.append(
                    {
                        "type": "unbalanced_parens",
                        "word": entry.source_text,
                        "message": f"Unbalanced () in {field_name}: {text}",
                    }
                )

    return issues


def _check_cross_file_duplicates(validator, list_names: list[str], verbose: bool) -> list[dict]:
    issues = []
    all_words: dict[str, str] = {}

    for ln in list_names:
        try:
            entries = validator.db_parser.get_vocabulary_by_list(ln)
            for entry in entries:
                key = entry.source_text.lower().strip()
                if key in all_words:
                    other_list = all_words[key]
                    if other_list != ln:
                        issues.append(
                            {
                                "type": "cross_duplicate",
                                "word": entry.source_text,
                                "message": f"Also in '{other_list}'",
                                "list": ln,
                            }
                        )
                else:
                    all_words[key] = ln
        except Exception:
            pass

    return issues


def _print_summary(issues: dict, warnings: dict, total_words: int, verbose: bool):
    console.print()

    total_issues = sum(len(v) for v in issues.values())
    total_warnings = sum(len(v) for v in warnings.values())

    table = Table(title="Validation Summary", show_header=True)
    table.add_column("Metric", style="cyan")
    table.add_column("Count", style="green")
    table.add_row("Total Words Checked", str(total_words))
    table.add_row(
        "Errors",
        str(total_issues) if total_issues == 0 else f"[red]{total_issues}[/red]",
    )
    table.add_row(
        "Warnings",
        str(total_warnings) if total_warnings == 0 else f"[yellow]{total_warnings}[/yellow]",
    )

    console.print(table)

    if verbose and (total_issues > 0 or total_warnings > 0):
        console.print()
        tree = Tree("[bold]Issues by List[/bold]")

        for list_name, list_issues in issues.items():
            branch = tree.add(f"[red]{list_name}[/red] ({len(list_issues)} errors)")
            for issue in list_issues[:10]:
                branch.add(f"[dim]{issue['type']}:[/dim] {issue.get('word', '')} - {issue['message']}")
            if len(list_issues) > 10:
                branch.add(f"[dim]... and {len(list_issues) - 10} more[/dim]")

        for list_name, list_warnings in warnings.items():
            if list_name not in issues:
                branch = tree.add(f"[yellow]{list_name}[/yellow] ({len(list_warnings)} warnings)")
            else:
                branch = [b for b in tree.children if list_name in str(b.label)][0]

            for warning in list_warnings[:5]:
                branch.add(f"[dim]{warning['type']}:[/dim] {warning.get('word', '')} - {warning['message']}")

        console.print(tree)

    if total_issues == 0:
        console.print("\n[bold green]Validation passed![/bold green]")
    else:
        console.print("\n[bold red]Validation failed![/bold red]")
        raise typer.Exit(1)
