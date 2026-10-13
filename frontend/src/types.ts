export type UserRole =
  | 'super_admin'
  | 'institution_admin'
  | 'institution_data_operator'
  | 'faculty'
  | 'mentor'
  | 'student'

export interface Account {
  id: string
  email: string
  first_name?: string
  last_name?: string
  display_name?: string
  account_type?: string
  status?: string
  is_super_admin?: boolean
  is_active?: boolean
}

export interface MembershipRole {
  role: UserRole
  scope_type: string
  scope_id: string | null
}

export interface ActiveMembership {
  id: string
  institution_id: string
  institution_name: string
  institution_slug: string
  status: string
  roles: UserRole[]
  all_roles: MembershipRole[]
}

export interface AuthSessionResponse {
  authenticated: boolean
  account?: Account
  active_membership?: ActiveMembership
  available_memberships?: ActiveMembership[]
  csrf_token?: string
  is_super_admin?: boolean
}

export interface CompetencyLevel {
  level_number: number
  name: string
  description: string
  target_score: number
}

export interface Competency {
  id: string
  key: string
  name: string
  domain: string
  target_level: number
  description: string
  levels: CompetencyLevel[]
}

export interface FrameworkVersion {
  id: string
  framework_id: string
  version_number: number
  status: string
  published_at?: string
  competencies: Competency[]
}

export interface Framework {
  id: string
  key: string
  name: string
  current_version: FrameworkVersion
}

export interface AssessmentItemOption {
  id?: string
  option_key: string
  option_text?: string
  text_content?: string
}

export interface AssessmentItem {
  id: string
  code: string
  prompt: string
  item_type: string
  max_score: number
  competency_id: string
  competency_name?: string
  options: AssessmentItemOption[]
}

export interface AssessmentForm {
  id: string
  code: string
  title: string
  assessment_type: 'baseline' | 'follow_up' | 'standard'
  status: string
  items: AssessmentItem[]
}

export interface AssessmentResultItem {
  competency_id: string
  competency_name: string
  score: number
  max_score: number
  percentage: number
}

export interface AssessmentResult {
  id: string
  attempt_id: string
  total_score: number
  max_possible_score: number
  percentage: number
  assessed_at: string
  competencies: AssessmentResultItem[]
}

export interface DeterminationItem {
  competency_id: string
  competency_name: string
  level_number: number
  level_name: string
  evidence_sufficiency: 'sufficient' | 'insufficient' | 'missing' | 'stale'
}

export interface DiagnosisFindingItem {
  competency_id: string
  competency_key: string
  competency_name: string
  finding_type: 'gap' | 'target_met' | 'insufficient_evidence' | 'unassessed'
  current_level: number
  target_level: number
  detailed_explanation: string
  recommended_action: string
  mandatory_limitations: string
}

export interface DiagnosisResponse {
  run_id: string
  computed_at: string
  rule_version: string
  determinations: DeterminationItem[]
  findings: DiagnosisFindingItem[]
}

export interface ActivityResource {
  title: string
  url: string
  resource_type: string
}

export interface Activity {
  id: string
  key: string
  title: string
  description: string
  activity_type: string
  completion_criteria: string
  evaluation_method: string
  estimated_duration_hours: number
  target_competencies: { competency_id: string; competency_name: string }[]
  resources: ActivityResource[]
}

export interface PlanTask {
  id: string
  activity_id: string
  activity: Activity
  priority: number
  status: 'pending' | 'in_progress' | 'submitted' | 'completed'
  target_completion_date?: string
  recommendation_rationale: string
  submission_text?: string
}

export interface DevelopmentPlan {
  id: string
  student_id: string
  version_number: number
  status: string
  tasks: PlanTask[]
}

export interface ProgressComparison {
  id: string
  competency_id: string
  competency_name: string
  baseline_score: number
  follow_up_score: number
  score_delta: number
  comparability_state: string
  outcome_status: 'improved' | 'unchanged' | 'regressed' | 'inconclusive'
  mandatory_limitations: string
  created_at: string
}

export interface ProgressSummary {
  student_id: string
  baseline_date?: string
  follow_up_date?: string
  comparisons: ProgressComparison[]
  has_follow_up: boolean
  overall_status_narrative: string
}

export interface SupportRequest {
  id: string
  student_id: string
  student_name: string
  student_email: string
  subject: string
  message: string
  status: string
  created_at: string
  interventions: {
    id: string
    intervention_date: string
    agreed_actions: string
    follow_up_date?: string
    notes?: string
    actor_name: string
  }[]
}

export interface StudentProfile {
  id: string
  account_id?: string
  student_identifier: string
  first_name: string
  last_name: string
  email: string
  status: string
  cohort_name?: string
  created_at: string
}

export interface ImportIssue {
  row_number: number
  field_name?: string
  severity: string
  code: string
  message: string
}

export interface ImportJob {
  id: string
  import_type: string
  status: 'pending' | 'validating' | 'validated' | 'validation_failed' | 'committed' | 'failed'
  total_rows: number
  valid_rows: number
  error_rows: number
  created_at: string
}

export interface ImportPreview {
  job: ImportJob
  sample_rows: { row_number: number; is_valid: boolean; data: Record<string, string> }[]
  issues: ImportIssue[]
}

export interface InstitutionalReport {
  institution_name: string
  cohort_count: number
  student_count: number
  baseline_completed_count: number
  follow_up_completed_count: number
  privacy_threshold_applied: boolean
  competency_averages: {
    competency_key: string
    competency_name: string
    baseline_average: number
    follow_up_average: number
    mean_delta: number
    students_measured: number
  }[]
  limitations_and_safeguards: string[]
}

// Mentorship
export interface MentorAssignment {
  id: string
  institution_id: string
  student_id: string
  student_name: string
  student_email: string
  mentor_membership_id: string
  mentor_account_id: string
  mentor_name: string
  mentor_email: string
  assignment_type: 'primary' | 'subject'
  subject_scope?: string
  framework_competency_id?: string
  status: 'active' | 'ended' | 'replaced'
  reason?: string
  assigned_at: string
  ended_at?: string
}

export interface AvailableMentor {
  membership_id: string
  account_id: string
  name: string
  email: string
  roles: string[]
}

export interface MyMentorItem {
  assignment_id: string
  membership_id: string
  name: string
  email: string
  assignment_type: 'primary' | 'subject'
  subject_scope?: string
  status: string
  assigned_at: string
  ended_at?: string
}

export interface MyMentorsResponse {
  student_profile_id: string
  student_name: string
  primary_mentor?: MyMentorItem | null
  subject_mentors: MyMentorItem[]
  assignment_history: MyMentorItem[]
}

// Conversations & Messaging
export interface ConversationMessage {
  id: string
  conversation_id: string
  sender_membership_id: string
  sender_name: string
  sender_role: string
  body: string
  created_at: string
}

export interface ConversationParticipant {
  id: string
  membership_id: string
  name: string
  email: string
  participant_kind: string
  status: string
  joined_at: string
  last_read_at?: string
}

export interface ConversationSummary {
  id: string
  institution_id: string
  student_profile_id: string
  student_name: string
  conversation_kind: string
  subject: string
  subject_scope?: string
  status: 'open' | 'awaiting_response' | 'resolved' | 'reopened'
  last_message_at: string
  created_at: string
  updated_at: string
  unread_messages: number
  latest_message?: string
  other_party_name: string
}

export interface ConversationDetail {
  id: string
  institution_id: string
  student_profile_id: string
  student_name: string
  student_email: string
  conversation_kind: string
  subject: string
  subject_scope?: string
  status: 'open' | 'awaiting_response' | 'resolved' | 'reopened'
  last_message_at: string
  created_at: string
  resolved_at?: string
  participants: ConversationParticipant[]
  messages: ConversationMessage[]
}

// Notifications
export interface NotificationItem {
  id: string
  institution_id: string
  notification_type: string
  conversation_id?: string
  message_id?: string
  title: string
  is_read: boolean
  read_at?: string
  created_at: string
}

export interface NotificationListResponse {
  unread_count: number
  notifications: NotificationItem[]
}

// Institutional Applications
export interface InstitutionApplication {
  id: string
  institution_name: string
  representative_name: string
  representative_email: string
  verification_summary: string
  status: string
  reviewed_at?: string
  decision_reason?: string
  created_at: string
}

// Phase 2: Licences & Governance
export interface Licence {
  id: string
  institution_id: string
  institution_name?: string
  plan_tier: string
  status: string
  max_students: number
  max_mentors: number
  permitted_features: string[]
  starts_at: string
  expires_at: string
  created_at: string
  updated_at: string
  current_students: number
  current_mentors: number
  days_until_expiry: number
  student_usage_pct: number
  mentor_usage_pct: number
}

export interface LicenceEvent {
  id: string
  licence_id: string
  institution_id: string
  actor_account_id?: string
  event_type: string
  before_state?: any
  after_state?: any
  reason?: string
  occurred_at: string
}

export interface InstitutionDetail {
  id: string
  slug: string
  name: string
  status: string
  approved_at?: string
  approved_by_account_id?: string
  created_at: string
  updated_at: string
  student_count: number
  mentor_count: number
  department_count: number
  admin_accounts: Array<{
    membership_id: string
    account_id: string
    email: string
    display_name: string
    status: string
    created_at?: string
  }>
  active_licence?: Licence
  settings?: {
    display_name: string
    locale: string
    min_cohort_threshold: number
  }
}

export interface InstitutionStatusHistoryItem {
  id: string
  institution_id: string
  previous_status: string
  new_status: string
  reason?: string
  changed_by_account_id?: string
  occurred_at: string
}

export interface PlatformUser {
  id: string
  email: string
  display_name: string
  status: string
  is_super_admin: boolean
  email_verified_at?: string
  created_at: string
  last_login_at?: string
  memberships: Array<{
    institution_id: string
    institution_name: string
    status: string
    roles: string[]
  }>
}

export interface OperationsHealth {
  status: string
  liveness: boolean
  readiness: boolean
  database_latency_ms: number
  database_pool_status: string
  disk_status: string
  checked_at: string
}

export interface BackgroundJobItem {
  id: string
  job_type: string
  institution_id?: string
  status: string
  started_at: string
  completed_at?: string
  duration_seconds?: number
  details?: string
}

export interface BackgroundJobSummary {
  total_jobs: number
  running_jobs: number
  completed_jobs: number
  failed_jobs: number
  recent_jobs: BackgroundJobItem[]
}

export interface SystemErrorItem {
  id: string
  error_type: string
  severity: string
  message: string
  occurred_at: string
  context?: any
}

export interface PlatformKPISummary {
  total_institutions: number
  active_institutions: number
  suspended_institutions: number
  institutions_requiring_attention: number
  total_students: number
  total_mentors: number
  active_licences: number
  expiring_licences: number
  total_applications: number
  pending_applications: number
  total_audit_events_24h: number
  system_health_status: string
}

export interface GlobalSecurityPolicies {
  min_password_length: number
  require_special_char: boolean
  session_timeout_minutes: number
  mfa_enforced_for_admins: boolean
  max_failed_logins_before_lockout: number
}

export interface NotificationConfig {
  smtp_enabled: boolean
  smtp_host: string
  smtp_port: number
  sender_email: string
  alerts_email: string
  notifications_enabled: boolean
}

