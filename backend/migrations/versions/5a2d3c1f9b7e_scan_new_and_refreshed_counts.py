"""Track new and refreshed app counts for every scan.

Revision ID: 5a2d3c1f9b7e
Revises: c8e46ae8ab4a
Create Date: 2026-10-16
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "5a2d3c1f9b7e"
down_revision: Union[str, Sequence[str], None] = "c8e46ae8ab4a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("scan_runs", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("apps_new_count", sa.Integer(), nullable=False, server_default="0")
        )
        batch_op.add_column(
            sa.Column("apps_refreshed_count", sa.Integer(), nullable=False, server_default="0")
        )


def downgrade() -> None:
    with op.batch_alter_table("scan_runs", schema=None) as batch_op:
        batch_op.drop_column("apps_refreshed_count")
        batch_op.drop_column("apps_new_count")
