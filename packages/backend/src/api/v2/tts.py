import base64
import logging

from core.config import RATE_LIMIT_ENABLED
from core.error_handler import handle_api_errors
from core.security import get_current_user
from fastapi import APIRouter, Depends, HTTPException, Request, status
from generated.schemas import TTSLanguagesResponse, TTSRequest, TTSResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tts", tags=["Text-to-Speech"])
limiter = Limiter(key_func=get_remote_address, enabled=RATE_LIMIT_ENABLED)


def get_tts_service():
    from core.database import tts_db_pool
    from tts_service import TTSService

    return TTSService(tts_db_pool)


@router.post("/synthesize", response_model=TTSResponse)
@limiter.limit("100/minute")
@handle_api_errors("TTS synthesis")
def synthesize_speech(
    request: Request,
    tts_data: TTSRequest,
    current_user: dict = Depends(get_current_user),
) -> TTSResponse:
    tts_service = get_tts_service()
    audio_data = tts_service.synthesize_speech(tts_data.text, tts_data.language)

    if not audio_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to synthesize speech",
        )

    audio_data_b64 = base64.b64encode(audio_data).decode("utf-8")

    return TTSResponse(
        audio_data=audio_data_b64,
        content_type="audio/mpeg",
        text=tts_data.text,
        language=tts_data.language,
    )


@router.get("/languages", response_model=TTSLanguagesResponse)
@limiter.limit("100/minute")
@handle_api_errors("Get TTS languages")
def get_tts_languages(request: Request, current_user: dict = Depends(get_current_user)) -> TTSLanguagesResponse:
    tts_service = get_tts_service()
    return TTSLanguagesResponse(
        available=tts_service.is_available(),
        supported_languages=tts_service.get_supported_languages(),
    )
