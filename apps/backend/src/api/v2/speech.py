import base64

from core.config import AZURE_SPEECH_API_KEY, AZURE_SPEECH_REGION, RATE_LIMIT_ENABLED
from core.error_handler import handle_api_errors
from core.logging import get_logger
from core.security import get_current_user
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from generated.schemas import (
    PhonemeAssessmentSchema,
    SpeechAssessResponse,
    WordAssessmentSchema,
)
import httpx
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = get_logger(__name__)
router = APIRouter(prefix="/api/speech", tags=["Speech"])
limiter = Limiter(key_func=get_remote_address, enabled=RATE_LIMIT_ENABLED)

SUPPORTED_LANGUAGES = {"en-US", "fr-FR", "es-ES", "de-DE"}
MAX_AUDIO_SIZE = 5 * 1024 * 1024
AZURE_API_TIMEOUT = 30.0


def _build_pronunciation_config(reference_text: str) -> str:
    import json

    config = {
        "referenceText": reference_text,
        "gradingSystem": "HundredMark",
        "granularity": "Phoneme",
        "dimension": "Comprehensive",
        "enableMiscue": True,
        "enableProsodyAssessment": True,
        "phonemeAlphabet": "IPA",
        "nBestPhonemeCount": 5,
    }
    raw = json.dumps(config)
    return base64.b64encode(raw.encode("utf-8")).decode("utf-8")


def _parse_azure_response(data: dict, reference_text: str) -> SpeechAssessResponse:
    n_best = data.get("NBest", [])
    if not n_best:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No pronunciation assessment results from Azure",
        )

    best = n_best[0]
    pa = best.get("PronunciationAssessment")

    if pa is not None:
        accuracy = pa.get("AccuracyScore", 0)
        fluency = pa.get("FluencyScore", 0)
        completeness = pa.get("CompletenessScore", 0)
        prosody = pa.get("ProsodyScore", 100)
        pronunciation = pa.get("PronScore", 0)
    else:
        accuracy = best.get("AccuracyScore", 0)
        fluency = best.get("FluencyScore", accuracy)
        completeness = best.get("CompletenessScore", 100)
        prosody = best.get("ProsodyScore", 100)
        pronunciation = best.get("PronScore", accuracy)

    phoneme_errors = []
    word_assessments = []

    for word in best.get("Words", []):
        word_phonemes = []
        word_pa = word.get("PronunciationAssessment", {})

        for phoneme in word.get("Phonemes", []):
            if phoneme.get("Phoneme", "") == "":
                continue

            ph_pa = phoneme.get("PronunciationAssessment", {})
            score = ph_pa.get("AccuracyScore", phoneme.get("AccuracyScore", 0))
            n_best_phonemes = ph_pa.get("NBestPhonemes", phoneme.get("NBestPhonemes"))
            best_match = n_best_phonemes[0] if n_best_phonemes else None
            actual = best_match["Phoneme"] if best_match is not None and best_match.get("Phoneme") != phoneme["Phoneme"] else phoneme["Phoneme"]

            word_phonemes.append(
                PhonemeAssessmentSchema(
                    phoneme=phoneme["Phoneme"],
                    score=score,
                    expected=phoneme["Phoneme"],
                    actual=actual if actual != phoneme["Phoneme"] else None,
                )
            )

            if score < 85:
                phoneme_errors.append(
                    {
                        "phoneme": phoneme["Phoneme"],
                        "expected": phoneme["Phoneme"],
                        "actual": actual,
                        "score": score,
                    }
                )

        word_accuracy = word_pa.get("AccuracyScore", word.get("AccuracyScore", 0))
        word_error_type = word_pa.get("ErrorType", "None")

        word_assessments.append(
            WordAssessmentSchema(
                word=word.get("Word", ""),
                accuracyScore=word_accuracy,
                errorType=word_error_type,
                phonemes=word_phonemes,
            )
        )

    return SpeechAssessResponse(
        accuracy=accuracy,
        fluency=fluency,
        completeness=completeness,
        prosody=prosody,
        pronunciation=pronunciation,
        wordAssessments=word_assessments,
        phonemeErrors=phoneme_errors,
        recognizedText=data.get("DisplayText", reference_text),
    )


@router.post("/assess", response_model=SpeechAssessResponse)
@limiter.limit("30/minute")
@handle_api_errors("Speech assessment")
async def assess_pronunciation(
    request: Request,
    text: str,
    language: str,
    audio: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
) -> SpeechAssessResponse:
    if not AZURE_SPEECH_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Speech assessment not configured",
        )

    if language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported language: {language}",
        )

    text = text.strip()
    if not text or len(text) > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text must be between 1 and 500 characters",
        )

    audio_data = await audio.read()
    if len(audio_data) > MAX_AUDIO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio file too large (max 5MB)",
        )

    if len(audio_data) < 44:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid audio data",
        )

    url = f"https://{AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language={language}"

    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_SPEECH_API_KEY,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        "Pronunciation-Assessment": _build_pronunciation_config(text),
    }

    async with httpx.AsyncClient(timeout=AZURE_API_TIMEOUT) as client:
        response = await client.post(url, headers=headers, content=audio_data)

    if response.status_code != 200:
        logger.error(
            "Azure Speech API error",
            extra={
                "status_code": response.status_code,
                "response_body": response.text[:500],
                "user_id": current_user["user_id"],
            },
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Speech assessment service error",
        )

    result = response.json()
    return _parse_azure_response(result, text)
