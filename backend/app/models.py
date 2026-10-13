import uuid
from datetime import datetime, timezone, date
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    Float,
    DateTime,
    Date,
    Text,
    ForeignKey,
    JSON,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# =========================================================================
# Module 1: Platform & Tenancy
# =========================================================================

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    status = Column(String(50), default="active", nullable=False)  # active, suspended, deactivated
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by_account_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    settings = relationship("InstitutionSettings", back_populates="institution", uselist=False, cascade="all, delete-orphan")
    memberships = relationship("InstitutionMembership", back_populates="institution", cascade="all, delete-orphan")
    licences = relationship("InstitutionLicence", back_populates="institution", cascade="all, delete-orphan", order_by="InstitutionLicence.created_at.desc()")
    status_history = relationship("InstitutionStatusHistory", back_populates="institution", cascade="all, delete-orphan", order_by="InstitutionStatusHistory.occurred_at.desc()")


class InstitutionApplication(Base):
    __tablename__ = "institution_applications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_name = Column(String(255), nullable=False)
    representative_name = Column(String(255), nullable=False)
    representative_email = Column(String(255), nullable=False)
    verification_summary = Column(Text, nullable=False)
    status = Column(String(50), default="submitted", nullable=False)  # submitted, under_review, approved, rejected, withdrawn
    reviewed_by_account_id = Column(String(36), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    decision_reason = Column(Text, nullable=True)
    created_institution_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)


class InstitutionSettings(Base):
    __tablename__ = "institution_settings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), unique=True, nullable=False)
    display_name = Column(String(255), nullable=False)
    locale = Column(String(20), default="en", nullable=False)
    branding = Column(JSON, default=dict, nullable=False)
    min_cohort_threshold = Column(Integer, default=5, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    institution = relationship("Institution", back_populates="settings")


class InstitutionLicence(Base):
    __tablename__ = "institution_licences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_tier = Column(String(50), default="standard", nullable=False)  # starter, standard, professional, enterprise
    status = Column(String(50), default="active", nullable=False)  # active, expiring_soon, expired, suspended, revoked
    max_students = Column(Integer, default=500, nullable=False)
    max_mentors = Column(Integer, default=50, nullable=False)
    permitted_features = Column(JSON, default=list, nullable=False)  # list of feature identifiers
    starts_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    institution = relationship("Institution", back_populates="licences")
    events = relationship("LicenceEvent", back_populates="licence", cascade="all, delete-orphan", order_by="LicenceEvent.occurred_at.desc()")


class LicenceEvent(Base):
    __tablename__ = "licence_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    licence_id = Column(String(36), ForeignKey("institution_licences.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_account_id = Column(String(36), nullable=True)
    event_type = Column(String(50), nullable=False)  # issued, renewed, modified, suspended, reactivated, revoked, expired
    before_state = Column(JSON, nullable=True)
    after_state = Column(JSON, nullable=True)
    reason = Column(Text, nullable=True)
    occurred_at = Column(DateTime(timezone=True), default=now_utc, nullable=False, index=True)

    licence = relationship("InstitutionLicence", back_populates="events")
    institution = relationship("Institution")


class InstitutionStatusHistory(Base):
    __tablename__ = "institution_status_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    previous_status = Column(String(50), nullable=False)
    new_status = Column(String(50), nullable=False)
    reason = Column(Text, nullable=True)
    changed_by_account_id = Column(String(36), nullable=True)
    occurred_at = Column(DateTime(timezone=True), default=now_utc, nullable=False, index=True)

    institution = relationship("Institution", back_populates="status_history")


class PlatformSetting(Base):
    __tablename__ = "platform_settings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(JSON, nullable=False)
    updated_by_account_id = Column(String(36), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)


# =========================================================================
# Module 2: Identity & Access
# =========================================================================

class Account(Base):
    __tablename__ = "accounts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=False)
    status = Column(String(50), default="active", nullable=False)  # active, invited, suspended, deactivated
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    is_super_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    memberships = relationship("InstitutionMembership", back_populates="account", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="account", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    account_id = Column(String(36), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    active_membership_id = Column(String(36), nullable=True)
    csrf_token = Column(String(64), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    account = relationship("Account", back_populates="sessions")


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    account_id = Column(String(36), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    purpose = Column(String(50), default="verify_email", nullable=False)  # verify_email, credential_recovery
    expires_at = Column(DateTime(timezone=True), nullable=False)
    consumed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)


class InstitutionMembership(Base):
    __tablename__ = "institution_memberships"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(String(36), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="active", nullable=False)  # active, invited, suspended, deactivated
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    __table_args__ = (UniqueConstraint("institution_id", "account_id", name="uq_membership_inst_account"),)

    institution = relationship("Institution", back_populates="memberships")
    account = relationship("Account", back_populates="memberships")
    roles = relationship("MembershipRole", back_populates="membership", cascade="all, delete-orphan")


class MembershipRole(Base):
    __tablename__ = "membership_roles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), nullable=False)  # institution_admin, faculty_assessor, mentor_advisor, data_operator, student
    granted_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    membership = relationship("InstitutionMembership", back_populates="roles")


class MembershipInvitation(Base):
    __tablename__ = "membership_invitations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    role = Column(String(50), nullable=False)
    token_hash = Column(String(64), unique=True, nullable=False)
    invited_by_membership_id = Column(String(36), nullable=False)
    roster_student_id = Column(String(36), nullable=True)
    status = Column(String(50), default="pending", nullable=False)  # pending, accepted, revoked, expired
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)


class ScopeAssignment(Base):
    __tablename__ = "scope_assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="CASCADE"), nullable=False, index=True)
    purpose = Column(String(50), nullable=False)  # assess, mentor, import, report, manage
    scope_type = Column(String(50), nullable=False)  # institution, programme, cohort, org_node, assessment_scope
    scope_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)


class ExceptionalAccessGrant(Base):
    __tablename__ = "exceptional_access_grants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    requester_account_id = Column(String(36), nullable=False)
    approver_membership_id = Column(String(36), nullable=True)
    purpose = Column(Text, nullable=False)
    target_scope = Column(String(100), nullable=False)
    allowed_actions = Column(JSON, default=list, nullable=False)
    status = Column(String(50), default="requested", nullable=False)  # requested, approved, rejected, expired, revoked
    starts_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)


# =========================================================================
# Module 3: Organisation & Student Records
# =========================================================================

class OrgNode(Base):
    __tablename__ = "org_nodes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    parent_id = Column(String(36), ForeignKey("org_nodes.id"), nullable=True)
    node_type = Column(String(50), nullable=False)  # campus, department, branch
    name = Column(String(255), nullable=False)
    status = Column(String(50), default="active", nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)


class Programme(Base):
    __tablename__ = "programmes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    org_node_id = Column(String(36), nullable=True)
    name = Column(String(255), nullable=False)
    code = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)


class Cohort(Base):
    __tablename__ = "cohorts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    programme_id = Column(String(36), ForeignKey("programmes.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    account_id = Column(String(36), nullable=True, index=True)
    membership_id = Column(String(36), nullable=True, index=True)
    student_identifier = Column(String(100), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False)
    status = Column(String(50), default="active", nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    __table_args__ = (UniqueConstraint("institution_id", "student_identifier", name="uq_student_inst_ident"),)


class CohortMembership(Base):
    __tablename__ = "cohort_memberships"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    cohort_id = Column(String(36), ForeignKey("cohorts.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="active", nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    cohort = relationship("Cohort")
    student = relationship("StudentProfile")


class StudentProfileRevision(Base):
    __tablename__ = "student_profile_revisions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    revision_number = Column(Integer, nullable=False)
    actor_membership_id = Column(String(36), nullable=False)
    prior_snapshot = Column(JSON, nullable=False)
    new_snapshot = Column(JSON, nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)


# =========================================================================
# Module 4: Storage & CSV Import
# =========================================================================

class StoredObject(Base):
    __tablename__ = "stored_objects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    storage_key = Column(String(500), nullable=False)
    original_filename = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    byte_size = Column(Integer, nullable=False)
    checksum_sha256 = Column(String(64), nullable=False)
    uploaded_by_account_id = Column(String(36), nullable=False)
    purpose = Column(String(50), nullable=False)  # import, evidence, submission, export, logo
    status = Column(String(50), default="verified", nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)


class ImportJob(Base):
    __tablename__ = "import_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    initiator_membership_id = Column(String(36), nullable=False)
    stored_object_id = Column(String(36), nullable=True)
    import_type = Column(String(50), default="students", nullable=False)  # students, external_results
    template_version = Column(String(50), default="1.0", nullable=False)
    idempotency_key = Column(String(100), nullable=False)
    status = Column(String(50), default="awaiting_upload", nullable=False)
    total_rows = Column(Integer, default=0, nullable=False)
    valid_rows = Column(Integer, default=0, nullable=False)
    error_rows = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)


class ImportStagedRow(Base):
    __tablename__ = "import_staged_rows"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    import_job_id = Column(String(36), ForeignKey("import_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    row_number = Column(Integer, nullable=False)
    raw_data = Column(JSON, nullable=False)
    parsed_data = Column(JSON, nullable=True)
    action = Column(String(50), default="create", nullable=False)  # create, update, skip
    is_valid = Column(Boolean, default=True, nullable=False)


class ImportIssue(Base):
    __tablename__ = "import_issues"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    import_job_id = Column(String(36), ForeignKey("import_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    row_number = Column(Integer, nullable=True)
    field_name = Column(String(100), nullable=True)
    severity = Column(String(20), default="error", nullable=False)  # error, warning
    code = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)


# =========================================================================
# Module 5: Competency Frameworks (Configurable, Data-Driven)
# =========================================================================

class CompetencyFramework(Base):
    __tablename__ = "competency_frameworks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    key = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    __table_args__ = (UniqueConstraint("institution_id", "key", name="uq_framework_inst_key"),)
    versions = relationship("FrameworkVersion", back_populates="framework", cascade="all, delete-orphan")


class FrameworkVersion(Base):
    __tablename__ = "framework_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    framework_id = Column(String(36), ForeignKey("competency_frameworks.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    rule_set_version = Column(String(50), default="empiria_rules_v1", nullable=False)
    status = Column(String(50), default="draft", nullable=False)  # draft, published, retired
    published_at = Column(DateTime(timezone=True), nullable=True)
    published_by_membership_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    __table_args__ = (UniqueConstraint("framework_id", "version_number", name="uq_fw_version_num"),)
    framework = relationship("CompetencyFramework", back_populates="versions")
    competencies = relationship("FrameworkCompetency", back_populates="framework_version", cascade="all, delete-orphan")


class FrameworkCompetency(Base):
    __tablename__ = "framework_competencies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    framework_version_id = Column(String(36), ForeignKey("framework_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    competency_key = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    guidance = Column(Text, nullable=True)
    display_order = Column(Integer, default=1, nullable=False)

    __table_args__ = (UniqueConstraint("framework_version_id", "competency_key", name="uq_comp_ver_key"),)
    framework_version = relationship("FrameworkVersion", back_populates="competencies")
    levels = relationship("CompetencyLevel", back_populates="competency", cascade="all, delete-orphan")
    thresholds = relationship("CompetencyThreshold", back_populates="competency", cascade="all, delete-orphan")


class CompetencyLevel(Base):
    __tablename__ = "competency_levels"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    competency_id = Column(String(36), ForeignKey("framework_competencies.id", ondelete="CASCADE"), nullable=False, index=True)
    level_code = Column(String(20), nullable=False)  # L1, L2, L3, L4
    rank = Column(Integer, nullable=False)  # 1, 2, 3, 4
    label = Column(String(100), nullable=False)  # Foundational, Developing, Competent, Advanced
    descriptor = Column(Text, nullable=False)

    __table_args__ = (UniqueConstraint("competency_id", "rank", name="uq_level_comp_rank"),)
    competency = relationship("FrameworkCompetency", back_populates="levels")


class CompetencyThreshold(Base):
    __tablename__ = "competency_thresholds"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    competency_id = Column(String(36), ForeignKey("framework_competencies.id", ondelete="CASCADE"), nullable=False, index=True)
    level_id = Column(String(36), ForeignKey("competency_levels.id", ondelete="CASCADE"), nullable=False)
    required_method = Column(String(50), default="any", nullable=False)  # assessment, project, any
    min_evidence_count = Column(Integer, default=1, nullable=False)
    min_score = Column(Float, nullable=True)
    max_age_days = Column(Integer, nullable=True)

    competency = relationship("FrameworkCompetency", back_populates="thresholds")


class CompetencyPrerequisite(Base):
    __tablename__ = "competency_prerequisites"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    competency_id = Column(String(36), ForeignKey("framework_competencies.id", ondelete="CASCADE"), nullable=False)
    prerequisite_competency_id = Column(String(36), ForeignKey("framework_competencies.id", ondelete="CASCADE"), nullable=False)
    min_prerequisite_level_rank = Column(Integer, default=1, nullable=False)


# =========================================================================
# Module 6: Assessments, Attempts and Results
# =========================================================================

class AssessmentFamily(Base):
    __tablename__ = "assessment_families"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    key = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)


class AssessmentForm(Base):
    __tablename__ = "assessment_forms"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    family_id = Column(String(36), ForeignKey("assessment_families.id", ondelete="SET NULL"), nullable=True)
    framework_version_id = Column(String(36), ForeignKey("framework_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    assessment_type = Column(String(50), default="baseline", nullable=False)  # baseline, follow_up, formative
    status = Column(String(50), default="draft", nullable=False)  # draft, published, retired
    comparability_state = Column(String(50), default="declared_equivalent", nullable=False)  # declared_equivalent, expert_reviewed, not_established
    comparability_note = Column(Text, nullable=True)
    time_limit_minutes = Column(Integer, nullable=True)
    max_attempts = Column(Integer, default=1, nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    items = relationship("AssessmentFormItem", back_populates="form", cascade="all, delete-orphan")


class AssessmentItem(Base):
    __tablename__ = "assessment_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    framework_version_id = Column(String(36), nullable=False, index=True)
    competency_id = Column(String(36), ForeignKey("framework_competencies.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(100), nullable=False)
    prompt = Column(Text, nullable=False)
    item_type = Column(String(50), default="single_choice", nullable=False)  # single_choice, multiple_choice, numeric, text_match
    points = Column(Float, default=1.0, nullable=False)
    answer_key = Column(JSON, nullable=False)  # Stored securely server-side; NEVER sent to student
    rubric = Column(JSON, nullable=True)
    explanation = Column(Text, nullable=True)

    options = relationship("AssessmentItemOption", back_populates="item", cascade="all, delete-orphan")


class AssessmentItemOption(Base):
    __tablename__ = "assessment_item_options"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    item_id = Column(String(36), ForeignKey("assessment_items.id", ondelete="CASCADE"), nullable=False, index=True)
    option_key = Column(String(50), nullable=False)
    option_text = Column(Text, nullable=False)
    display_order = Column(Integer, default=1, nullable=False)

    item = relationship("AssessmentItem", back_populates="options")


class AssessmentFormItem(Base):
    __tablename__ = "assessment_form_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    form_id = Column(String(36), ForeignKey("assessment_forms.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(String(36), ForeignKey("assessment_items.id", ondelete="CASCADE"), nullable=False, index=True)
    display_order = Column(Integer, default=1, nullable=False)
    weight = Column(Float, default=1.0, nullable=False)

    form = relationship("AssessmentForm", back_populates="items")
    item = relationship("AssessmentItem")


class AssessmentScope(Base):
    __tablename__ = "assessment_scopes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    scope_type = Column(String(50), default="institution", nullable=False)  # institution, programme, cohort
    scope_id = Column(String(36), nullable=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)


class AssessmentScopeForm(Base):
    __tablename__ = "assessment_scope_forms"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    scope_id = Column(String(36), ForeignKey("assessment_scopes.id", ondelete="CASCADE"), nullable=False)
    form_id = Column(String(36), ForeignKey("assessment_forms.id", ondelete="CASCADE"), nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)
    opens_at = Column(DateTime(timezone=True), nullable=True)
    closes_at = Column(DateTime(timezone=True), nullable=True)


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    form_id = Column(String(36), ForeignKey("assessment_forms.id", ondelete="CASCADE"), nullable=False, index=True)
    scope_id = Column(String(36), nullable=True)
    attempt_number = Column(Integer, default=1, nullable=False)
    status = Column(String(50), default="in_progress", nullable=False)  # in_progress, submitted, finalised, abandoned
    started_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    responses = relationship("AssessmentResponse", back_populates="attempt", cascade="all, delete-orphan")
    form = relationship("AssessmentForm")
    student = relationship("StudentProfile")


class AssessmentResponse(Base):
    __tablename__ = "assessment_responses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    attempt_id = Column(String(36), ForeignKey("assessment_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(String(36), ForeignKey("assessment_items.id", ondelete="CASCADE"), nullable=False, index=True)
    response_data = Column(JSON, nullable=False)
    score_awarded = Column(Float, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    submitted_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    attempt = relationship("AssessmentAttempt", back_populates="responses")


class RubricVersion(Base):
    __tablename__ = "rubric_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    framework_version_id = Column(String(36), nullable=False)
    title = Column(String(255), nullable=False)
    version_number = Column(Integer, default=1, nullable=False)
    status = Column(String(50), default="published", nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    criteria = relationship("RubricCriterion", back_populates="rubric_version", cascade="all, delete-orphan")


class RubricCriterion(Base):
    __tablename__ = "rubric_criteria"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    rubric_version_id = Column(String(36), ForeignKey("rubric_versions.id", ondelete="CASCADE"), nullable=False)
    competency_id = Column(String(36), ForeignKey("framework_competencies.id", ondelete="CASCADE"), nullable=False)
    key = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    max_score = Column(Float, default=5.0, nullable=False)
    display_order = Column(Integer, default=1, nullable=False)

    rubric_version = relationship("RubricVersion", back_populates="criteria")


class ProjectSubmission(Base):
    __tablename__ = "project_submissions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(String(36), nullable=True)
    stored_object_id = Column(String(36), nullable=True)
    content_text = Column(Text, nullable=True)
    status = Column(String(50), default="submitted", nullable=False)  # submitted, in_review, reviewed
    submitted_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)


class RubricReview(Base):
    __tablename__ = "rubric_reviews"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    submission_id = Column(String(36), ForeignKey("project_submissions.id", ondelete="CASCADE"), nullable=False)
    rubric_version_id = Column(String(36), ForeignKey("rubric_versions.id"), nullable=False)
    reviewer_membership_id = Column(String(36), nullable=False)
    overall_score = Column(Float, nullable=True)
    overall_feedback = Column(Text, nullable=True)
    status = Column(String(50), default="finalised", nullable=False)  # draft, finalised
    finalised_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    scores = relationship("RubricCriterionScore", back_populates="review", cascade="all, delete-orphan")


class RubricCriterionScore(Base):
    __tablename__ = "rubric_criterion_scores"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    review_id = Column(String(36), ForeignKey("rubric_reviews.id", ondelete="CASCADE"), nullable=False)
    criterion_id = Column(String(36), ForeignKey("rubric_criteria.id"), nullable=False)
    score = Column(Float, nullable=False)
    feedback = Column(Text, nullable=True)

    review = relationship("RubricReview", back_populates="scores")


class ApprovedExternalResultMethod(Base):
    __tablename__ = "approved_external_result_methods"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    framework_version_id = Column(String(36), nullable=False)
    competency_id = Column(String(36), ForeignKey("framework_competencies.id", ondelete="CASCADE"), nullable=False)
    source_name = Column(String(255), nullable=False)
    method_description = Column(Text, nullable=False)
    status = Column(String(50), default="approved", nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)


class AssessmentResult(Base):
    __tablename__ = "assessment_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    framework_version_id = Column(String(36), ForeignKey("framework_versions.id"), nullable=False, index=True)
    source_type = Column(String(50), nullable=False)  # objective_attempt, rubric_review, external_result
    attempt_id = Column(String(36), ForeignKey("assessment_attempts.id", ondelete="SET NULL"), nullable=True)
    rubric_review_id = Column(String(36), ForeignKey("rubric_reviews.id", ondelete="SET NULL"), nullable=True)
    approved_method_id = Column(String(36), ForeignKey("approved_external_result_methods.id", ondelete="SET NULL"), nullable=True)
    total_score = Column(Float, nullable=True)
    max_possible_score = Column(Float, nullable=True)
    percentage = Column(Float, nullable=True)
    assessed_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    status = Column(String(50), default="finalised", nullable=False)
    superseded_by_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    competencies = relationship("ResultCompetency", back_populates="assessment_result", cascade="all, delete-orphan")
    attempt = relationship("AssessmentAttempt")
    student = relationship("StudentProfile")


class ResultCompetency(Base):
    __tablename__ = "result_competencies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    assessment_result_id = Column(String(36), ForeignKey("assessment_results.id", ondelete="CASCADE"), nullable=False, index=True)
    competency_id = Column(String(36), ForeignKey("framework_competencies.id", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Float, nullable=False)
    max_score = Column(Float, nullable=False)
    percentage = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)

    assessment_result = relationship("AssessmentResult", back_populates="competencies")
    competency = relationship("FrameworkCompetency")


# =========================================================================
# Module 7: Evidence Provenance
# =========================================================================

class EvidenceItem(Base):
    __tablename__ = "evidence_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    framework_version_id = Column(String(36), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    evidence_status = Column(String(50), default="assessment_verified", nullable=False)  # self_reported, assessment_verified, project_verified
    source_type = Column(String(50), default="assessment_result", nullable=False)  # assessment_result, project_submission, self_declaration
    assessment_result_id = Column(String(36), ForeignKey("assessment_results.id", ondelete="SET NULL"), nullable=True)
    project_submission_id = Column(String(36), ForeignKey("project_submissions.id", ondelete="SET NULL"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verifier_membership_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    competencies = relationship("EvidenceCompetency", back_populates="evidence", cascade="all, delete-orphan")


class EvidenceCompetency(Base):
    __tablename__ = "evidence_competencies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    evidence_id = Column(String(36), ForeignKey("evidence_items.id", ondelete="CASCADE"), nullable=False, index=True)
    competency_id = Column(String(36), ForeignKey("framework_competencies.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship_type = Column(String(50), default="supports", nullable=False)  # supports, contradicts, context

    evidence = relationship("EvidenceItem", back_populates="competencies")
    competency = relationship("FrameworkCompetency")


# =========================================================================
# Module 8: Deterministic Determinations & Diagnosis Engine
# =========================================================================

class DeterminationRun(Base):
    __tablename__ = "determination_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    framework_version_id = Column(String(36), nullable=False, index=True)
    rule_set_version = Column(String(50), default="empiria_rules_v1", nullable=False)
    input_fingerprint = Column(String(64), nullable=False)
    status = Column(String(50), default="completed", nullable=False)
    superseded_by_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    determinations = relationship("CompetencyDetermination", back_populates="run", cascade="all, delete-orphan")


class CompetencyDetermination(Base):
    __tablename__ = "competency_determinations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    determination_run_id = Column(String(36), ForeignKey("determination_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    competency_id = Column(String(36), ForeignKey("framework_competencies.id", ondelete="CASCADE"), nullable=False, index=True)
    supported_level_id = Column(String(36), ForeignKey("competency_levels.id", ondelete="SET NULL"), nullable=True)
    evidence_sufficiency = Column(String(50), default="sufficient", nullable=False)  # sufficient, insufficient, no_evidence, stale, conflicting
    reason_codes = Column(JSON, default=list, nullable=False)
    explanation_text = Column(Text, nullable=False)

    run = relationship("DeterminationRun", back_populates="determinations")
    supported_level = relationship("CompetencyLevel")
    competency = relationship("FrameworkCompetency")


class DeterminationEvidenceItem(Base):
    __tablename__ = "determination_evidence_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    determination_id = Column(String(36), ForeignKey("competency_determinations.id", ondelete="CASCADE"), nullable=False)
    evidence_id = Column(String(36), ForeignKey("evidence_items.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), default="supporting", nullable=False)  # supporting, contradictory, stale, excluded


class DeterminationResultInput(Base):
    __tablename__ = "determination_result_inputs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    determination_id = Column(String(36), ForeignKey("competency_determinations.id", ondelete="CASCADE"), nullable=False)
    result_id = Column(String(36), ForeignKey("assessment_results.id", ondelete="CASCADE"), nullable=False)


class DiagnosisRun(Base):
    __tablename__ = "diagnosis_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    determination_run_id = Column(String(36), ForeignKey("determination_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_version = Column(String(50), default="empiria_diag_v1", nullable=False)
    template_version = Column(String(50), default="empiria_tmpl_v1", nullable=False)
    status = Column(String(50), default="completed", nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    findings = relationship("DiagnosisFinding", back_populates="diagnosis_run", cascade="all, delete-orphan")
    determination_run = relationship("DeterminationRun")


class DiagnosisFinding(Base):
    __tablename__ = "diagnosis_findings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    diagnosis_run_id = Column(String(36), ForeignKey("diagnosis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    competency_id = Column(String(36), ForeignKey("framework_competencies.id", ondelete="CASCADE"), nullable=False, index=True)
    finding_type = Column(String(50), nullable=False)  # gap, target_met, insufficient_evidence
    current_level_id = Column(String(36), ForeignKey("competency_levels.id", ondelete="SET NULL"), nullable=True)
    target_level_id = Column(String(36), ForeignKey("competency_levels.id", ondelete="SET NULL"), nullable=True)
    rationale_code = Column(String(100), nullable=False)
    finding_summary = Column(Text, nullable=False)
    detailed_explanation = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=False)

    diagnosis_run = relationship("DiagnosisRun", back_populates="findings")
    competency = relationship("FrameworkCompetency")
    current_level = relationship("CompetencyLevel", foreign_keys=[current_level_id])
    target_level = relationship("CompetencyLevel", foreign_keys=[target_level_id])


class FindingEvidenceItem(Base):
    __tablename__ = "finding_evidence_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    finding_id = Column(String(36), ForeignKey("diagnosis_findings.id", ondelete="CASCADE"), nullable=False)
    evidence_id = Column(String(36), ForeignKey("evidence_items.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), default="supporting", nullable=False)


# =========================================================================
# Module 9: Development Planning & Practice
# =========================================================================

class ActivityCatalogue(Base):
    __tablename__ = "activity_catalogue"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    key = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    activity_type = Column(String(50), default="practice_exercise", nullable=False)  # practice_exercise, case_study, guided_project, tutorial
    completion_criteria = Column(Text, nullable=False)
    evaluation_method = Column(String(50), default="self_check", nullable=False)  # self_check, rubric_review, follow_up_assessment
    estimated_duration_hours = Column(Float, default=2.0, nullable=False)
    status = Column(String(50), default="published", nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    competencies = relationship("ActivityCompetency", back_populates="activity", cascade="all, delete-orphan")
    resources = relationship("ActivityResource", back_populates="activity", cascade="all, delete-orphan")


class ActivityCompetency(Base):
    __tablename__ = "activity_competencies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    activity_id = Column(String(36), ForeignKey("activity_catalogue.id", ondelete="CASCADE"), nullable=False)
    competency_id = Column(String(36), ForeignKey("framework_competencies.id", ondelete="CASCADE"), nullable=False)
    target_level_rank = Column(Integer, default=3, nullable=False)

    activity = relationship("ActivityCatalogue", back_populates="competencies")
    competency = relationship("FrameworkCompetency")


class ActivityResource(Base):
    __tablename__ = "activity_resources"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    activity_id = Column(String(36), ForeignKey("activity_catalogue.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False)
    resource_type = Column(String(50), default="documentation", nullable=False)  # documentation, dataset, exercise, video

    activity = relationship("ActivityCatalogue", back_populates="resources")


class DevelopmentPlan(Base):
    __tablename__ = "development_plans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    framework_version_id = Column(String(36), nullable=False)
    status = Column(String(50), default="active", nullable=False)  # active, completed, superseded
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    versions = relationship("DevelopmentPlanVersion", back_populates="plan", cascade="all, delete-orphan")


class DevelopmentPlanVersion(Base):
    __tablename__ = "development_plan_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    plan_id = Column(String(36), ForeignKey("development_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, default=1, nullable=False)
    diagnosis_run_id = Column(String(36), ForeignKey("diagnosis_runs.id"), nullable=False)
    rule_version = Column(String(50), default="empiria_plan_v1", nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    plan = relationship("DevelopmentPlan", back_populates="versions")
    tasks = relationship("PlanTask", back_populates="plan_version", cascade="all, delete-orphan")


class PlanTask(Base):
    __tablename__ = "plan_tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    plan_version_id = Column(String(36), ForeignKey("development_plan_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    finding_id = Column(String(36), ForeignKey("diagnosis_findings.id", ondelete="SET NULL"), nullable=True)
    activity_id = Column(String(36), ForeignKey("activity_catalogue.id", ondelete="SET NULL"), nullable=True)
    competency_id = Column(String(36), ForeignKey("framework_competencies.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    completion_criteria = Column(Text, nullable=False)
    recommendation_rationale = Column(Text, nullable=False)
    status = Column(String(50), default="pending", nullable=False)  # pending, in_progress, submitted, completed
    priority = Column(Integer, default=1, nullable=False)
    due_date = Column(Date, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    plan_version = relationship("DevelopmentPlanVersion", back_populates="tasks")
    competency = relationship("FrameworkCompetency")
    activity = relationship("ActivityCatalogue")
    status_events = relationship("TaskStatusEvent", back_populates="task", cascade="all, delete-orphan")
    submissions = relationship("TaskSubmission", back_populates="task", cascade="all, delete-orphan")


class TaskStatusEvent(Base):
    __tablename__ = "task_status_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    task_id = Column(String(36), ForeignKey("plan_tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status = Column(String(50), nullable=False)
    to_status = Column(String(50), nullable=False)
    actor_membership_id = Column(String(36), nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    task = relationship("PlanTask", back_populates="status_events")


class TaskSubmission(Base):
    __tablename__ = "task_submissions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    task_id = Column(String(36), ForeignKey("plan_tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    stored_object_id = Column(String(36), nullable=True)
    submission_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    task = relationship("PlanTask", back_populates="submissions")


# =========================================================================
# Module 10: Follow-up Verification & Progress
# =========================================================================

class ProgressComparison(Base):
    __tablename__ = "progress_comparisons"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    competency_id = Column(String(36), ForeignKey("framework_competencies.id", ondelete="CASCADE"), nullable=False, index=True)
    baseline_result_id = Column(String(36), ForeignKey("assessment_results.id"), nullable=False)
    follow_up_result_id = Column(String(36), ForeignKey("assessment_results.id"), nullable=False)
    baseline_score = Column(Float, nullable=False)
    follow_up_score = Column(Float, nullable=False)
    score_delta = Column(Float, nullable=False)
    comparability_state = Column(String(50), default="declared_equivalent", nullable=False)  # declared_equivalent, expert_reviewed, not_established
    outcome_status = Column(String(50), nullable=False)  # improved, unchanged, regressed, inconclusive
    mandatory_limitations = Column(Text, nullable=False)
    comparison_rule_version = Column(String(50), default="empiria_comp_v1", nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    competency = relationship("FrameworkCompetency")
    baseline_result = relationship("AssessmentResult", foreign_keys=[baseline_result_id])
    follow_up_result = relationship("AssessmentResult", foreign_keys=[follow_up_result_id])


# =========================================================================
# Module 11: Support & Intervention
# =========================================================================

class SupportQueue(Base):
    __tablename__ = "support_queues"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    default_assignee_membership_id = Column(String(36), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)


class SupportRequest(Base):
    __tablename__ = "support_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    queue_id = Column(String(36), ForeignKey("support_queues.id", ondelete="SET NULL"), nullable=True)
    assigned_staff_membership_id = Column(String(36), nullable=True)
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(50), default="open", nullable=False)  # open, in_review, resolved, closed
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    interventions = relationship("InterventionRecord", back_populates="support_request", cascade="all, delete-orphan")
    student = relationship("StudentProfile")


class MentorAssignment(Base):
    __tablename__ = "mentor_assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    mentor_membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="CASCADE"), nullable=False, index=True)
    assignment_type = Column(String(50), server_default="primary", default="primary", nullable=False)  # primary, subject
    framework_competency_id = Column(String(36), ForeignKey("framework_competencies.id", ondelete="SET NULL"), nullable=True)
    subject_scope = Column(String(100), nullable=True)  # e.g., SQL, Python, Statistics, Data Analysis
    assigned_by_membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="active", nullable=False)  # active, ended, replaced
    reason = Column(Text, nullable=True)
    assigned_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)

    student = relationship("StudentProfile", foreign_keys=[student_id])
    mentor_membership = relationship("InstitutionMembership", foreign_keys=[mentor_membership_id])
    assigned_by_membership = relationship("InstitutionMembership", foreign_keys=[assigned_by_membership_id])
    framework_competency = relationship("FrameworkCompetency", foreign_keys=[framework_competency_id])



class InterventionRecord(Base):
    __tablename__ = "intervention_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    support_request_id = Column(String(36), ForeignKey("support_requests.id", ondelete="SET NULL"), nullable=True)
    responsible_membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="CASCADE"), nullable=False)
    intervention_date = Column(Date, nullable=False)
    agreed_actions = Column(Text, nullable=False)
    follow_up_date = Column(Date, nullable=True)
    status = Column(String(50), default="active", nullable=False)
    superseded_by_id = Column(String(36), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    support_request = relationship("SupportRequest", back_populates="interventions")
    responsible_membership = relationship("InstitutionMembership")


# =========================================================================
# Module 12: Reporting & Audit
# =========================================================================

class ReportingPolicy(Base):
    __tablename__ = "reporting_policies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=False, index=True)
    min_cohort_size = Column(Integer, default=5, nullable=False)
    effective_from = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    approved_by_membership_id = Column(String(36), nullable=True)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=True, index=True)
    actor_account_id = Column(String(36), nullable=True)
    actor_membership_id = Column(String(36), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(100), nullable=True)
    purpose = Column(String(255), nullable=True)
    request_id = Column(String(100), nullable=True)
    ip_address = Column(String(50), nullable=True)
    details = Column(JSON, nullable=True)
    previous_hash = Column(String(64), nullable=True)
    current_hash = Column(String(64), nullable=True)
    occurred_at = Column(DateTime(timezone=True), default=now_utc, nullable=False, index=True)


# =========================================================================
# Module 13: Bidirectional Messaging & Notifications
# =========================================================================

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_profile_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by_membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="CASCADE"), nullable=False, index=True)
    mentor_assignment_id = Column(String(36), ForeignKey("mentor_assignments.id", ondelete="SET NULL"), nullable=True, index=True)
    conversation_kind = Column(String(50), nullable=False)  # primary_mentoring, subject_mentoring, assessment_query, support, general
    subject = Column(String(255), nullable=False)
    status = Column(String(50), default="open", nullable=False)  # open, awaiting_response, resolved, reopened
    expected_responder_membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="SET NULL"), nullable=True)
    framework_competency_id = Column(String(36), ForeignKey("framework_competencies.id", ondelete="SET NULL"), nullable=True)
    assessment_attempt_id = Column(String(36), ForeignKey("assessment_attempts.id", ondelete="SET NULL"), nullable=True)
    subject_scope = Column(String(100), nullable=True)  # e.g., SQL, Python, General Career
    last_message_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    student_profile = relationship("StudentProfile", foreign_keys=[student_profile_id])
    created_by_membership = relationship("InstitutionMembership", foreign_keys=[created_by_membership_id])
    expected_responder_membership = relationship("InstitutionMembership", foreign_keys=[expected_responder_membership_id])
    mentor_assignment = relationship("MentorAssignment", foreign_keys=[mentor_assignment_id])
    framework_competency = relationship("FrameworkCompetency", foreign_keys=[framework_competency_id])
    assessment_attempt = relationship("AssessmentAttempt", foreign_keys=[assessment_attempt_id])
    participants = relationship("ConversationParticipant", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("ConversationMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="ConversationMessage.created_at")


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_kind = Column(String(50), nullable=False)  # student, primary_mentor, subject_mentor, assessor, support_staff
    status = Column(String(50), default="active", nullable=False)  # active, removed
    joined_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    last_read_at = Column(DateTime(timezone=True), nullable=True)

    conversation = relationship("Conversation", back_populates="participants")
    membership = relationship("InstitutionMembership", foreign_keys=[membership_id])


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="CASCADE"), nullable=False, index=True)
    body = Column(Text, nullable=False)
    client_request_key = Column(String(100), nullable=True)
    reply_to_message_id = Column(String(36), ForeignKey("conversation_messages.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    conversation = relationship("Conversation", back_populates="messages")
    sender_membership = relationship("InstitutionMembership", foreign_keys=[sender_membership_id])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="CASCADE"), nullable=False, index=True)
    notification_type = Column(String(50), nullable=False)  # query_created, message_received, conversation_resolved, conversation_reopened, mentor_assignment_changed
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=True, index=True)
    message_id = Column(String(36), ForeignKey("conversation_messages.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(255), nullable=False)
    event_key = Column(String(100), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    recipient_membership = relationship("InstitutionMembership", foreign_keys=[recipient_membership_id])
    conversation = relationship("Conversation", foreign_keys=[conversation_id])
    message = relationship("ConversationMessage", foreign_keys=[message_id])


# =========================================================================
# Module 14: Academic Structure & Records (Section 8.B)
# =========================================================================

class Department(Base):
    __tablename__ = "departments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=False)
    status = Column(String(50), default="active", nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    __table_args__ = (UniqueConstraint("institution_id", "code", name="uq_department_inst_code"),)


class AcademicTerm(Base):
    __tablename__ = "academic_terms"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(50), default="active", nullable=False)  # active, completed, upcoming
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)


class Course(Base):
    __tablename__ = "courses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    code = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    credits = Column(Float, default=3.0, nullable=False)
    status = Column(String(50), default="active", nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    __table_args__ = (UniqueConstraint("institution_id", "code", name="uq_course_inst_code"),)


class CourseOffering(Base):
    __tablename__ = "course_offerings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_term_id = Column(String(36), ForeignKey("academic_terms.id", ondelete="CASCADE"), nullable=False, index=True)
    instructor_membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="SET NULL"), nullable=True, index=True)
    section_identifier = Column(String(50), default="01", nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    status = Column(String(50), default="active", nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    course = relationship("Course")
    term = relationship("AcademicTerm")
    instructor = relationship("InstitutionMembership", foreign_keys=[instructor_membership_id])


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    course_offering_id = Column(String(36), ForeignKey("course_offerings.id", ondelete="CASCADE"), nullable=False, index=True)
    enrollment_status = Column(String(50), default="enrolled", nullable=False)  # enrolled, completed, dropped, withdrawn
    final_outcome = Column(String(50), nullable=True)  # pass, distinction, fail, withdrawn
    final_grade = Column(Float, nullable=True)
    enrolled_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    student = relationship("StudentProfile")
    course_offering = relationship("CourseOffering")

    __table_args__ = (UniqueConstraint("institution_id", "student_id", "course_offering_id", name="uq_enrollment_inst_student_offering"),)


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    enrollment_id = Column(String(36), ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False, index=True)
    session_date = Column(Date, nullable=False)
    status = Column(String(50), nullable=False)  # present, absent, late, excused
    source = Column(String(50), default="manual", nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    enrollment = relationship("Enrollment")


class CourseAssessment(Base):
    __tablename__ = "course_assessments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    course_offering_id = Column(String(36), ForeignKey("course_offerings.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    assessment_type = Column(String(50), default="assignment", nullable=False)  # assignment, quiz, midterm, project, exam
    max_score = Column(Float, default=100.0, nullable=False)
    weight = Column(Float, default=1.0, nullable=False)
    assessment_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    course_offering = relationship("CourseOffering")


class CourseAssessmentResult(Base):
    __tablename__ = "course_assessment_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_id = Column(String(36), ForeignKey("course_assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    enrollment_id = Column(String(36), ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Float, nullable=False)
    max_score = Column(Float, default=100.0, nullable=False)
    status = Column(String(50), default="graded", nullable=False)  # submitted, graded, excused
    assessor_membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="SET NULL"), nullable=True)
    grading_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    assessment = relationship("CourseAssessment")
    enrollment = relationship("Enrollment")
    assessor = relationship("InstitutionMembership", foreign_keys=[assessor_membership_id])

    __table_args__ = (UniqueConstraint("assessment_id", "enrollment_id", name="uq_assessment_enrollment"),)


# =========================================================================
# Module 15: Career Pathways & Student Goals (Section 8.E)
# =========================================================================

class CareerRole(Base):
    __tablename__ = "career_roles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), nullable=True, index=True)  # null = global default
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    taxonomy_source = Column(String(100), default="ESCO", nullable=False)
    taxonomy_version = Column(String(50), default="v1.1", nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)


class RoleSkillRequirement(Base):
    __tablename__ = "role_skill_requirements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    career_role_id = Column(String(36), ForeignKey("career_roles.id", ondelete="CASCADE"), nullable=False, index=True)
    competency_id = Column(String(36), ForeignKey("framework_competencies.id", ondelete="CASCADE"), nullable=False, index=True)
    target_proficiency = Column(Integer, default=3, nullable=False)  # 1-4 scale
    is_required = Column(Boolean, default=True, nullable=False)
    evidence_criteria = Column(Text, nullable=True)

    career_role = relationship("CareerRole")
    competency = relationship("FrameworkCompetency")


class StudentGoal(Base):
    __tablename__ = "student_goals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    career_role_id = Column(String(36), ForeignKey("career_roles.id", ondelete="SET NULL"), nullable=True, index=True)
    competency_id = Column(String(36), ForeignKey("framework_competencies.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    target_date = Column(Date, nullable=True)
    status = Column(String(50), default="active", nullable=False)  # active, completed, paused
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    student = relationship("StudentProfile")
    career_role = relationship("CareerRole")
    competency = relationship("FrameworkCompetency")


# =========================================================================
# Module 16: Mentorship Capacity & Optimization Matching (Section 8.C, 8.H, 18)
# =========================================================================

class MentorProfile(Base):
    __tablename__ = "mentor_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="CASCADE"), nullable=False, index=True)
    biography = Column(Text, nullable=True)
    department_name = Column(String(100), nullable=True)
    availability_status = Column(String(50), default="available", nullable=False)  # available, at_capacity, unavailable
    max_capacity = Column(Integer, default=10, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    membership = relationship("InstitutionMembership")
    expertise = relationship("MentorExpertise", back_populates="mentor_profile", cascade="all, delete-orphan")


class MentorExpertise(Base):
    __tablename__ = "mentor_expertise"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    mentor_profile_id = Column(String(36), ForeignKey("mentor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    competency_id = Column(String(36), ForeignKey("framework_competencies.id", ondelete="SET NULL"), nullable=True)
    subject_name = Column(String(100), nullable=False)  # e.g., SQL, Python, Statistics, Communication
    proficiency_level = Column(Integer, default=4, nullable=False)

    mentor_profile = relationship("MentorProfile", back_populates="expertise")
    competency = relationship("FrameworkCompetency")


class MatchingRun(Base):
    __tablename__ = "matching_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    scope = Column(String(100), default="all_students", nullable=False)  # all_students, unassigned_only, high_risk
    assignment_type = Column(String(50), default="primary", nullable=False)  # primary, subject
    subject_scope = Column(String(100), nullable=True)
    capacity_multiplier = Column(Float, default=1.0, nullable=False)
    algorithm_name = Column(String(100), default="hungarian_optimization", nullable=False)
    configuration = Column(JSON, nullable=True)
    status = Column(String(50), default="completed", nullable=False)  # running, completed, failed
    created_by_membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    proposals = relationship("MatchingProposal", back_populates="matching_run", cascade="all, delete-orphan")


class MatchingProposal(Base):
    __tablename__ = "matching_proposals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    matching_run_id = Column(String(36), ForeignKey("matching_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    proposed_mentor_membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="CASCADE"), nullable=False, index=True)
    assignment_type = Column(String(50), default="primary", nullable=False)  # primary, subject
    subject_scope = Column(String(100), nullable=True)
    compatibility_score = Column(Float, nullable=False)  # 0.0 to 1.0
    contributing_factors = Column(JSON, nullable=True)  # breakdown of score
    approval_status = Column(String(50), default="pending", nullable=False)  # pending, approved, rejected
    reviewed_by_membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    decision_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    matching_run = relationship("MatchingRun", back_populates="proposals")
    student = relationship("StudentProfile")
    proposed_mentor = relationship("InstitutionMembership", foreign_keys=[proposed_mentor_membership_id])
    reviewer = relationship("InstitutionMembership", foreign_keys=[reviewed_by_membership_id])


# =========================================================================
# Module 17: Pre-Session AI Mentor Briefings (Section 8.K, 21)
# =========================================================================

class MentorBriefing(Base):
    __tablename__ = "mentor_briefings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    mentor_membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    session_reference = Column(String(100), nullable=True)
    source_references = Column(JSON, nullable=True)  # IDs of attendance, assessments, plans examined
    generation_method = Column(String(50), default="deterministic_summary", nullable=False)  # deterministic_summary, external_llm
    provider_model = Column(String(100), default="empiria_rules_engine", nullable=False)
    status = Column(String(50), default="completed", nullable=False)  # generating, completed, failed
    briefing_content = Column(JSON, nullable=False)  # agenda, questions, observations, disclaimer
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    mentor = relationship("InstitutionMembership", foreign_keys=[mentor_membership_id])
    student = relationship("StudentProfile", foreign_keys=[student_id])


class MentorMeeting(Base):
    __tablename__ = "mentor_meetings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    mentor_membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="CASCADE"), nullable=False, index=True)
    assignment_id = Column(String(36), ForeignKey("mentor_assignments.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    meeting_type = Column(String(50), default="advisory", nullable=False)  # advisory, subject_coaching, progress_review, checkin
    scheduled_at = Column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes = Column(Integer, default=30, nullable=False)
    location_or_url = Column(String(255), nullable=True)
    status = Column(String(50), default="scheduled", nullable=False)  # scheduled, completed, cancelled, rescheduled
    agenda = Column(Text, nullable=True)
    outcome_notes = Column(Text, nullable=True)
    follow_up_actions = Column(Text, nullable=True)
    follow_up_due_date = Column(Date, nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    mentor = relationship("InstitutionMembership", foreign_keys=[mentor_membership_id])
    student = relationship("StudentProfile", foreign_keys=[student_id])
    assignment = relationship("MentorAssignment", foreign_keys=[assignment_id])



# =========================================================================
# Module 18: Academic Risk Intelligence & Explanations (Section 8.F, 15)
# =========================================================================

class RiskModelVersion(Base):
    __tablename__ = "risk_model_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(50), nullable=False)
    algorithm = Column(String(50), default="lightgbm", nullable=False)
    feature_schema_version = Column(String(50), default="v1.0", nullable=False)
    training_dataset_reference = Column(String(255), nullable=True)
    model_artifact_path = Column(String(500), nullable=True)
    status = Column(String(50), default="active", nullable=False)  # active, candidate, archived
    metrics = Column(JSON, nullable=True)  # roc_auc, pr_auc, precision, recall, f1, brier_score
    configuration = Column(JSON, nullable=True)
    trained_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    __table_args__ = (UniqueConstraint("institution_id", "model_version", name="uq_risk_model_inst_ver"),)


class RiskScoringRun(Base):
    __tablename__ = "risk_scoring_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    model_version_id = Column(String(36), ForeignKey("risk_model_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    term_scope = Column(String(100), nullable=True)
    cutoff_scope = Column(String(100), default="midterm", nullable=False)  # week4, midterm, week10
    status = Column(String(50), default="completed", nullable=False)  # running, completed, failed
    started_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    failure_details = Column(Text, nullable=True)
    requester_membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="SET NULL"), nullable=True)

    model = relationship("RiskModelVersion")
    predictions = relationship("StudentRiskPrediction", back_populates="scoring_run", cascade="all, delete-orphan")


class StudentRiskPrediction(Base):
    __tablename__ = "student_risk_predictions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    scoring_run_id = Column(String(36), ForeignKey("risk_scoring_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    enrollment_id = Column(String(36), ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    predicted_probability = Column(Float, nullable=False)
    calibrated_probability = Column(Float, nullable=False)
    support_level = Column(String(50), nullable=False)  # low, medium, high, urgent
    threshold_policy_version = Column(String(50), default="standard_v1", nullable=False)
    generated_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    scoring_run = relationship("RiskScoringRun", back_populates="predictions")
    enrollment = relationship("Enrollment")
    student = relationship("StudentProfile")
    explanation = relationship("RiskExplanation", back_populates="prediction", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("scoring_run_id", "enrollment_id", name="uq_prediction_run_enrollment"),)


class RiskPolicy(Base):
    __tablename__ = "risk_policies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    policy_version = Column(String(50), default="v1.0", nullable=False)
    threshold_config = Column(JSON, nullable=False)  # {"low": 0.25, "medium": 0.50, "high": 0.75}
    effective_date = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_by_membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="SET NULL"), nullable=True)
    reason = Column(Text, nullable=True)


class SupportLevelOverride(Base):
    __tablename__ = "support_level_overrides"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    enrollment_id = Column(String(36), ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False, index=True)
    prediction_id = Column(String(36), ForeignKey("student_risk_predictions.id", ondelete="SET NULL"), nullable=True)
    previous_support_level = Column(String(50), nullable=False)
    new_support_level = Column(String(50), nullable=False)  # low, medium, high, urgent
    reason = Column(Text, nullable=False)
    changed_by_membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="CASCADE"), nullable=False)
    changed_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    policy_context = Column(JSON, nullable=True)

    student = relationship("StudentProfile")
    enrollment = relationship("Enrollment")
    prediction = relationship("StudentRiskPrediction")
    changed_by = relationship("InstitutionMembership", foreign_keys=[changed_by_membership_id])


class RiskExplanation(Base):
    __tablename__ = "risk_explanations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    prediction_id = Column(String(36), ForeignKey("student_risk_predictions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    explainer_method = Column(String(50), default="treeshap", nullable=False)  # treeshap, feature_attribution
    model_version = Column(String(50), nullable=False)
    explanation_data = Column(JSON, nullable=False)  # raw attribution dictionary
    top_risk_factors = Column(JSON, nullable=False)  # top drivers increasing risk
    top_protective_factors = Column(JSON, nullable=False)  # top drivers reducing risk
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    prediction = relationship("StudentRiskPrediction", back_populates="explanation")


# =========================================================================
# Module 19: Privacy, Consent, Fairness & Benchmarking (Section 8.J, 8.M, 23, 26, 27)
# =========================================================================

class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(String(36), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    consent_purpose = Column(String(100), nullable=False)  # ai_analytics, academic_monitoring, mentoring_matching
    policy_version = Column(String(50), default="2026.1", nullable=False)
    status = Column(String(50), default="granted", nullable=False)  # granted, withdrawn
    collected_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    withdrawn_at = Column(DateTime(timezone=True), nullable=True)
    provenance = Column(String(255), default="user_settings_portal", nullable=False)

    account = relationship("Account")


class PrivacyRequest(Base):
    __tablename__ = "privacy_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(String(36), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    request_type = Column(String(50), nullable=False)  # export, correction, deletion_inquiry
    status = Column(String(50), default="pending", nullable=False)  # pending, completed, rejected
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    account = relationship("Account")


class ModelEvaluation(Base):
    __tablename__ = "model_evaluations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    model_version_id = Column(String(36), ForeignKey("risk_model_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    evaluation_dataset_reference = Column(String(255), nullable=False)
    metric_set = Column(JSON, nullable=False)  # roc_auc, pr_auc, precision, recall, f1, f2, recall_top20, brier
    cohort_configuration = Column(JSON, nullable=True)
    fairness_metrics = Column(JSON, nullable=True)  # demographic_parity_ratio, disparate_impact_ratio (4/5ths rule)
    evaluated_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    evaluator_membership_id = Column(String(36), ForeignKey("institution_memberships.id", ondelete="SET NULL"), nullable=True)

    model = relationship("RiskModelVersion")


class BenchmarkRun(Base):
    __tablename__ = "benchmark_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    benchmark_dataset = Column(String(100), default="OULAD", nullable=False)
    dataset_version = Column(String(50), default="2015B/2015J", nullable=False)
    mapping_version = Column(String(50), default="oulad_to_empiria_v1", nullable=False)
    model_version = Column(String(50), default="lightgbm_oulad_v1", nullable=False)
    status = Column(String(50), default="completed", nullable=False)  # running, completed, failed
    metrics = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    provenance = Column(Text, nullable=True)


# =========================================================================
# Module 13: Co-Curricular Two-Pathway Engine (Phase 7A)
# =========================================================================

class CoCurricularActivity(Base):
    __tablename__ = "co_curricular_activities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(50), nullable=False)  # sports_athletics, sports_racquet, sports_team, creative_music, creative_dance, esports_gaming, digital_practical_skills
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    supported_modalities = Column(JSON, default=lambda: ["text", "video_upload"], nullable=False)
    default_rubric_id = Column(String(36), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    __table_args__ = (UniqueConstraint("institution_id", "slug", name="uq_activity_slug_per_inst"),)
    institution = relationship("Institution")
    enrollments = relationship("CoCurricularEnrollment", back_populates="activity", cascade="all, delete-orphan")


class CoCurricularEnrollment(Base):
    __tablename__ = "co_curricular_enrollments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_id = Column(String(36), ForeignKey("co_curricular_activities.id", ondelete="RESTRICT"), nullable=False, index=True)
    aspiration_level = Column(String(50), default="recreational", nullable=False)  # recreational, intermediate, competitive, professional
    current_proficiency_level = Column(String(50), default="not_assessed", nullable=False)  # not_assessed, beginner, developing, proficient, advanced
    weekly_hours_target = Column(Float, default=4.0, nullable=False)
    status = Column(String(50), default="active", nullable=False)  # active, paused, archived
    started_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    __table_args__ = (UniqueConstraint("student_id", "activity_id", name="uq_student_activity_enrollment"),)
    student = relationship("StudentProfile")
    activity = relationship("CoCurricularActivity", back_populates="enrollments")
    practice_sessions = relationship("ActivityPracticeSession", back_populates="enrollment", cascade="all, delete-orphan")


class ActivityPracticeSession(Base):
    __tablename__ = "activity_practice_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    enrollment_id = Column(String(36), ForeignKey("co_curricular_enrollments.id", ondelete="CASCADE"), nullable=False, index=True)
    session_type = Column(String(50), default="independent", nullable=False)  # independent, ai_guided, peer_skill_swap, mentor_coached
    duration_minutes = Column(Integer, nullable=False)
    focus_technique = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True)
    self_evaluation_score = Column(Float, nullable=True)
    session_date = Column(Date, default=date.today, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    enrollment = relationship("CoCurricularEnrollment", back_populates="practice_sessions")


class ActivityEvidenceItem(Base):
    __tablename__ = "activity_evidence_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_id = Column(String(36), ForeignKey("co_curricular_activities.id", ondelete="RESTRICT"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    evidence_type = Column(String(50), nullable=False)  # audio_recording, video_clip, motion_pose_data, project_submission, portfolio_link
    storage_uri = Column(String(512), nullable=True)
    storage_checksum_sha256 = Column(String(64), nullable=False)
    evaluation_status = Column(String(50), default="pending", nullable=False)  # pending, ai_assessed, peer_reviewed, coach_verified
    is_private_to_student = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    student = relationship("StudentProfile")
    activity = relationship("CoCurricularActivity")


# =========================================================================
# Module 17: Embedded Skill Swap Peer Engine (Phase 9)
# =========================================================================

class SkillSwapAccount(Base):
    __tablename__ = "skill_swap_accounts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    balance = Column(Integer, default=5, nullable=False)  # Starting discovery credits
    total_earned = Column(Integer, default=0, nullable=False)
    total_spent = Column(Integer, default=0, nullable=False)
    is_frozen = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    student = relationship("StudentProfile")


class SkillSwapListing(Base):
    __tablename__ = "skill_swap_listings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    listing_type = Column(String(20), default="offer", nullable=False)  # offer, request
    skill_name = Column(String(255), nullable=False)
    category = Column(String(50), default="academic", nullable=False)  # academic, music, athletics, digital, language
    proficiency_level = Column(String(50), default="intermediate", nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="active", nullable=False)  # active, paused, fulfilled
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    student = relationship("StudentProfile")


class SkillSwapSession(Base):
    __tablename__ = "skill_swap_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    offering_student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    learning_student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    listing_id = Column(String(36), ForeignKey("skill_swap_listings.id", ondelete="SET NULL"), nullable=True, index=True)
    skill_name = Column(String(255), nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    duration_minutes = Column(Integer, default=60, nullable=False)
    credit_cost = Column(Integer, default=1, nullable=False)
    status = Column(String(50), default="scheduled", nullable=False)  # scheduled, in_progress, completed, cancelled, disputed
    notes = Column(Text, nullable=True)
    rating_score = Column(Float, nullable=True)
    feedback_text = Column(Text, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    offering_student = relationship("StudentProfile", foreign_keys=[offering_student_id])
    learning_student = relationship("StudentProfile", foreign_keys=[learning_student_id])
    listing = relationship("SkillSwapListing")


class SkillSwapTransaction(Base):
    __tablename__ = "skill_swap_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_account_id = Column(String(36), ForeignKey("skill_swap_accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    receiver_account_id = Column(String(36), ForeignKey("skill_swap_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)
    session_id = Column(String(36), ForeignKey("skill_swap_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    transaction_type = Column(String(50), nullable=False)  # session_completion, dispute_refund, promotional_grant
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    sender_account = relationship("SkillSwapAccount", foreign_keys=[sender_account_id])
    receiver_account = relationship("SkillSwapAccount", foreign_keys=[receiver_account_id])
    session = relationship("SkillSwapSession")


# =========================================================================
# Module 18: Career Intelligence & ESCO / O*NET Taxonomy (Phase 10)
# =========================================================================

class CareerOccupation(Base):
    __tablename__ = "career_occupations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(50), nullable=False)  # e.g. ESCO-2512.1, ONET-15-1252.00
    title = Column(String(255), nullable=False)
    taxonomy = Column(String(50), default="ESCO", nullable=False)  # ESCO, O*NET
    industry_sector = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    required_skills = Column(JSON, nullable=False)  # list of {"skill_key": str, "name": str, "weight": float, "target_level": float}
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    __table_args__ = (UniqueConstraint("institution_id", "code", name="uq_occupation_inst_code"),)


class StudentCareerGoal(Base):
    __tablename__ = "student_career_goals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    occupation_id = Column(String(36), ForeignKey("career_occupations.id", ondelete="CASCADE"), nullable=False, index=True)
    priority = Column(String(20), default="primary", nullable=False)  # primary, secondary
    target_graduation_date = Column(Date, nullable=True)
    status = Column(String(50), default="active", nullable=False)  # active, achieved, paused
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    student = relationship("StudentProfile")
    occupation = relationship("CareerOccupation")

    __table_args__ = (UniqueConstraint("student_id", "occupation_id", name="uq_student_career_goal"),)


# =========================================================================
# Module 20: Multimodal AI Learning Studio Engine (Phase 11)
# =========================================================================

class MultimodalStudioSession(Base):
    __tablename__ = "multimodal_studio_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_id = Column(String(36), ForeignKey("co_curricular_activities.id", ondelete="SET NULL"), nullable=True, index=True)
    modality = Column(String(50), nullable=False)  # audio_vocal, video_motion, code_ast
    goal_description = Column(String(255), nullable=False)
    starting_level = Column(String(50), default="intermediate", nullable=False)
    current_step = Column(Integer, default=1, nullable=False)  # 1 to 6
    status = Column(String(50), default="active", nullable=False)  # active, completed, referred_to_human
    raw_stream_persisted = Column(Boolean, default=False, nullable=False)  # transient processing default
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    student = relationship("StudentProfile")
    activity = relationship("CoCurricularActivity")
    steps = relationship("MultimodalAssessmentStep", back_populates="session", cascade="all, delete-orphan")


class MultimodalAssessmentStep(Base):
    __tablename__ = "multimodal_assessment_steps"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("multimodal_studio_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    step_number = Column(Integer, nullable=False)  # 1 to 6
    exercise_prompt = Column(Text, nullable=False)
    extracted_features = Column(JSON, nullable=True)  # pitch deviations, joint angles, AST complexity
    rubric_scores = Column(JSON, nullable=True)  # metric: score
    confidence_metric = Column(Float, default=0.9, nullable=False)  # 0.0 to 1.0
    uncertainty_flag = Column(String(100), nullable=True)  # high_noise, occlusion, ambiguous
    feedback_instruction = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    session = relationship("MultimodalStudioSession", back_populates="steps")





