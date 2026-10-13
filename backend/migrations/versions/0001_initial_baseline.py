"""initial_baseline_98_tables

Revision ID: 0001_initial_baseline
Revises: 
Create Date: 2026-10-12 04:00:00

"""
from typing import Sequence, Union

from alembic import op, context
import sqlalchemy as sa
from app.models import Base

# revision identifiers, used by Alembic.
revision: str = '0001_initial_baseline'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Baseline represents the 98 existing tables in PostgreSQL.
    
    On existing databases with the 98 tables already present, this revision
    is marked as applied using:
        alembic stamp head
    
    On fresh/empty databases, it creates the baseline tables.
    """
    if context.is_offline_mode():
        return
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if "institutions" not in existing_tables:
        Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    """Downgrade schema baseline."""
    # Safety: do not drop baseline tables on downgrade
    pass
