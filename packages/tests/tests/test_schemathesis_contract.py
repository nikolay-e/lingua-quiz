import os
from urllib.parse import urlparse

import schemathesis

API_URL = os.getenv("API_URL", "http://localhost:9000/api")
RUN_SCHEMATHESIS = os.getenv("RUN_SCHEMATHESIS", "0") == "1"


def _base_url_from_api(api_url: str) -> str:
    parsed = urlparse(api_url)
    cleaned_path = parsed.path[: -len("/api")] if parsed.path.endswith("/api") else parsed.path
    return parsed._replace(path=cleaned_path).geturl().rstrip("/")


BASE_URL = _base_url_from_api(API_URL)
OPENAPI_URL = f"{BASE_URL}/openapi.json"

if RUN_SCHEMATHESIS:
    schema = schemathesis.openapi.from_url(OPENAPI_URL)

    @schema.parametrize()
    def test_api_contract(case):
        case.call_and_validate(base_url=BASE_URL)
