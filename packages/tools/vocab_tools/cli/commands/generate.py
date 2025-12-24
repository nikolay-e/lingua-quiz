from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import typer
from rich.console import Console
from rich.progress import BarColumn, Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table

from ...config.config_loader import get_config_loader
from ...core.vocabulary_processor import VocabularyProcessor
from ...core.word_source import SubtitleFrequencySource
from ...exporters.vocabulary_exporter import VocabularyExporter
from ..auto_config import get_smart_output_dir, get_smart_top_n, resolve_language_alias
from ..output.formatters import print_error, print_header, print_success

console = Console()


def _process_language_worker(
    language: str,
    top_n: int,
    output_dir: str,
) -> tuple[str, dict]:
    config_loader = get_config_loader()
    multiplier = config_loader.get_raw_frequency_multiplier(language)
    analysis_defaults = config_loader.get_analysis_defaults()
    source_lemmatize = analysis_defaults.get("source_lemmatize", True)

    processor = VocabularyProcessor(language, silent=True)
    source = SubtitleFrequencySource(language, top_n=int(top_n * multiplier), lemmatize=source_lemmatize)
    vocab = processor.process_words(
        source,
        filter_inflections=True,
        target_count=top_n,
        collect_stats=True,
    )

    output_path = Path(output_dir) / f"{language}_frequency_list.json"
    exporter = VocabularyExporter(output_format="json")
    exporter.export(vocab, output_path)

    return language, {
        "status": "success",
        "file": output_path,
        "word_count": len(vocab.words),
    }


def _generate_impl(
    language: str | None = None,
    top_n: int | None = None,
    output_dir: Path | None = None,
    workers: int | None = None,
) -> None:
    config_loader = get_config_loader()
    supported_languages = config_loader.get_supported_languages()

    if language:
        language = language.lower()
        if language in supported_languages:
            languages = [language]
        else:
            try:
                lang_code, _ = resolve_language_alias(language)
                if lang_code not in supported_languages:
                    raise ValueError
                languages = [lang_code]
            except ValueError:
                print_error(f"Unknown language: {language}")
                console.print(f"\n[yellow]Available:[/yellow] {', '.join(supported_languages)}\n")
                raise typer.Exit(1) from None
    else:
        languages = supported_languages

    if top_n is None:
        if len(languages) == 1:
            top_n = get_smart_top_n("generate", level=None, language=languages[0])
        else:
            top_n = get_smart_top_n("generate", level=None, language=None)
    if output_dir is None:
        output_dir = get_smart_output_dir("generate")

    output_dir.mkdir(parents=True, exist_ok=True)

    if workers is None:
        max_workers = config_loader.get_default_workers()
    else:
        if workers < 1:
            print_error("Workers must be >= 1")
            raise typer.Exit(1)
        max_workers = workers

    print_header(
        "GENERATING FREQUENCY LISTS",
        f"Languages: {', '.join(lang.upper() for lang in languages)}",
    )
    console.print(f"Top-N: [cyan]{top_n:,}[/cyan]")
    if max_workers > 1:
        console.print(f"Workers: [cyan]{max_workers}[/cyan]")
    console.print(f"Output directory: [cyan]{output_dir}[/cyan]\n")

    results = {}

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        main_task = progress.add_task(f"Processing {len(languages)} languages...", total=len(languages))

        if max_workers > 1 and len(languages) > 1:
            with ProcessPoolExecutor(max_workers=max_workers) as executor:
                futures = {
                    executor.submit(_process_language_worker, lang, top_n, str(output_dir)): lang for lang in languages
                }
                for future in as_completed(futures):
                    lang = futures[future]
                    try:
                        _, result = future.result()
                        results[lang] = result
                    except Exception as e:
                        results[lang] = {"status": "error", "error": str(e)}
                    progress.advance(main_task)
                    progress.update(main_task, description=f" Completed {lang.upper()}")
        else:
            for lang in languages:
                try:
                    progress.update(main_task, description=f" Processing {lang.upper()}...")
                    _, result = _process_language_worker(lang, top_n, str(output_dir))
                    results[lang] = result
                    progress.advance(main_task)
                except Exception as e:
                    results[lang] = {"status": "error", "error": str(e)}
                    progress.advance(main_task)

    table = Table(title="Generation Results", show_header=True)
    table.add_column("Language", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Words", justify="right")
    table.add_column("File", style="dim")

    for lang, result in results.items():
        if result["status"] == "success":
            table.add_row(
                lang.upper(),
                "Success",
                str(result["word_count"]),
                result["file"].name,
            )
        else:
            table.add_row(lang.upper(), "Error", "-", result.get("error", "Unknown"))

    console.print()
    console.print(table)
    print_success("GENERATION COMPLETE")


def generate(
    language: str | None = typer.Argument(
        None,
        help="Language code (en, es, de, ru) or leave empty for all languages",
    ),
    top_n: int | None = typer.Option(
        None,
        "--top-n",
        "-n",
        help="Number of words to generate (auto-detected if not specified)",
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
        help="Number of parallel workers (default: 14 from config). Use 1 to disable parallelism.",
    ),
) -> None:
    _generate_impl(language=language, top_n=top_n, output_dir=output_dir, workers=workers)
