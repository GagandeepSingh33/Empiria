"""add_licences_and_events

Revision ID: 0003_licences_and_events
Revises: 0002_reconcile_mentor_fks
Create Date: 2026-10-12 11:15:00

"""
from typing import Sequence, Union

from alembic import op, context
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003_licences_and_events'
down_revision: Union[str, Sequence[str], None] = '0002_reconcile_mentor_fks'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind) if not context.is_offline_mode() else None
    existing_tables = set(inspector.get_table_names()) if inspector else set()

    # 1. institution_licences
    if "institution_licences" not in existing_tables:
        op.create_table(
            'institution_licences',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('institution_id', sa.String(36), sa.ForeignKey('institutions.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('plan_tier', sa.String(50), nullable=False, server_default='standard'),
            sa.Column('status', sa.String(50), nullable=False, server_default='active'),
            sa.Column('max_students', sa.Integer(), nullable=False, server_default='500'),
            sa.Column('max_mentors', sa.Integer(), nullable=False, server_default='50'),
            sa.Column('permitted_features', sa.JSON(), nullable=False),
            sa.Column('starts_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        )

    # 2. licence_events
    if "licence_events" not in existing_tables:
        op.create_table(
            'licence_events',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('licence_id', sa.String(36), sa.ForeignKey('institution_licences.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('institution_id', sa.String(36), sa.ForeignKey('institutions.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('actor_account_id', sa.String(36), nullable=True),
            sa.Column('event_type', sa.String(50), nullable=False),
            sa.Column('before_state', sa.JSON(), nullable=True),
            sa.Column('after_state', sa.JSON(), nullable=True),
            sa.Column('reason', sa.Text(), nullable=True),
            sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False, index=True),
        )

    # 3. institution_status_history
    if "institution_status_history" not in existing_tables:
        op.create_table(
            'institution_status_history',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('institution_id', sa.String(36), sa.ForeignKey('institutions.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('previous_status', sa.String(50), nullable=False),
            sa.Column('new_status', sa.String(50), nullable=False),
            sa.Column('reason', sa.Text(), nullable=True),
            sa.Column('changed_by_account_id', sa.String(36), nullable=True),
            sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False, index=True),
        )

    # 4. platform_settings
    if "platform_settings" not in existing_tables:
        op.create_table(
            'platform_settings',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('key', sa.String(100), unique=True, nullable=False, index=True),
            sa.Column('value', sa.JSON(), nullable=False),
            sa.Column('updated_by_account_id', sa.String(36), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        )

    # 5. Populate initial baseline licences for existing institutions if they have none
    if not context.is_offline_mode():
        conn = op.get_bind()
        import json
        import uuid
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        expires = now + timedelta(days=365)
        default_features = json.dumps([
            "basic_analytics",
            "attendance_tracking",
            "mentor_matching",
            "academic_interventions",
            "ai_risk_scoring",
            "export_api",
        ])

        try:
            institutions = conn.execute(sa.text("SELECT id, slug FROM institutions")).fetchall()
            for inst_row in institutions:
                inst_id = str(inst_row[0])
                slug = str(inst_row[1])
                existing_lic = conn.execute(
                    sa.text("SELECT id FROM institution_licences WHERE institution_id = :inst_id"),
                    {"inst_id": inst_id}
                ).fetchone()
                if not existing_lic:
                    tier = "enterprise" if slug == "apex-tech" else "standard"
                    max_st = 1000 if slug == "apex-tech" else 500
                    max_mt = 100 if slug == "apex-tech" else 50
                    conn.execute(
                        sa.text("""
                            INSERT INTO institution_licences (
                                id, institution_id, plan_tier, status, max_students, max_mentors,
                                permitted_features, starts_at, expires_at, created_at, updated_at
                            ) VALUES (
                                :id, :inst_id, :tier, 'active', :max_st, :max_mt,
                                :features, :now, :expires, :now, :now
                            )
                        """),
                        {
                            "id": str(uuid.uuid4()),
                            "inst_id": inst_id,
                            "tier": tier,
                            "max_st": max_st,
                            "max_mt": max_mt,
                            "features": default_features,
                            "now": now,
                            "expires": expires,
                        }
                    )
        except Exception:
            pass


def downgrade() -> None:
    op.drop_table('platform_settings')
    op.drop_table('institution_status_history')
    op.drop_table('licence_events')
    op.drop_table('institution_licences')
