from concurrent.futures import ProcessPoolExecutor, as_completed
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


def _get_supported_languages(config_loader) -> list[str]:
    return list(config_loader.config.languages.keys())


def _get_supported_levels(config_loader) -> list[str]:
    return [level for level in config_loader.config.cefr_levels.keys() if level != "a0"]


def _generate_level_vocabulary(
    language: str,
    level: str,
    all_words: list[ProcessedWord],
    output_dir: Path,
    config_loader,
    start_index: int = 0,
) -> dict:
    level_config = config_loader.config.get_cefr_level(level)
    if not level_config:
        return {"status": "error", "error": f"Unknown CEFR level: {level}"}

    target_count = level_config.words
    end_index = start_index + target_count

    level_words = all_words[start_index:end_index]

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
        "start_index": start_index,
        "end_index": end_index,
    }


def _process_language(
    language: str,
    levels: list[str],
    output_dir: Path,
    config_loader,
    progress=None,
    main_task=None,
) -> dict[str, dict]:
    results = {}

    total_words_needed = 0
    for level in levels:
        level_config = config_loader.config.get_cefr_level(level)
        if level_config:
            total_words_needed += level_config.words

    multiplier = config_loader.get_raw_frequency_multiplier(language)
    analysis_defaults = config_loader.get_analysis_defaults()
    source_lemmatize = analysis_defaults.get("source_lemmatize", True)

    survival_rate = 0.35
    fetch_count = int(total_words_needed / survival_rate * multiplier * 1.5)

    if progress is not None and main_task is not None:
        progress.update(main_task, description=f" {language.upper()}: Loading NLP models...")

    processor = VocabularyProcessor(language, silent=True)
    source = SubtitleFrequencySource(language, top_n=fetch_count, lemmatize=source_lemmatize)

    if progress is not None and main_task is not None:
        progress.update(main_task, description=f" {language.upper()}: Processing vocabulary...")

    vocab = processor.process_words(
        source,
        filter_inflections=True,
        target_count=total_words_needed,
        collect_stats=True,
    )

    if vocab.filtered_words:
        filtered_path = output_dir / f"{language}_filtered.json"
        exporter = VocabularyExporter(output_format="json")
        exporter.export_filtered(vocab.filtered_words, language, filtered_path)

    all_words = vocab.words

    start_index = 0
    for level in levels:
        if progress is not None and main_task is not None:
            progress.update(main_task, description=f" {language.upper()} {level.upper()}...")

        result = _generate_level_vocabulary(
            language=language,
            level=level,
            all_words=all_words,
            output_dir=output_dir,
            config_loader=config_loader,
            start_index=start_index,
        )
        results[level] = result

        level_config = config_loader.config.get_cefr_level(level)
        if level_config:
            start_index += level_config.words

        if progress is not None and main_task is not None:
            progress.advance(main_task)

    return results


def _process_language_worker(
    language: str,
    levels: list[str],
    output_dir: str,
) -> tuple[str, dict[str, dict]]:
    config_loader = get_config_loader()
    results = _process_language(
        language=language,
        levels=levels,
        output_dir=Path(output_dir),
        config_loader=config_loader,
        progress=None,
        main_task=None,
    )
    return language, results


def _generate_impl(
    language: str | None = None,
    level: str | None = None,
    output_dir: Path | None = None,
    workers: int | None = None,
) -> None:
    config_loader = get_config_loader()

    supported_languages = _get_supported_languages(config_loader)
    supported_levels = _get_supported_levels(config_loader)

    languages = [language] if language else supported_languages
    levels = [level.lower()] if level else supported_levels

    if output_dir is None:
        output_dir = get_smart_output_dir("generate")

    output_dir.mkdir(parents=True, exist_ok=True)

    total_tasks = len(languages) * len(levels)

    if workers is None:
        max_workers = config_loader.get_default_workers()
    else:
        if workers < 1:
            print_error("Workers must be >= 1")
            raise typer.Exit(1)
        max_workers = workers

    print_header(
        "GENERATING CEFR VOCABULARY LISTS",
        f"Languages: {', '.join(lang.upper() for lang in languages)}",
    )
    console.print(f"Levels: [cyan]{', '.join(lvl.upper() for lvl in levels)}[/cyan]")
    if max_workers > 1:
        if workers and max_workers < workers:
            console.print(f"Workers: [cyan]{max_workers}[/cyan] [dim](capped by languages)[/dim]")
        else:
            console.print(f"Workers: [cyan]{max_workers}[/cyan]")
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

        if max_workers > 1 and len(languages) > 1:
            with ProcessPoolExecutor(max_workers=max_workers) as executor:
                futures = {
                    executor.submit(_process_language_worker, lang, levels, str(output_dir)): lang for lang in languages
                }
                for future in as_completed(futures):
                    lang = futures[future]
                    try:
                        _, results = future.result()
                        all_results[lang] = results
                    except Exception as e:
                        all_results[lang] = {lvl: {"status": "error", "error": str(e)} for lvl in levels}
                    progress.advance(main_task, advance=len(levels))
                    progress.update(main_task, description=f" Completed {lang.upper()} ({len(levels)} levels)")
        else:
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
    workers: int | None = typer.Option(
        None,
        "--workers",
        "-j",
        help="Number of parallel worker processes (default: min(cpu, languages)). Use 1 to disable parallelism.",
    ),
) -> None:
    config_loader = get_config_loader()

    if language:
        language = language.lower()
        supported_languages = _get_supported_languages(config_loader)
        if language not in supported_languages:
            print_error(f"Unknown language: {language}")
            console.print(f"\n[yellow]Available:[/yellow] {', '.join(supported_languages)}\n")
            raise typer.Exit(1)

    if level:
        level = level.lower()
        supported_levels = _get_supported_levels(config_loader)
        if level not in supported_levels:
            print_error(f"Unknown level: {level}")
            console.print(f"\n[yellow]Available:[/yellow] {', '.join(supported_levels)}\n")
            raise typer.Exit(1)

    _generate_impl(language=language, level=level, output_dir=output_dir, workers=workers)
