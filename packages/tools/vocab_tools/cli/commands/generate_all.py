from pathlib import Path

import typer
from rich.console import Console
from rich.progress import BarColumn, Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table

from ...config.config_loader import get_config_loader
from ...core.vocabulary_processor import ProcessedVocabulary, ProcessedWord, VocabularyProcessor
from ...core.word_source import SubtitleFrequencySource
from ...exporters.vocabulary_exporter import VocabularyExporter
from ..auto_config import get_smart_output_dir
from ..output.formatters import print_error, print_header, print_success

console = Console()


CEFR_LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"]
SUPPORTED_LANGUAGES = ["en", "es", "de", "ru"]


def _generate_level_vocabulary(
    language: str,
    level: str,
    all_words: list[ProcessedWord],
    output_dir: Path,
    config_loader,
) -> dict:
    level_config = config_loader.config.get_cefr_level(level)
    if not level_config:
        return {"status": "error", "error": f"Unknown CEFR level: {level}"}

    min_rank, max_rank = level_config.rank_range
    target_count = level_config.words

    level_words = []
    for w in all_words:
        if w.rank and min_rank <= w.rank <= max_rank:
            level_words.append(w)

    level_words = level_words[:target_count]

    level_vocab = ProcessedVocabulary(
        language_code=language,
        words=level_words,
        categories={},
        total_words=len(level_words),
        filtered_count=0,
        filtering_stats=None,
    )

    output_path = output_dir / f"{language}_{level}_vocabulary.json"
    exporter = VocabularyExporter(output_format="json")
    exporter.export(level_vocab, output_path)

    return {
        "status": "success",
        "file": output_path,
        "word_count": len(level_words),
        "target_count": target_count,
        "rank_range": (min_rank, max_rank),
    }


def _process_language(
    language: str,
    levels: list[str],
    output_dir: Path,
    config_loader,
    progress,
    main_task,
) -> dict[str, dict]:
    results = {}

    multiplier = config_loader.get_raw_frequency_multiplier(language)
    max_rank = 20000
    fetch_count = int(max_rank * multiplier * 1.5)

    progress.update(main_task, description=f" {language.upper()}: Loading NLP models...")

    processor = VocabularyProcessor(language, silent=True)
    source = SubtitleFrequencySource(language, top_n=fetch_count, lemmatize=True)

    progress.update(main_task, description=f" {language.upper()}: Processing vocabulary...")

    vocab = processor.process_words(
        source,
        filter_inflections=True,
        target_count=None,
        collect_stats=True,
    )

    all_words = vocab.words

    for level in levels:
        progress.update(main_task, description=f" {language.upper()} {level.upper()}...")

        result = _generate_level_vocabulary(
            language=language,
            level=level,
            all_words=all_words,
            output_dir=output_dir,
            config_loader=config_loader,
        )
        results[level] = result
        progress.advance(main_task)

    return results


def _generate_impl(
    language: str | None = None,
    level: str | None = None,
    output_dir: Path | None = None,
) -> None:
    config_loader = get_config_loader()

    languages = [language] if language else SUPPORTED_LANGUAGES
    levels = [level.lower()] if level else CEFR_LEVELS

    if output_dir is None:
        output_dir = get_smart_output_dir("generate")

    output_dir.mkdir(parents=True, exist_ok=True)

    total_tasks = len(languages) * len(levels)

    print_header(
        "GENERATING CEFR VOCABULARY LISTS",
        f"Languages: {', '.join(lang.upper() for lang in languages)}",
    )
    console.print(f"Levels: [cyan]{', '.join(lvl.upper() for lvl in levels)}[/cyan]")
    console.print(f"Total combinations: [cyan]{total_tasks}[/cyan]")
    console.print(f"Output directory: [cyan]{output_dir}[/cyan]")
    console.print("[dim]Note: A0 (transliterations) requires existing translations - use 'detect-a0' command[/dim]\n")

    all_results = {}

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        main_task = progress.add_task(f"Processing {total_tasks} combinations...", total=total_tasks)

        for lang in languages:
            try:
                results = _process_language(
                    language=lang,
                    levels=levels,
                    output_dir=output_dir,
                    config_loader=config_loader,
                    progress=progress,
                    main_task=main_task,
                )
                all_results[lang] = results

            except Exception as e:
                for lvl in levels:
                    if lvl not in all_results.get(lang, {}):
                        if lang not in all_results:
                            all_results[lang] = {}
                        all_results[lang][lvl] = {"status": "error", "error": str(e)}
                        progress.advance(main_task)

    table = Table(title="Generation Results", show_header=True)
    table.add_column("Language", style="cyan")
    table.add_column("Level", style="blue")
    table.add_column("Status", style="green")
    table.add_column("Words", justify="right")
    table.add_column("Target", justify="right", style="dim")
    table.add_column("File", style="dim")

    total_words = 0
    success_count = 0

    for lang in languages:
        for lvl in levels:
            result = all_results.get(lang, {}).get(lvl, {"status": "error", "error": "Not processed"})
            if result["status"] == "success":
                total_words += result["word_count"]
                success_count += 1
                target = str(result["target_count"]) if result["target_count"] != "dynamic" else "auto"
                table.add_row(
                    lang.upper(),
                    lvl.upper(),
                    "✓",
                    str(result["word_count"]),
                    target,
                    result["file"].name,
                )
            else:
                table.add_row(
                    lang.upper(),
                    lvl.upper(),
                    "✗",
                    "-",
                    "-",
                    result.get("error", "Unknown")[:30],
                )

    console.print()
    console.print(table)
    console.print()
    console.print(f"[bold]Summary:[/bold] {success_count}/{total_tasks} successful, {total_words:,} total words")
    print_success("GENERATION COMPLETE")


def generate_all(
    language: str | None = typer.Argument(
        None,
        help="Language code (en, es, de, ru) or leave empty for all languages",
    ),
    level: str | None = typer.Option(
        None,
        "--level",
        "-l",
        help="CEFR level (a1, a2, b1, b2, c1, c2) or leave empty for all levels",
    ),
    output_dir: Path | None = typer.Option(
        None,
        "--output",
        "-o",
        help="Output directory (auto-detected if not specified)",
    ),
) -> None:
    if language:
        language = language.lower()
        if language not in SUPPORTED_LANGUAGES:
            print_error(f"Unknown language: {language}")
            console.print(f"\n[yellow]Available:[/yellow] {', '.join(SUPPORTED_LANGUAGES)}\n")
            raise typer.Exit(1)

    if level:
        level = level.lower()
        if level not in CEFR_LEVELS:
            print_error(f"Unknown level: {level}")
            console.print(f"\n[yellow]Available:[/yellow] {', '.join(CEFR_LEVELS)}\n")
            raise typer.Exit(1)

    _generate_impl(language=language, level=level, output_dir=output_dir)
