"""remove_vocabulary_fk_and_table

Revision ID: 755d17920f61
Revises: aaaa6665a37c
Create Date: 2025-12-14 00:16:37.716073

"""

from collections.abc import Sequence

from alembic import op  # type: ignore[attr-defined]

# revision identifiers, used by Alembic.
revision: str = "755d17920f61"  # pragma: allowlist secret
down_revision: str | Sequence[str] | None = "aaaa6665a37c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Remove vocabulary_items FK constraint and table from main DB.

    vocabulary_items now lives exclusively in the shared words database.
    Application-level validation ensures referential integrity.
    """
    op.drop_constraint("user_progress_vocabulary_item_id_fkey", "user_progress", type_="foreignkey")
    op.drop_table("content_changelog")
    op.drop_table("vocabulary_items")
    op.drop_table("content_versions")


def downgrade() -> None:
    """Downgrade is not supported for this migration.

    This migration represents a one-way architectural change (moving vocabulary
    tables to a separate words database). Downgrading would require:
    1. Migrating data back from words DB to main DB
    2. Recreating FK constraints with existing user_progress data

    This is not implemented as it's an irreversible architectural decision.
    If you need to rollback, restore from backup.
    """
