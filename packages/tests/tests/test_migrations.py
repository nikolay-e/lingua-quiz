# ruff: noqa: PT012
from datetime import UTC, datetime, timedelta
import uuid

from alembic import command  # type: ignore[attr-defined]
import psycopg2
import pytest

pytestmark = pytest.mark.integration


def test_upgrade_creates_all_tables(migrated_db):
    cursor = migrated_db.cursor()

    cursor.execute(
        """
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
    """
    )

    tables = [row[0] for row in cursor.fetchall()]

    expected_tables = [
        "alembic_version",
        "refresh_tokens",
        "tts_cache",
        "user_progress",
        "users",
    ]

    assert sorted(tables) == sorted(expected_tables)
    cursor.close()


def test_words_db_creates_all_tables(migrated_words_db):
    cursor = migrated_words_db.cursor()

    cursor.execute(
        """
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
    """
    )

    tables = [row[0] for row in cursor.fetchall()]

    expected_tables = [
        "alembic_version",
        "content_changelog",
        "content_versions",
        "vocabulary_items",
    ]

    assert sorted(tables) == sorted(expected_tables)
    cursor.close()


def test_downgrade_removes_all_tables(clean_db, alembic_config, db_connection):
    command.upgrade(alembic_config, "head")
    db_connection.commit()

    command.downgrade(alembic_config, "base")
    db_connection.commit()

    cursor = db_connection.cursor()
    cursor.execute(
        """
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND tablename != 'alembic_version'
    """
    )

    tables = cursor.fetchall()
    assert len(tables) == 0
    cursor.close()


def test_extensions_installed(migrated_db):
    cursor = migrated_db.cursor()

    cursor.execute(
        """
        SELECT extname FROM pg_extension
        WHERE extname IN ('uuid-ossp', 'pg_trgm')
    """
    )

    extensions = [row[0] for row in cursor.fetchall()]
    assert "uuid-ossp" in extensions
    assert "pg_trgm" in extensions
    cursor.close()


def test_content_versions_table_structure(migrated_words_db):
    cursor = migrated_words_db.cursor()

    cursor.execute(
        """
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'content_versions'
        ORDER BY ordinal_position
    """
    )

    columns = cursor.fetchall()
    column_names = [col[0] for col in columns]

    expected_columns = [
        "id",
        "version_name",
        "description",
        "created_at",
        "created_by",
        "is_active",
    ]
    assert column_names == expected_columns

    cursor.execute(
        """
        SELECT i.relname as index_name
        FROM pg_class t, pg_class i, pg_index ix
        WHERE t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND t.relname = 'content_versions'
        AND i.relname LIKE 'idx_%'
    """
    )

    indexes = [row[0] for row in cursor.fetchall()]
    assert "idx_only_one_active" in indexes
    assert "idx_content_versions_active" in indexes

    cursor.close()


def test_users_table_constraints(migrated_db):
    cursor = migrated_db.cursor()

    cursor.execute(
        """
        INSERT INTO users (username, password, is_admin)
        VALUES ('testuser', 'hashedpassword', FALSE)
        RETURNING id
    """
    )
    cursor.fetchone()[0]
    migrated_db.commit()

    with pytest.raises(psycopg2.errors.UniqueViolation):
        cursor.execute(
            """
            INSERT INTO users (username, password, is_admin)
            VALUES ('testuser', 'anotherpassword', FALSE)
        """
        )
        migrated_db.commit()
    migrated_db.rollback()

    with pytest.raises(psycopg2.errors.CheckViolation):
        cursor.execute(
            """
            INSERT INTO users (username, password, is_admin)
            VALUES ('ab', 'password', FALSE)
        """
        )
        migrated_db.commit()
    migrated_db.rollback()

    cursor.close()


def test_vocabulary_items_with_uuid_and_version(migrated_words_db):
    cursor = migrated_words_db.cursor()

    cursor.execute("SELECT id FROM content_versions WHERE is_active = TRUE")
    version_id = cursor.fetchone()[0]

    cursor.execute(
        """
        INSERT INTO vocabulary_items
        (version_id, source_language, target_language, source_text, target_text, list_name)
        VALUES (%s, 'en', 'ru', 'hello', 'привет', 'test-list')
        RETURNING id
    """,
        (version_id,),
    )

    vocab_id = cursor.fetchone()[0]
    try:
        uuid.UUID(str(vocab_id))
    except ValueError:
        pytest.fail(f"vocab_id is not a valid UUID: {vocab_id}")

    cursor.execute(
        """
        SELECT source_text, target_text, is_active
        FROM vocabulary_items
        WHERE id = %s
    """,
        (vocab_id,),
    )

    row = cursor.fetchone()
    assert row[0] == "hello"
    assert row[1] == "привет"
    assert row[2] is True

    migrated_words_db.commit()
    cursor.close()


def test_vocabulary_items_unique_constraint(migrated_words_db):
    cursor = migrated_words_db.cursor()

    cursor.execute("SELECT id FROM content_versions WHERE is_active = TRUE")
    version_id = cursor.fetchone()[0]

    cursor.execute(
        """
        INSERT INTO vocabulary_items
        (version_id, source_language, target_language, source_text, target_text, list_name)
        VALUES (%s, 'en', 'ru', 'world', 'мир', 'test-list')
    """,
        (version_id,),
    )
    migrated_words_db.commit()

    with pytest.raises(psycopg2.errors.UniqueViolation):
        cursor.execute(
            """
            INSERT INTO vocabulary_items
            (version_id, source_language, target_language, source_text, target_text, list_name)
            VALUES (%s, 'en', 'ru', 'world', 'мир', 'test-list')
        """,
            (version_id,),
        )
        migrated_words_db.commit()

    migrated_words_db.rollback()
    cursor.close()


def test_user_progress_table(migrated_db, migrated_words_db):
    main_cursor = migrated_db.cursor()
    words_cursor = migrated_words_db.cursor()

    words_cursor.execute("SELECT id FROM content_versions WHERE is_active = TRUE")
    version_id = words_cursor.fetchone()[0]

    main_cursor.execute(
        """
        INSERT INTO users (username, password, is_admin)
        VALUES ('progressuser', 'hashedpw', FALSE)
        RETURNING id
    """
    )
    user_id = main_cursor.fetchone()[0]

    words_cursor.execute(
        """
        INSERT INTO vocabulary_items
        (version_id, source_language, target_language, source_text, target_text, list_name)
        VALUES (%s, 'en', 'ru', 'test', 'тест', 'test-list')
        RETURNING id
    """,
        (version_id,),
    )
    vocab_id = words_cursor.fetchone()[0]

    main_cursor.execute(
        """
        INSERT INTO user_progress
        (user_id, vocabulary_item_id, level, queue_position, consecutive_correct, correct_count, incorrect_count, recent_history)
        VALUES (%s, %s, 1, 0, 2, 5, 1, ARRAY[TRUE, TRUE, FALSE, TRUE]::BOOLEAN[])
        RETURNING user_id, vocabulary_item_id
    """,
        (user_id, vocab_id),
    )

    progress = main_cursor.fetchone()
    assert progress[0] == user_id
    assert progress[1] == vocab_id

    migrated_db.commit()
    migrated_words_db.commit()
    main_cursor.close()
    words_cursor.close()


def test_user_progress_check_constraints(migrated_db, migrated_words_db):
    main_cursor = migrated_db.cursor()
    words_cursor = migrated_words_db.cursor()

    words_cursor.execute("SELECT id FROM content_versions WHERE is_active = TRUE")
    version_id = words_cursor.fetchone()[0]

    main_cursor.execute(
        """
        INSERT INTO users (username, password, is_admin)
        VALUES ('constraintuser', 'hashedpw', FALSE)
        RETURNING id
    """
    )
    user_id = main_cursor.fetchone()[0]

    words_cursor.execute(
        """
        INSERT INTO vocabulary_items
        (version_id, source_language, target_language, source_text, target_text, list_name)
        VALUES (%s, 'en', 'ru', 'constraint', 'ограничение', 'test-list')
        RETURNING id
    """,
        (version_id,),
    )
    vocab_id = words_cursor.fetchone()[0]
    migrated_words_db.commit()

    with pytest.raises(psycopg2.errors.CheckViolation):
        main_cursor.execute(
            """
            INSERT INTO user_progress
            (user_id, vocabulary_item_id, level, queue_position)
            VALUES (%s, %s, 10, 0)
        """,
            (user_id, vocab_id),
        )
        migrated_db.commit()
    migrated_db.rollback()

    with pytest.raises(psycopg2.errors.CheckViolation):
        main_cursor.execute(
            """
            INSERT INTO user_progress
            (user_id, vocabulary_item_id, level, queue_position)
            VALUES (%s, %s, 1, -5)
        """,
            (user_id, vocab_id),
        )
        migrated_db.commit()
    migrated_db.rollback()

    main_cursor.close()
    words_cursor.close()


def test_refresh_tokens_table(migrated_db):
    cursor = migrated_db.cursor()

    cursor.execute(
        """
        INSERT INTO users (username, password, is_admin)
        VALUES ('tokenuser', 'hashedpw', FALSE)
        RETURNING id
    """
    )
    user_id = cursor.fetchone()[0]

    expires_at = datetime.now(UTC) + timedelta(days=7)

    cursor.execute(
        """
        INSERT INTO refresh_tokens
        (user_id, token_hash, expires_at, device_info)
        VALUES (%s, %s, %s, %s)
        RETURNING id
    """,
        (user_id, "hashed_token_value", expires_at, "Mozilla/5.0"),
    )

    token_id = cursor.fetchone()[0]
    assert token_id is not None

    cursor.execute(
        """
        SELECT user_id, token_hash, device_info
        FROM refresh_tokens
        WHERE id = %s
    """,
        (token_id,),
    )

    row = cursor.fetchone()
    assert row[0] == user_id
    assert row[1] == "hashed_token_value"
    assert row[2] == "Mozilla/5.0"

    migrated_db.commit()
    cursor.close()


def test_refresh_tokens_cascade_delete(migrated_db):
    cursor = migrated_db.cursor()

    cursor.execute(
        """
        INSERT INTO users (username, password, is_admin)
        VALUES ('cascadeuser', 'hashedpw', FALSE)
        RETURNING id
    """
    )
    user_id = cursor.fetchone()[0]

    expires_at = datetime.now(UTC) + timedelta(days=7)

    cursor.execute(
        """
        INSERT INTO refresh_tokens
        (user_id, token_hash, expires_at)
        VALUES (%s, %s, %s)
        RETURNING id
    """,
        (user_id, "token_hash_cascade", expires_at),
    )
    token_id = cursor.fetchone()[0]

    cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
    migrated_db.commit()

    cursor.execute("SELECT id FROM refresh_tokens WHERE id = %s", (token_id,))
    result = cursor.fetchone()
    assert result is None

    cursor.close()


def test_updated_at_trigger(migrated_words_db):
    cursor = migrated_words_db.cursor()

    cursor.execute("SELECT id FROM content_versions WHERE is_active = TRUE")
    version_id = cursor.fetchone()[0]

    cursor.execute(
        """
        INSERT INTO vocabulary_items
        (version_id, source_language, target_language, source_text, target_text, list_name)
        VALUES (%s, 'en', 'ru', 'trigger', 'триггер', 'test-list')
        RETURNING id, updated_at
    """,
        (version_id,),
    )

    vocab_id, initial_updated_at = cursor.fetchone()
    migrated_words_db.commit()

    cursor.execute(
        """
        UPDATE vocabulary_items
        SET target_text = 'триггер обновлен'
        WHERE id = %s
        RETURNING updated_at
    """,
        (vocab_id,),
    )

    new_updated_at = cursor.fetchone()[0]
    migrated_words_db.commit()

    assert new_updated_at > initial_updated_at

    cursor.close()


def test_get_active_version_id_function(migrated_words_db):
    cursor = migrated_words_db.cursor()

    cursor.execute("SELECT get_active_version_id()")
    version_id = cursor.fetchone()[0]

    assert version_id is not None

    cursor.execute("SELECT id FROM content_versions WHERE is_active = TRUE")
    expected_version_id = cursor.fetchone()[0]

    assert version_id == expected_version_id

    cursor.close()


def test_tts_cache_table(migrated_db):
    cursor = migrated_db.cursor()

    audio_data = b"fake_audio_bytes"
    cache_key = "en_hello_voice1"

    cursor.execute(
        """
        INSERT INTO tts_cache
        (cache_key, audio_data, text, language, voice_config, access_count)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING cache_key
    """,
        (cache_key, audio_data, "hello", "en", '{"voice": "voice1"}', 5),
    )

    result = cursor.fetchone()[0]
    assert result == cache_key

    cursor.execute(
        "SELECT audio_data, text, access_count FROM tts_cache WHERE cache_key = %s",
        (cache_key,),
    )

    row = cursor.fetchone()
    assert bytes(row[0]) == audio_data
    assert row[1] == "hello"
    assert row[2] == 5

    migrated_db.commit()
    cursor.close()


def test_content_changelog_table(migrated_words_db):
    cursor = migrated_words_db.cursor()

    cursor.execute("SELECT id FROM content_versions WHERE is_active = TRUE")
    version_id = cursor.fetchone()[0]

    cursor.execute(
        """
        INSERT INTO vocabulary_items
        (version_id, source_language, target_language, source_text, target_text, list_name)
        VALUES (%s, 'en', 'ru', 'changelog', 'журнал', 'test-list')
        RETURNING id
    """,
        (version_id,),
    )
    vocab_id = cursor.fetchone()[0]

    cursor.execute(
        """
        INSERT INTO content_changelog
        (version_id, change_type, vocabulary_item_id, old_values, new_values, changed_by)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
    """,
        (
            version_id,
            "UPDATE",
            vocab_id,
            '{"target_text": "журнал"}',
            '{"target_text": "журнал изменений"}',
            "admin",
        ),
    )

    changelog_id = cursor.fetchone()[0]
    assert changelog_id is not None

    cursor.execute(
        """
        SELECT change_type, changed_by
        FROM content_changelog
        WHERE id = %s
    """,
        (changelog_id,),
    )

    row = cursor.fetchone()
    assert row[0] == "UPDATE"
    assert row[1] == "admin"

    migrated_words_db.commit()
    cursor.close()


def test_vocabulary_items_indexes_exist(migrated_words_db):
    cursor = migrated_words_db.cursor()

    cursor.execute(
        """
        SELECT i.relname as index_name
        FROM pg_class t, pg_class i, pg_index ix
        WHERE t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND t.relname = 'vocabulary_items'
        AND i.relname LIKE 'idx_vocab_%'
    """
    )

    indexes = {row[0] for row in cursor.fetchall()}

    expected_indexes = {
        "idx_vocab_list",
        "idx_vocab_languages",
        "idx_vocab_active",
        "idx_vocab_version",
        "idx_vocab_version_fk",
        "idx_vocab_fts_source",
        "idx_vocab_fts_target",
        "idx_vocab_trigram_source",
        "idx_vocab_trigram_target",
    }

    assert expected_indexes.issubset(indexes)

    cursor.close()


def test_user_progress_indexes_exist(migrated_db):
    cursor = migrated_db.cursor()

    cursor.execute(
        """
        SELECT i.relname as index_name
        FROM pg_class t, pg_class i, pg_index ix
        WHERE t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND t.relname = 'user_progress'
        AND i.relname LIKE 'idx_progress_%'
    """
    )

    indexes = {row[0] for row in cursor.fetchall()}

    expected_indexes = {
        "idx_progress_user_level",
        "idx_progress_user_queue",
        "idx_progress_last_practiced",
    }

    assert expected_indexes.issubset(indexes)

    cursor.close()


def test_refresh_tokens_indexes_exist(migrated_db):
    cursor = migrated_db.cursor()

    cursor.execute(
        """
        SELECT i.relname as index_name
        FROM pg_class t, pg_class i, pg_index ix
        WHERE t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND t.relname = 'refresh_tokens'
        AND i.relname LIKE 'idx_refresh_tokens_%'
    """
    )

    indexes = {row[0] for row in cursor.fetchall()}

    expected_indexes = {
        "idx_refresh_tokens_user",
        "idx_refresh_tokens_hash",
        "idx_refresh_tokens_expires",
    }

    assert expected_indexes.issubset(indexes)

    cursor.close()
