import base64
import hashlib
import logging
import os

from google.cloud import texttospeech
from google.oauth2 import service_account
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)


class TTSService:
    def __init__(self, db_pool):
        self.client = None
        self.db_pool = db_pool
        self.voice_configs = {
            "en": {"language_code": "en-US", "name": "en-US-Standard-A"},
            "de": {"language_code": "de-DE", "name": "de-DE-Standard-A"},
            "ru": {"language_code": "ru-RU", "name": "ru-RU-Standard-A"},
            "es": {"language_code": "es-ES", "name": "es-ES-Standard-A"},
        }
        self._initialize_client()
        self._ensure_table_exists()

    def _initialize_client(self):
        try:
            credentials_b64 = os.getenv("GOOGLE_CLOUD_CREDENTIALS_B64")
            if credentials_b64:
                import json

                credentials_json = base64.b64decode(credentials_b64).decode("utf-8")
                credentials_info = json.loads(credentials_json)
                credentials = service_account.Credentials.from_service_account_info(credentials_info)
                self.client = texttospeech.TextToSpeechClient(credentials=credentials)
                logger.info("TTS client initialized with service account credentials")
            else:
                self.client = texttospeech.TextToSpeechClient()
                logger.info("TTS client initialized with default credentials")
        except Exception as e:
            logger.error(f"Failed to initialize TTS client: {e}")
            self.client = None

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
        return self.client is not None

    def _get_content_key(self, text: str, language: str) -> str:
        return hashlib.md5(f"{text}_{language}".encode()).hexdigest()

    def _get_from_storage(self, text: str, language: str) -> bytes | None:
        conn = None
        try:
            content_key = self._get_content_key(text, language)
            conn = self.db_pool.getconn()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT audio_data FROM tts_storage WHERE content_key = %s",
                    (content_key,),
                )
                result = cur.fetchone()
                if result:
                    return bytes(result["audio_data"])
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
        return False

    def synthesize_speech(self, text: str, language: str) -> bytes | None:
        if not self.is_available() or not text.strip():
            return None

        text = text.strip()
        if len(text) > 500:
            return None

        audio_content = self._get_from_storage(text, language)
        if audio_content:
            return audio_content

        voice_config = self.voice_configs.get(language)
        if not voice_config:
            logger.error(f"Language '{language}' not supported for TTS")
            return None

        try:
            response = self.client.synthesize_speech(
                input=texttospeech.SynthesisInput(text=text),
                voice=texttospeech.VoiceSelectionParams(
                    language_code=voice_config["language_code"],
                    name=voice_config["name"],
                ),
                audio_config=texttospeech.AudioConfig(
                    audio_encoding=texttospeech.AudioEncoding.MP3,
                    speaking_rate=0.9,
                    effects_profile_id=["telephony-class-application"],
                ),
            )

            audio_content = response.audio_content
            self._save_to_storage(text, language, audio_content)
            return audio_content

        except Exception as e:
            logger.error(f"TTS synthesis failed for '{text}' in {language}: {e}")
            return None

    def get_supported_languages(self) -> list:
        return list(self.voice_configs.keys())
