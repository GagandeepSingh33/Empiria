"""mentor_meetings_and_invariants

Revision ID: 0004_mentor_meetings_inv
Revises: 0003_licences_and_events
Create Date: 2026-10-12 19:55:00

"""
from typing import Sequence, Union

from alembic import op, context
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0004_mentor_meetings_inv'
down_revision: Union[str, Sequence[str], None] = '0003_licences_and_events'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind) if not context.is_offline_mode() else None
    existing_tables = set(inspector.get_table_names()) if inspector else set()

    # 1. mentor_meetings table
    if "mentor_meetings" not in existing_tables:
        op.create_table(
            'mentor_meetings',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('institution_id', sa.String(36), sa.ForeignKey('institutions.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('student_id', sa.String(36), sa.ForeignKey('student_profiles.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('mentor_membership_id', sa.String(36), sa.ForeignKey('institution_memberships.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('assignment_id', sa.String(36), sa.ForeignKey('mentor_assignments.id', ondelete='SET NULL'), nullable=True),
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('meeting_type', sa.String(50), nullable=False, server_default='advisory'),
            sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=False, index=True),
            sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='30'),
            sa.Column('location_or_url', sa.String(255), nullable=True),
            sa.Column('status', sa.String(50), nullable=False, server_default='scheduled'),
            sa.Column('agenda', sa.Text(), nullable=True),
            sa.Column('outcome_notes', sa.Text(), nullable=True),
            sa.Column('follow_up_actions', sa.Text(), nullable=True),
            sa.Column('follow_up_due_date', sa.Date(), nullable=True),
            sa.Column('cancellation_reason', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        )

    # 2. Invariant partial unique indexes on mentor_assignments
    if inspector:
        existing_indexes = {idx['name'] for idx in inspector.get_indexes('mentor_assignments')}
    else:
        existing_indexes = set()

    if 'idx_mentor_assignment_single_active_primary' not in existing_indexes:
        op.execute(
            """
            CREATE UNIQUE INDEX idx_mentor_assignment_single_active_primary
            ON mentor_assignments (institution_id, student_id)
            WHERE assignment_type = 'primary' AND status = 'active';
            """
        )

    if 'idx_mentor_assignment_single_active_subject' not in existing_indexes:
        op.execute(
            """
            CREATE UNIQUE INDEX idx_mentor_assignment_single_active_subject
            ON mentor_assignments (institution_id, student_id, subject_scope)
            WHERE assignment_type = 'subject' AND status = 'active' AND subject_scope IS NOT NULL;
            """
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind) if not context.is_offline_mode() else None

    if inspector:
        existing_indexes = {idx['name'] for idx in inspector.get_indexes('mentor_assignments')}
        existing_tables = set(inspector.get_table_names())
    else:
        existing_indexes = {'idx_mentor_assignment_single_active_primary', 'idx_mentor_assignment_single_active_subject'}
        existing_tables = {'mentor_meetings'}

    if 'idx_mentor_assignment_single_active_subject' in existing_indexes:
        op.execute("DROP INDEX IF EXISTS idx_mentor_assignment_single_active_subject;")

    if 'idx_mentor_assignment_single_active_primary' in existing_indexes:
        op.execute("DROP INDEX IF EXISTS idx_mentor_assignment_single_active_primary;")

    if 'mentor_meetings' in existing_tables:
        op.drop_table('mentor_meetings')
