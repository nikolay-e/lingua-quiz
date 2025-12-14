"""add_idx_progress_user_vocab_index

Revision ID: aaaa6665a37c
Revises: 9cd12c06e418
Create Date: 2025-12-01 10:34:46.273699

"""

from collections.abc import Sequence

from alembic import op  # type: ignore

# revision identifiers, used by Alembic.
revision: str = "aaaa6665a37c"  # pragma: allowlist secret
down_revision: str | Sequence[str] | None = "9cd12c06e418"  # pragma: allowlist secret
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_progress_user_vocab
        ON user_progress(user_id, vocabulary_item_id)
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP INDEX IF EXISTS idx_progress_user_vocab")
