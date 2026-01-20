"""fill difficulty_level from list_name

Revision ID: 002_fill_difficulty_levels
Revises: 001_initial_words
Create Date: 2025-12-24 00:00:00.000000

"""

from collections.abc import Sequence

from alembic import op  # type: ignore[attr-defined]

revision: str = "002_fill_difficulty_levels"
down_revision: str | Sequence[str] | None = "001_initial_words"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE vocabulary_items
        SET difficulty_level = LOWER(
            (regexp_match(list_name, '\\m(a0|a1|a2|b1|b2|c1|c2|d)\\M', 'i'))[1]
        )
        WHERE difficulty_level IS NULL
        AND list_name ~* '\\m(a0|a1|a2|b1|b2|c1|c2|d)\\M'
    """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE vocabulary_items
        SET difficulty_level = NULL
        WHERE difficulty_level IN ('a0', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'd')
    """
    )
