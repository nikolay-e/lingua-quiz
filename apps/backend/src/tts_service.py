import hashlib
import time
from typing import ClassVar

from core.config import AZURE_SPEECH_API_KEY, AZURE_SPEECH_REGION
from core.logging import get_logger
import httpx
from psycopg2.extras import RealDictCursor

logger = get_logger(__name__)


class TTSError(Exception):
    pass


class TTSUnavailableError(TTSError):
    pass


class TTSLanguageNotSupportedError(TTSError):
    pass


class TTSAPIError(TTSError):
    pass


class TTSService:
    LANGUAGE_NAME_TO_CODE: ClassVar[dict[str, str]] = {
        "english": "en",
        "german": "de",
        "russian": "ru",
        "spanish": "es",
    }

    VOICE_CONFIGS: ClassVar[dict[str, dict[str, str]]] = {
        "en": {"locale": "en-US", "voice": "en-US-AvaMultilingualNeural"},
        "de": {"locale": "de-DE", "voice": "de-DE-FlorianMultilingualNeural"},
        "ru": {"locale": "ru-RU", "voice": "ru-RU-DmitryNeural"},
        "es": {"locale": "es-ES", "voice": "es-ES-AlvaroNeural"},
    }

    def __init__(self, db_pool):
        self.db_pool = db_pool
        self.api_key = AZURE_SPEECH_API_KEY
        self.region = AZURE_SPEECH_REGION
        self.endpoint = f"https://{self.region}.tts.speech.microsoft.com/cognitiveservices/v1"
        self._ensure_table_exists()

        if self.api_key:
            logger.info("Azure TTS service initialized", extra={"region": self.region})
        else:
            logger.warning("Azure TTS API key not configured")

    def _ensure_table_exists(self):
        if self.db_pool is None:
            return
        conn = None
        try:
            conn = self.db_pool.getconn()
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS tts_storage (
                        content_key TEXT PRIMARY KEY,
                        audio_data BYTEA NOT NULL,
                        text TEXT NOT NULL,
                        language VARCHAR(10) NOT NULL,
                        voice_config JSONB,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                cur.execute("CREATE INDEX IF NOT EXISTS idx_tts_created ON tts_storage(created_at)")
                conn.commit()
                logger.info("TTS storage table ensured")
        except Exception as e:
            logger.error(f"Failed to ensure TTS table exists: {e}")
            if conn:
                try:
                    conn.rollback()
                except Exception:
                    pass
        finally:
            if conn:
                self.db_pool.putconn(conn)

    def is_available(self) -> bool:
        return bool(self.api_key)

    def _normalize_language(self, language: str) -> str:
        lang_lower = language.lower()
        if lang_lower in self.LANGUAGE_NAME_TO_CODE:
            return self.LANGUAGE_NAME_TO_CODE[lang_lower]
        return lang_lower

    def _get_content_key(self, text: str, language: str) -> str:
        return hashlib.md5(f"{text}_{language}_azure".encode(), usedforsecurity=False).hexdigest()

    def _get_from_storage(self, text: str, language: str) -> bytes | None:
        conn = None
        start_time = time.perf_counter()
        try:
            content_key = self._get_content_key(text, language)
            conn = self.db_pool.getconn()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT audio_data FROM tts_storage WHERE content_key = %s",
                    (content_key,),
                )
                result = cur.fetchone()
                duration_ms = (time.perf_counter() - start_time) * 1000
                if result:
                    logger.debug(
                        "TTS cache hit",
                        extra={
                            "language": language,
                            "text_length": len(text),
                            "duration_ms": round(duration_ms, 2),
                        },
                    )
                    return bytes(result["audio_data"])
                logger.debug(
                    "TTS cache miss",
                    extra={"language": language, "text_length": len(text)},
                )
        except Exception as e:
            logger.error(f"TTS storage read error: {e}")
        finally:
            if conn:
                self.db_pool.putconn(conn)
        return None

    def _save_to_storage(self, text: str, language: str, audio_content: bytes) -> bool:
        conn = None
        try:
            content_key = self._get_content_key(text, language)
            conn = self.db_pool.getconn()
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO tts_storage (content_key, text, language, audio_data)
                       VALUES (%s, %s, %s, %s)
                       ON CONFLICT (content_key) DO NOTHING""",
                    (content_key, text, language, audio_content),
                )
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"TTS storage save error: {e}")
            if conn:
                try:
                    conn.rollback()
                except Exception:
                    pass
            return False
        finally:
            if conn:
                self.db_pool.putconn(conn)

    def _build_ssml(self, text: str, voice_config: dict[str, str]) -> str:
        escaped_text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
        return f"""<speak version='1.0' xml:lang='{voice_config["locale"]}'>
            <voice name='{voice_config["voice"]}'>
                <prosody rate='-10%'>{escaped_text}</prosody>
            </voice>
        </speak>"""

    def synthesize_speech(self, text: str, language: str) -> bytes | None:
        if not self.is_available() or not text.strip():
            logger.warning("TTS synthesis skipped: service unavailable or empty text")
            return None

        text = text.strip()
        language = self._normalize_language(language)
        if len(text) > 500:
            logger.warning("TTS synthesis skipped: text too long", extra={"text_length": len(text)})
            return None

        audio_content = self._get_from_storage(text, language)
        if audio_content:
            return audio_content

        voice_config = self.VOICE_CONFIGS.get(language)
        if not voice_config:
            logger.warning(
                "TTS language not supported",
                extra={"language": language, "supported": list(self.VOICE_CONFIGS.keys())},
            )
            return None

        start_time = time.perf_counter()
        try:
            ssml = self._build_ssml(text, voice_config)
            headers = {
                "Ocp-Apim-Subscription-Key": self.api_key,
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
            }

            with httpx.Client(timeout=10.0) as client:
                response = client.post(self.endpoint, content=ssml, headers=headers)
                response.raise_for_status()
                new_audio: bytes = bytes(response.content)

            duration_ms = (time.perf_counter() - start_time) * 1000

            self._save_to_storage(text, language, new_audio)

            logger.info(
                "TTS synthesis success",
                extra={
                    "language": language,
                    "text_length": len(text),
                    "audio_size_bytes": len(new_audio),
                    "duration_ms": round(duration_ms, 2),
                },
            )
            return new_audio

        except httpx.HTTPStatusError as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.error(
                "TTS synthesis failed",
                extra={
                    "language": language,
                    "text_length": len(text),
                    "error_type": "HTTPStatusError",
                    "status_code": e.response.status_code,
                    "error": str(e),
                    "duration_ms": round(duration_ms, 2),
                },
            )
            return None
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            error_type = type(e).__name__
            logger.error(
                "TTS synthesis failed",
                extra={
                    "language": language,
                    "text_length": len(text),
                    "error_type": error_type,
                    "error": str(e),
                    "duration_ms": round(duration_ms, 2),
                },
            )
            return None

    def get_supported_languages(self) -> list:
        codes = list(self.VOICE_CONFIGS.keys())
        names = [name.capitalize() for name in self.LANGUAGE_NAME_TO_CODE]
        return codes + names
