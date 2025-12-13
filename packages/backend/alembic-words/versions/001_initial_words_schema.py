"""initial words schema

Revision ID: 001_initial_words
Revises:
Create Date: 2025-12-13 12:00:00.000000

"""

from collections.abc import Sequence

from alembic import op  # type: ignore[attr-defined]

revision: str = "001_initial_words"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "pg_trgm"')

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS content_versions (
            id SERIAL PRIMARY KEY,
            version_name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_by TEXT,
            is_active BOOLEAN NOT NULL DEFAULT FALSE
        )
    """
    )
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_only_one_active ON content_versions ((true)) WHERE is_active")
    op.execute("CREATE INDEX IF NOT EXISTS idx_content_versions_active ON content_versions (is_active) WHERE is_active")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS vocabulary_items (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            version_id INTEGER NOT NULL REFERENCES content_versions(id) ON DELETE CASCADE,
            source_language VARCHAR(10) NOT NULL,
            target_language VARCHAR(10) NOT NULL,
            source_text TEXT NOT NULL,
            target_text TEXT NOT NULL,
            list_name TEXT NOT NULL,
            difficulty_level VARCHAR(5),
            source_usage_example TEXT,
            target_usage_example TEXT,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT unique_translation_per_version
                UNIQUE (version_id, source_text, source_language, target_language)
        )
    """
    )

    op.execute("CREATE INDEX IF NOT EXISTS idx_vocab_list ON vocabulary_items(list_name, version_id) WHERE is_active")
    op.execute("CREATE INDEX IF NOT EXISTS idx_vocab_languages ON vocabulary_items(source_language, target_language, version_id) WHERE is_active")
    op.execute("CREATE INDEX IF NOT EXISTS idx_vocab_active ON vocabulary_items(is_active)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_vocab_version ON vocabulary_items(version_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_vocab_version_fk ON vocabulary_items(version_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_vocab_fts_source ON vocabulary_items USING GIN(to_tsvector('simple', source_text))")
    op.execute("CREATE INDEX IF NOT EXISTS idx_vocab_fts_target ON vocabulary_items USING GIN(to_tsvector('simple', target_text))")
    op.execute("CREATE INDEX IF NOT EXISTS idx_vocab_trigram_source ON vocabulary_items USING GIN(source_text gin_trgm_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_vocab_trigram_target ON vocabulary_items USING GIN(target_text gin_trgm_ops)")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS content_changelog (
            id BIGSERIAL PRIMARY KEY,
            version_id INTEGER REFERENCES content_versions(id),
            change_type TEXT NOT NULL CHECK (change_type IN ('ADD', 'UPDATE', 'DELETE')),
            vocabulary_item_id UUID REFERENCES vocabulary_items(id),
            old_values JSONB,
            new_values JSONB,
            changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            changed_by TEXT
        )
    """
    )

    op.execute("CREATE INDEX IF NOT EXISTS idx_changelog_version ON content_changelog(version_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_changelog_item ON content_changelog(vocabulary_item_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_changelog_timestamp ON content_changelog(changed_at DESC)")

    op.execute(
        """
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
    """
    )

    op.execute(
        """
        DROP TRIGGER IF EXISTS update_vocabulary_items_updated_at ON vocabulary_items
    """
    )

    op.execute(
        """
        CREATE TRIGGER update_vocabulary_items_updated_at
            BEFORE UPDATE ON vocabulary_items
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
    """
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION get_active_version_id()
        RETURNS INTEGER AS $$
        BEGIN
            RETURN (SELECT id FROM content_versions WHERE is_active = TRUE LIMIT 1);
        END;
        $$ LANGUAGE plpgsql
    """
    )

    op.execute(
        """
        INSERT INTO content_versions (version_name, description, is_active)
        VALUES ('v1_initial', 'Initial vocabulary content', TRUE)
        ON CONFLICT (version_name) DO NOTHING
    """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS content_changelog CASCADE")
    op.execute("DROP TABLE IF EXISTS vocabulary_items CASCADE")
    op.execute("DROP TABLE IF EXISTS content_versions CASCADE")
    op.execute("DROP FUNCTION IF EXISTS get_active_version_id() CASCADE")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE")
    op.execute('DROP EXTENSION IF EXISTS "pg_trgm"')
    op.execute('DROP EXTENSION IF EXISTS "uuid-ossp"')
