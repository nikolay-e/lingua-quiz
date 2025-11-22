from pathlib import Path

import jsonschema
import pytest
import yaml


@pytest.fixture(scope="module")
def schemas():
    """Load domain schemas for validation."""
    root = Path(__file__).resolve().parents[2] / "domain-schema"
    vocab_schema = yaml.safe_load((root / "vocabulary_item.schema.json").read_text())
    progress_schema = yaml.safe_load((root / "user_progress.schema.json").read_text())
    return {"vocabulary": vocab_schema, "progress": progress_schema}


def test_vocabulary_item_schema_accepts_sample(schemas):
    sample = {
        "id": "123",
        "sourceText": "hello",
        "sourceLanguage": "en",
        "targetText": "привет",
        "targetLanguage": "ru",
        "listName": "english-russian-a1",
        "sourceUsageExample": None,
        "targetUsageExample": None,
    }
    jsonschema.Draft202012Validator(schemas["vocabulary"]).validate(sample)


def test_user_progress_schema_accepts_sample(schemas):
    sample = {
        "vocabularyItemId": "123",
        "sourceText": "hello",
        "sourceLanguage": "en",
        "targetLanguage": "ru",
        "level": 1,
        "queuePosition": 0,
        "correctCount": 2,
        "incorrectCount": 1,
        "consecutiveCorrect": 1,
        "lastPracticed": None,
    }
    jsonschema.Draft202012Validator(schemas["progress"]).validate(sample)
