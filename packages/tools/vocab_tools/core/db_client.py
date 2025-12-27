import os
from dataclasses import dataclass

import psycopg2
from psycopg2.extras import RealDictCursor

from vocab_tools.core.keychain import KeychainError, get_words_db_credentials


@dataclass
class VocabularyEntry:
    id: str
    source_text: str
    target_text: str
    source_language: str
    target_language: str
    list_name: str
    source_usage_example: str = ""
    target_usage_example: str = ""
    difficulty_level: str | None = None
    is_active: bool = True


class MissingCredentialsError(Exception):
    pass


def get_db_connection():
    if os.environ.get("WORDS_DB_HOST"):
        host = os.environ.get("WORDS_DB_HOST")
        port = int(os.environ.get("WORDS_DB_PORT", "5432"))
        dbname = os.environ.get("WORDS_DB_NAME", "linguaquiz_words")
        user = os.environ.get("WORDS_DB_USER", "postgres")
        password = os.environ.get("WORDS_DB_PASSWORD", "postgres")
    else:
        try:
            creds = get_words_db_credentials()
            host = creds.host
            port = creds.port
            dbname = creds.name
            user = creds.user
            password = creds.password
        except KeychainError as e:
            raise MissingCredentialsError(str(e)) from e

    return psycopg2.connect(
        host=host,
        port=port,
        dbname=dbname,
        user=user,
        password=password,
    )


class DirectDatabaseClient:
    def __init__(self):
        self.conn = get_db_connection()
        self._version_id = self._get_active_version_id()

    def _get_active_version_id(self) -> int:
        with self.conn.cursor() as cur:
            cur.execute("SELECT id FROM content_versions WHERE is_active = TRUE LIMIT 1")
            row = cur.fetchone()
            if not row:
                raise RuntimeError("No active content version found")
            return row[0]

    def get_all_list_names(self) -> list[str]:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT list_name FROM vocabulary_items
                WHERE version_id = %s AND is_active = TRUE
                ORDER BY list_name
                """,
                (self._version_id,),
            )
            return [row[0] for row in cur.fetchall()]

    def fetch_vocabulary(self, list_name: str) -> list[VocabularyEntry]:
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, source_text, target_text, source_language, target_language,
                       list_name, source_usage_example, target_usage_example,
                       difficulty_level, is_active
                FROM vocabulary_items
                WHERE version_id = %s AND list_name = %s
                ORDER BY source_text
                """,
                (self._version_id, list_name),
            )
            return [
                VocabularyEntry(
                    id=str(row["id"]),
                    source_text=row["source_text"],
                    target_text=row["target_text"],
                    source_language=row["source_language"],
                    target_language=row["target_language"],
                    list_name=row["list_name"],
                    source_usage_example=row["source_usage_example"] or "",
                    target_usage_example=row["target_usage_example"] or "",
                    difficulty_level=row["difficulty_level"],
                    is_active=row["is_active"],
                )
                for row in cur.fetchall()
            ]

    def update_vocabulary_item(
        self,
        item_id: str,
        source_text: str | None = None,
        target_text: str | None = None,
        source_usage_example: str | None = None,
        target_usage_example: str | None = None,
        difficulty_level: str | None = None,
        is_active: bool | None = None,
    ) -> bool:
        updates = []
        params = []

        if source_text is not None:
            updates.append("source_text = %s")
            params.append(source_text)
        if target_text is not None:
            updates.append("target_text = %s")
            params.append(target_text)
        if source_usage_example is not None:
            updates.append("source_usage_example = %s")
            params.append(source_usage_example)
        if target_usage_example is not None:
            updates.append("target_usage_example = %s")
            params.append(target_usage_example)
        if difficulty_level is not None:
            updates.append("difficulty_level = %s")
            params.append(difficulty_level)
        if is_active is not None:
            updates.append("is_active = %s")
            params.append(is_active)

        if not updates:
            return False

        params.append(item_id)
        query = f"UPDATE vocabulary_items SET {', '.join(updates)} WHERE id = %s"  # nosec B608

        with self.conn.cursor() as cur:
            cur.execute(query, params)
            self.conn.commit()
            return cur.rowcount > 0

    def delete_vocabulary_item(self, item_id: str) -> bool:
        with self.conn.cursor() as cur:
            cur.execute("UPDATE vocabulary_items SET is_active = FALSE WHERE id = %s", (item_id,))
            self.conn.commit()
            return cur.rowcount > 0

    def create_vocabulary_item(
        self,
        source_text: str,
        target_text: str,
        list_name: str,
        source_language: str = "en",
        target_language: str = "ru",
        difficulty_level: str | None = None,
        source_usage_example: str = "",
        target_usage_example: str = "",
    ) -> str:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO vocabulary_items
                    (version_id, source_text, target_text, source_language, target_language,
                     list_name, difficulty_level, source_usage_example, target_usage_example)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    self._version_id,
                    source_text,
                    target_text,
                    source_language,
                    target_language,
                    list_name,
                    difficulty_level,
                    source_usage_example,
                    target_usage_example,
                ),
            )
            self.conn.commit()
            return str(cur.fetchone()[0])

    def close(self):
        if self.conn:
            self.conn.close()
