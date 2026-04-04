"""add rank column for frequency-based ordering

Revision ID: 003_add_rank
Revises: 002_fill_difficulty_levels
Create Date: 2026-04-04 00:00:00.000000

"""

from collections.abc import Sequence

from alembic import op  # type: ignore[attr-defined]

revision: str = "003_add_rank"
down_revision: str | Sequence[str] | None = "002_fill_difficulty_levels"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE vocabulary_items
        ADD COLUMN IF NOT EXISTS rank INTEGER NOT NULL DEFAULT 0
    """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_vocab_rank ON vocabulary_items(list_name, rank) WHERE is_active")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_vocab_rank")
    op.execute("ALTER TABLE vocabulary_items DROP COLUMN IF EXISTS rank")
