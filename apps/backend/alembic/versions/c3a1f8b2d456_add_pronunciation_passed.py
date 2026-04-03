"""add_pronunciation_passed

Revision ID: c3a1f8b2d456
Revises: 9cd12c06e418
Create Date: 2026-04-03 12:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3a1f8b2d456"  # pragma: allowlist secret
down_revision: str | Sequence[str] | None = "755d17920f61"  # pragma: allowlist secret
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE user_progress ADD COLUMN pronunciation_passed BOOLEAN NOT NULL DEFAULT FALSE")


def downgrade() -> None:
    op.execute("ALTER TABLE user_progress DROP COLUMN IF EXISTS pronunciation_passed")
