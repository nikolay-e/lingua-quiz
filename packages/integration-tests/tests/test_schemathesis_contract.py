import os
from pathlib import Path
from urllib.parse import urlparse

import pytest
import schemathesis

API_URL = os.getenv("API_URL", "http://localhost:9000/api")
RUN_SCHEMATHESIS = os.getenv("RUN_SCHEMATHESIS", "0") == "1"


def _base_url_from_api(api_url: str) -> str:
    parsed = urlparse(api_url)
    cleaned_path = parsed.path[: -len("/api")] if parsed.path.endswith("/api") else parsed.path
    return parsed._replace(path=cleaned_path).geturl().rstrip("/")


schema_path = Path(__file__).resolve().parents[2].parent / "backend" / "openapi.json"

schema = schemathesis.from_path(schema_path, base_url=_base_url_from_api(API_URL))


@pytest.mark.skipif(not RUN_SCHEMATHESIS, reason="Set RUN_SCHEMATHESIS=1 to run contract tests")
@schemathesis.parametrize()
@schemathesis.settings(max_examples=5)
def test_api_contract(case):
    case.call_and_validate()
