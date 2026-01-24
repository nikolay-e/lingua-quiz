from core.config import AZURE_SPEECH_API_KEY, AZURE_SPEECH_REGION, RATE_LIMIT_ENABLED
from core.error_handler import handle_api_errors
from fastapi import APIRouter, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/api", tags=["Config"])
limiter = Limiter(key_func=get_remote_address, enabled=RATE_LIMIT_ENABLED)


class PublicConfigResponse(BaseModel):
    azure_speech_api_key: str
    azure_speech_region: str


@router.get("/config", response_model=PublicConfigResponse)
@limiter.limit("60/minute")
@handle_api_errors("Get public config")
def get_public_config(request: Request) -> PublicConfigResponse:
    return PublicConfigResponse(
        azure_speech_api_key=AZURE_SPEECH_API_KEY,
        azure_speech_region=AZURE_SPEECH_REGION,
    )
