from datetime import datetime, date
from typing import Any, Optional
from pydantic import BaseModel, EmailStr, Field, computed_field


# =========================================================================
# Common / Auth
# =========================================================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AccountResponse(BaseModel):
    id: str
    email: str
    display_name: str
    status: str
    is_super_admin: bool
    email_verified_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @computed_field
    @property
    def account_type(self) -> str:
        return "super_admin" if self.is_super_admin else "user"

    @computed_field
    @property
    def first_name(self) -> str:
        parts = self.display_name.strip().split(" ", 1)
        return parts[0] if parts else ""

    @computed_field
    @property
    def last_name(self) -> str:
        parts = self.display_name.strip().split(" ", 1)
        return parts[1] if len(parts) > 1 else ""


class MembershipRoleResponse(BaseModel):
    id: str
    role: str
    granted_at: datetime

    class Config:
        from_attributes = True


class MembershipSummaryResponse(BaseModel):
    id: str
    institution_id: str
    institution_name: str
    institution_slug: str
    status: str
    roles: list[str]

    class Config:
        from_attributes = True


class SessionResponse(BaseModel):
    authenticated: bool
    account: Optional[AccountResponse] = None
    active_membership: Optional[MembershipSummaryResponse] = None
    available_memberships: list[MembershipSummaryResponse] = []
    csrf_token: Optional[str] = None
    session_token: Optional[str] = None
    is_super_admin: bool = False


class SwitchMembershipRequest(BaseModel):
    membership_id: str


class EmailVerificationConfirmRequest(BaseModel):
    token: str


class CredentialRecoveryRequest(BaseModel):
    email: EmailStr


class CredentialRecoveryConfirmRequest(BaseModel):
    token: str
    new_password: str


class InvitationCreateRequest(BaseModel):
    email: EmailStr
    role: str
    institution_id: Optional[str] = None


class InvitationAcceptRequest(BaseModel):
    token: str
    first_name: str
    last_name: str
    password: str


class InvitationResponse(BaseModel):
    id: str
    institution_id: str
    email: str
    role: str
    status: str
    expires_at: datetime
    token: Optional[str] = None

    class Config:
        from_attributes = True


# =========================================================================
# Platform & Institution Management
# =========================================================================

class InstitutionApplicationCreate(BaseModel):
    institution_name: str
    representative_name: str
    representative_email: EmailStr
    verification_summary: str


class InstitutionApplicationResponse(BaseModel):
    id: str
    institution_name: str
    representative_name: str
    representative_email: str
    verification_summary: str
    status: str
    reviewed_at: Optional[datetime] = None
    decision_reason: Optional[str] = None
    created_institution_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ApplicationReviewRequest(BaseModel):
    decision: str  # approved, rejected
    reason: Optional[str] = None


class ExceptionalAccessRequest(BaseModel):
    institution_id: str
    purpose: str
    target_scope: str
    allowed_actions: list[str]
    duration_hours: int = 24


class ExceptionalAccessDecisionRequest(BaseModel):
    decision: str  # approved, rejected
    notes: Optional[str] = None


class ExceptionalAccessResponse(BaseModel):
    id: str
    institution_id: str
    requester_account_id: str
    purpose: str
    target_scope: str
    allowed_actions: list[str]
    status: str
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InstitutionSettingsSummaryResponse(BaseModel):
    display_name: Optional[str] = None
    locale: Optional[str] = "en"
    min_cohort_threshold: Optional[int] = 5

    class Config:
        from_attributes = True


class InstitutionResponse(BaseModel):
    id: str
    slug: str
    name: str
    status: str
    created_at: datetime
    settings: Optional[InstitutionSettingsSummaryResponse] = None

    class Config:
        from_attributes = True


class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    branding: Optional[dict[str, Any]] = None
    min_cohort_threshold: Optional[int] = None


class OrgNodeCreate(BaseModel):
    name: str
    node_type: str  # campus, department, branch
    parent_id: Optional[str] = None


class OrgNodeResponse(BaseModel):
    id: str
    name: str
    node_type: str
    parent_id: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ProgrammeCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    org_node_id: Optional[str] = None


class ProgrammeResponse(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CohortCreate(BaseModel):
    name: str
    programme_id: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class CohortResponse(BaseModel):
    id: str
    name: str
    programme_id: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    student_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class InvitationCreate(BaseModel):
    email: EmailStr
    role: str
    roster_student_id: Optional[str] = None


class ScopeAssignmentCreate(BaseModel):
    membership_id: str
    purpose: str
    scope_type: str
    scope_id: Optional[str] = None


# =========================================================================
# Students & CSV Imports
# =========================================================================

class StudentProfileCreate(BaseModel):
    student_identifier: str
    first_name: str
    last_name: str
    email: EmailStr
    cohort_id: Optional[str] = None


class StudentProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    status: Optional[str] = None
    reason: str = "Profile update"


class StudentProfileResponse(BaseModel):
    id: str
    student_identifier: str
    first_name: str
    last_name: str
    email: str
    status: str
    cohort_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ImportJobCreate(BaseModel):
    import_type: str = "students"
    template_version: str = "1.0"
    idempotency_key: str


class ImportJobResponse(BaseModel):
    id: str
    import_type: str
    template_version: str
    status: str
    total_rows: int
    valid_rows: int
    error_rows: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ImportPreviewResponse(BaseModel):
    job_id: str
    status: str
    total_rows: int
    valid_rows: int
    error_rows: int
    sample_rows: list[dict[str, Any]]
    issues: list[dict[str, Any]]


class ImportIssueResponse(BaseModel):
    row_number: Optional[int]
    field_name: Optional[str]
    severity: str
    code: str
    message: str


# =========================================================================
# Frameworks
# =========================================================================

class CompetencyLevelResponse(BaseModel):
    id: str
    level_code: str
    rank: int
    label: str
    descriptor: str

    class Config:
        from_attributes = True


class CompetencyThresholdResponse(BaseModel):
    level_rank: int
    level_code: str
    required_method: str
    min_evidence_count: int
    min_score: Optional[float] = None


class FrameworkCompetencyResponse(BaseModel):
    id: str
    competency_key: str
    name: str
    description: str
    guidance: Optional[str] = None
    display_order: int
    levels: list[CompetencyLevelResponse] = []

    class Config:
        from_attributes = True


class FrameworkVersionResponse(BaseModel):
    id: str
    framework_id: str
    version_number: int
    rule_set_version: str
    status: str
    published_at: Optional[datetime] = None
    competencies: list[FrameworkCompetencyResponse] = []

    class Config:
        from_attributes = True


class CompetencyFrameworkResponse(BaseModel):
    id: str
    key: str
    name: str
    description: Optional[str] = None
    current_version: Optional[FrameworkVersionResponse] = None
    versions: list[dict[str, Any]] = []

    class Config:
        from_attributes = True


# =========================================================================
# Assessments & Delivery
# =========================================================================

class AssessmentItemOptionResponse(BaseModel):
    option_key: str
    option_text: str
    display_order: int

    class Config:
        from_attributes = True


class AssessmentItemStudentResponse(BaseModel):
    id: str
    competency_id: str
    code: str
    prompt: str
    item_type: str
    points: float
    options: list[AssessmentItemOptionResponse] = []


class AssessmentFormStudentResponse(BaseModel):
    id: str
    code: str
    title: str
    description: Optional[str] = None
    assessment_type: str
    time_limit_minutes: Optional[int] = None
    items: list[AssessmentItemStudentResponse] = []


class AssessmentFormAuthoringResponse(BaseModel):
    id: str
    code: str
    title: str
    description: Optional[str] = None
    assessment_type: str
    status: str
    comparability_state: str
    comparability_note: Optional[str] = None
    items: list[dict[str, Any]] = []


class AssessmentAttemptResponse(BaseModel):
    id: str
    student_id: str
    form_id: str
    form_title: str
    attempt_number: int
    status: str
    started_at: datetime
    submitted_at: Optional[datetime] = None


class AssessmentSubmitRequest(BaseModel):
    responses: dict[str, Any]  # item_id -> response_data (e.g. option_key)


class ResultCompetencyResponse(BaseModel):
    competency_id: str
    competency_name: str
    score: float
    max_score: float
    percentage: float
    notes: Optional[str] = None


class AssessmentResultResponse(BaseModel):
    id: str
    student_id: str
    framework_version_id: str
    source_type: str
    total_score: Optional[float] = None
    max_possible_score: Optional[float] = None
    percentage: Optional[float] = None
    assessed_at: datetime
    status: str
    competencies: list[ResultCompetencyResponse] = []


# =========================================================================
# Determinations & Diagnosis
# =========================================================================

class CompetencyDeterminationResponse(BaseModel):
    competency_id: str
    competency_name: str
    competency_key: str
    supported_level_rank: Optional[int] = None
    supported_level_code: Optional[str] = None
    supported_level_label: Optional[str] = None
    evidence_sufficiency: str  # sufficient, insufficient, no_evidence, stale, conflicting
    reason_codes: list[str]
    explanation_text: str


class DiagnosisFindingResponse(BaseModel):
    id: str
    competency_id: str
    competency_name: str
    competency_key: str
    finding_type: str  # gap, target_met, insufficient_evidence
    current_level_rank: Optional[int] = None
    current_level_code: Optional[str] = None
    current_level_label: Optional[str] = None
    target_level_rank: Optional[int] = None
    target_level_code: Optional[str] = None
    target_level_label: Optional[str] = None
    rationale_code: str
    finding_summary: str
    detailed_explanation: str
    recommended_action: str


class DiagnosisResponse(BaseModel):
    id: str
    student_id: str
    determination_run_id: str
    rule_version: str
    template_version: str
    created_at: datetime
    determinations: list[CompetencyDeterminationResponse] = []
    findings: list[DiagnosisFindingResponse] = []


# =========================================================================
# Development Plans & Practice
# =========================================================================

class ActivityResourceResponse(BaseModel):
    title: str
    url: str
    resource_type: str


class ActivityResponse(BaseModel):
    id: str
    key: str
    title: str
    description: str
    activity_type: str
    completion_criteria: str
    evaluation_method: str
    estimated_duration_hours: float
    target_competencies: list[dict[str, Any]] = []
    resources: list[ActivityResourceResponse] = []


class PlanTaskResponse(BaseModel):
    id: str
    competency_id: str
    competency_name: str
    title: str
    description: str
    completion_criteria: str
    recommendation_rationale: str
    status: str  # pending, in_progress, submitted, completed
    priority: int
    due_date: Optional[date] = None
    activity: Optional[ActivityResponse] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class DevelopmentPlanResponse(BaseModel):
    id: str
    student_id: str
    status: str
    version_number: int
    rule_version: str
    created_at: datetime
    tasks: list[PlanTaskResponse] = []


class TaskSubmitRequest(BaseModel):
    submission_text: Optional[str] = None
    stored_object_id: Optional[str] = None


# =========================================================================
# Follow-up Verification & Progress
# =========================================================================

class ProgressComparisonResponse(BaseModel):
    id: str
    competency_id: str
    competency_name: str
    baseline_score: float
    follow_up_score: float
    score_delta: float
    comparability_state: str
    outcome_status: str  # improved, unchanged, regressed, inconclusive
    mandatory_limitations: str
    created_at: datetime


class ProgressSummaryResponse(BaseModel):
    student_id: str
    baseline_date: Optional[datetime] = None
    follow_up_date: Optional[datetime] = None
    comparisons: list[ProgressComparisonResponse] = []
    has_follow_up: bool = False
    overall_status_narrative: str


# =========================================================================
# Support & Interventions
# =========================================================================

class SupportRequestCreate(BaseModel):
    subject: str
    message: str


class SupportRequestResponse(BaseModel):
    id: str
    student_id: str
    student_name: str
    subject: str
    message: str
    status: str
    created_at: datetime
    updated_at: datetime


class InterventionCreate(BaseModel):
    intervention_date: date
    agreed_actions: str
    follow_up_date: Optional[date] = None
    notes: Optional[str] = None


class InterventionResponse(BaseModel):
    id: str
    student_id: str
    responsible_staff_name: str
    intervention_date: date
    agreed_actions: str
    follow_up_date: Optional[date] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime


# =========================================================================
# Reports & Audit
# =========================================================================

class OperationalOverviewResponse(BaseModel):
    total_students: int
    active_students: int
    baseline_attempts_completed: int
    development_plans_generated: int
    practice_tasks_completed: int
    follow_up_assessments_completed: int
    support_requests_count: int


class CompetencyOutcomeItem(BaseModel):
    competency_name: str
    baseline_average: Optional[float] = None
    follow_up_average: Optional[float] = None
    average_delta: Optional[float] = None
    students_measured: int
    outcome_distribution: dict[str, int]


class OutcomesReportResponse(BaseModel):
    cohort_size: int
    is_suppressed: bool
    suppression_threshold: int
    suppression_message: Optional[str] = None
    competency_outcomes: list[CompetencyOutcomeItem] = []
    evaluation_limitations: str


# =========================================================================
# Module 20: Platform Super Admin & Licence Lifecycle (Phase 2)
# =========================================================================

class LicenceCreateRequest(BaseModel):
    institution_id: str
    plan_tier: str = "standard"  # starter, standard, professional, enterprise
    max_students: int = 500
    max_mentors: int = 50
    permitted_features: list[str] = [
        "basic_analytics",
        "attendance_tracking",
        "mentor_matching",
        "academic_interventions",
        "ai_risk_scoring",
    ]
    duration_days: int = 365


class LicenceModifyRequest(BaseModel):
    plan_tier: Optional[str] = None
    max_students: Optional[int] = None
    max_mentors: Optional[int] = None
    permitted_features: Optional[list[str]] = None
    reason: Optional[str] = None


class LicenceRenewRequest(BaseModel):
    extend_days: int = 365
    reason: Optional[str] = None


class LicenceActionRequest(BaseModel):
    reason: Optional[str] = None


class LicenceResponse(BaseModel):
    id: str
    institution_id: str
    institution_name: Optional[str] = None
    plan_tier: str
    status: str
    max_students: int
    max_mentors: int
    permitted_features: list[str] = []
    starts_at: datetime
    expires_at: datetime
    created_at: datetime
    updated_at: datetime
    current_students: int = 0
    current_mentors: int = 0
    days_until_expiry: int = 0
    student_usage_pct: float = 0.0
    mentor_usage_pct: float = 0.0

    class Config:
        from_attributes = True


class LicenceEventResponse(BaseModel):
    id: str
    licence_id: str
    institution_id: str
    actor_account_id: Optional[str] = None
    event_type: str
    before_state: Optional[dict[str, Any]] = None
    after_state: Optional[dict[str, Any]] = None
    reason: Optional[str] = None
    occurred_at: datetime

    class Config:
        from_attributes = True


class InstitutionStatusChangeRequest(BaseModel):
    status: str  # active, suspended, reactivated
    reason: Optional[str] = None


class InstitutionStatusHistoryResponse(BaseModel):
    id: str
    institution_id: str
    previous_status: str
    new_status: str
    reason: Optional[str] = None
    changed_by_account_id: Optional[str] = None
    occurred_at: datetime

    class Config:
        from_attributes = True


class InstitutionDetailResponse(BaseModel):
    id: str
    slug: str
    name: str
    status: str
    approved_at: Optional[datetime] = None
    approved_by_account_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    student_count: int = 0
    mentor_count: int = 0
    department_count: int = 0
    admin_accounts: list[dict[str, Any]] = []
    active_licence: Optional[LicenceResponse] = None
    settings: Optional[dict[str, Any]] = None

    class Config:
        from_attributes = True


class PlatformUserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    status: str
    is_super_admin: bool
    email_verified_at: Optional[datetime] = None
    created_at: datetime
    last_login_at: Optional[datetime] = None
    memberships: list[dict[str, Any]] = []

    class Config:
        from_attributes = True


class SuperAdminRoleToggleRequest(BaseModel):
    is_super_admin: bool
    reason: Optional[str] = None


class UserStatusChangeRequest(BaseModel):
    status: str  # active, suspended, deactivated
    reason: Optional[str] = None


class UserAccessHistoryResponse(BaseModel):
    user_id: str
    sessions: list[dict[str, Any]] = []
    audit_events: list[dict[str, Any]] = []


class OperationsHealthResponse(BaseModel):
    status: str
    liveness: bool
    readiness: bool
    database_latency_ms: float
    database_pool_status: str
    disk_status: str
    checked_at: datetime


class BackgroundJobItem(BaseModel):
    id: str
    job_type: str
    institution_id: Optional[str] = None
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    details: Optional[str] = None


class BackgroundJobSummaryResponse(BaseModel):
    total_jobs: int
    running_jobs: int
    completed_jobs: int
    failed_jobs: int
    recent_jobs: list[BackgroundJobItem] = []


class SystemErrorItem(BaseModel):
    id: str
    error_type: str
    severity: str
    message: str
    occurred_at: datetime
    context: Optional[dict[str, Any]] = None


class SystemErrorsResponse(BaseModel):
    active_alerts_count: int
    errors: list[SystemErrorItem] = []


class IntegrationHealthResponse(BaseModel):
    email_service: dict[str, Any]
    database: dict[str, Any]
    ml_engine: dict[str, Any]
    object_storage: dict[str, Any]


class PlatformKPIResponse(BaseModel):
    total_institutions: int
    active_institutions: int
    suspended_institutions: int
    institutions_requiring_attention: int
    total_students: int
    total_mentors: int
    active_licences: int
    expiring_licences: int
    total_applications: int
    pending_applications: int
    total_audit_events_24h: int
    system_health_status: str


class GlobalSecurityPolicies(BaseModel):
    min_password_length: int = 10
    require_special_char: bool = True
    session_timeout_minutes: int = 120
    mfa_enforced_for_admins: bool = False
    max_failed_logins_before_lockout: int = 5


class NotificationConfig(BaseModel):
    smtp_enabled: bool = False
    smtp_host: str = "smtp.internal"
    smtp_port: int = 587
    sender_email: str = "notifications@empiria.internal"
    alerts_email: str = "ops-alerts@empiria.internal"
    notifications_enabled: bool = True


class PlatformStandards(BaseModel):
    compliance_frameworks: list[str] = ["FERPA", "GDPR", "ISO-27001"]
    data_retention_days: int = 2555
    audit_chain_hashing: str = "SHA256"
    encryption_algorithm: str = "AES-256-GCM"
