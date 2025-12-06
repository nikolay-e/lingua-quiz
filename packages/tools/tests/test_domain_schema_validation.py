from pathlib import Path

import jsonschema
import pytest
import yaml


@pytest.fixture(scope="module")
def schemas():
    """Load domain schemas from unified OpenAPI spec."""
    root = Path(__file__).resolve().parents[3]
    openapi = yaml.safe_load((root / "lingua-quiz-schema.json").read_text())
    schemas_dict = openapi["components"]["schemas"]
    return {"vocabulary": schemas_dict["VocabularyItemResponse"], "progress": schemas_dict["UserProgressResponse"]}


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
