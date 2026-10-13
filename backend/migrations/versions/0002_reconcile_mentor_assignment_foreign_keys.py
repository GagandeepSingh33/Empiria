"""reconcile_mentor_assignment_foreign_keys

Revision ID: 0002_reconcile_mentor_fks
Revises: 0001_initial_baseline
Create Date: 2026-10-12 04:05:00

"""
from typing import Sequence, Union

from alembic import op, context
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002_reconcile_mentor_fks'
down_revision: Union[str, Sequence[str], None] = '0001_initial_baseline'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add explicit foreign keys for mentor_assignments matching SQLAlchemy models.
    Idempotent: skips if foreign key constraint on the column already exists.
    """
    if context.is_offline_mode():
        op.create_foreign_key(
            'fk_mentor_assignments_institution_id',
            'mentor_assignments',
            'institutions',
            ['institution_id'],
            ['id'],
            ondelete='CASCADE',
        )
        op.create_foreign_key(
            'fk_mentor_assignments_assigned_by_membership_id',
            'mentor_assignments',
            'institution_memberships',
            ['assigned_by_membership_id'],
            ['id'],
            ondelete='CASCADE',
        )
        return

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_fk_cols = {
        tuple(fk['constrained_columns']) 
        for fk in inspector.get_foreign_keys('mentor_assignments')
    }

    if ('institution_id',) not in existing_fk_cols:
        op.create_foreign_key(
            'fk_mentor_assignments_institution_id',
            'mentor_assignments',
            'institutions',
            ['institution_id'],
            ['id'],
            ondelete='CASCADE',
        )

    if ('assigned_by_membership_id',) not in existing_fk_cols:
        op.create_foreign_key(
            'fk_mentor_assignments_assigned_by_membership_id',
            'mentor_assignments',
            'institution_memberships',
            ['assigned_by_membership_id'],
            ['id'],
            ondelete='CASCADE',
        )


def downgrade() -> None:
    """Drop foreign keys if created by this migration."""
    if context.is_offline_mode():
        op.drop_constraint(
            'fk_mentor_assignments_assigned_by_membership_id',
            'mentor_assignments',
            type_='foreignkey',
        )
        op.drop_constraint(
            'fk_mentor_assignments_institution_id',
            'mentor_assignments',
            type_='foreignkey',
        )
        return

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_fk_names = {
        fk['name'] 
        for fk in inspector.get_foreign_keys('mentor_assignments')
    }

    if 'fk_mentor_assignments_assigned_by_membership_id' in existing_fk_names:
        op.drop_constraint(
            'fk_mentor_assignments_assigned_by_membership_id',
            'mentor_assignments',
            type_='foreignkey',
        )

    if 'fk_mentor_assignments_institution_id' in existing_fk_names:
        op.drop_constraint(
            'fk_mentor_assignments_institution_id',
            'mentor_assignments',
            type_='foreignkey',
        )
