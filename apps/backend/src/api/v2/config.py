from core.config import AZURE_SPEECH_API_KEY
from core.error_handler import handle_api_errors
from core.rate_limit import limiter
from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["Config"])


class PublicConfigResponse(BaseModel):
    speech_available: bool


@router.get("/config", response_model=PublicConfigResponse)
@limiter.limit("60/minute")
@handle_api_errors("Get public config")
def get_public_config(request: Request) -> PublicConfigResponse:
    return PublicConfigResponse(
        speech_available=bool(AZURE_SPEECH_API_KEY),
    )
