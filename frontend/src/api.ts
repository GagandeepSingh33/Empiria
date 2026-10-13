import type {
  AuthSessionResponse,
  Framework,
  AssessmentForm,
  AssessmentResult,
  DiagnosisResponse,
  DevelopmentPlan,
  PlanTask,
  ProgressSummary,
  SupportRequest,
  StudentProfile,
  ImportJob,
  ImportPreview,
  InstitutionalReport,
  MentorAssignment,
  AvailableMentor,
  MyMentorsResponse,
  ConversationSummary,
  ConversationDetail,
  ConversationMessage,
  NotificationListResponse,
  NotificationItem,
  InstitutionApplication,
} from './types'

let inMemoryCsrfToken: string | null = null

export function setCsrfToken(token: string | null) {
  inMemoryCsrfToken = token
}

export function getCsrfToken(): string | null {
  return inMemoryCsrfToken
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`
  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  // Attach CSRF token on state-changing requests
  const method = (options.method || 'GET').toUpperCase()
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && inMemoryCsrfToken) {
    headers.set('X-CSRF-Token', inMemoryCsrfToken)
  }

  const res = await fetch(fullUrl, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`
    try {
      const errJson = await res.json()
      if (errJson && errJson.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail)
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorDetail)
  }

  return res.json() as Promise<T>
}

export const api = {
  // Authentication & Session
  async getSession(): Promise<AuthSessionResponse> {
    try {
      const res = await request<AuthSessionResponse>('/internal/v1/auth/session')
      if (res.csrf_token) {
        setCsrfToken(res.csrf_token)
      }
      return res
    } catch {
      return { authenticated: false }
    }
  },

  async login(email: string, password: string): Promise<AuthSessionResponse> {
    const res = await request<AuthSessionResponse>('/internal/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (res.csrf_token) {
      setCsrfToken(res.csrf_token)
    }
    return res
  },

  async logout(): Promise<{ message: string }> {
    const res = await request<{ message: string }>('/internal/v1/auth/logout', {
      method: 'POST',
    })
    setCsrfToken(null)
    return res
  },

  // Competency Frameworks
  async getFrameworks(): Promise<Framework[]> {
    return request<Framework[]>('/internal/v1/competency-frameworks')
  },

  // Assessments
  async getAssessmentForms(): Promise<AssessmentForm[]> {
    return request<AssessmentForm[]>('/internal/v1/assessment-forms')
  },

  async getAssessmentFormDetail(formId: string): Promise<AssessmentForm> {
    return request<AssessmentForm>(`/internal/v1/assessment-forms/${formId}`)
  },

  async startAssessmentAttempt(formId: string): Promise<{ id: string; form_id: string; attempt_number: number }> {
    return request<{ id: string; form_id: string; attempt_number: number }>(
      `/internal/v1/assessment-forms/${formId}/attempts`,
      { method: 'POST' }
    )
  },

  async submitAssessmentAttempt(
    attemptId: string,
    responses: Record<string, string>
  ): Promise<AssessmentResult> {
    return request<AssessmentResult>(`/internal/v1/assessment-attempts/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ responses }),
    })
  },

  // Diagnosis
  async getStudentDiagnosis(studentId: string): Promise<DiagnosisResponse> {
    return request<DiagnosisResponse>(`/internal/v1/students/${studentId}/diagnosis`)
  },

  // Development Plans & Practice Tasks
  async getMyDevelopmentPlan(): Promise<DevelopmentPlan> {
    return request<DevelopmentPlan>('/internal/v1/me/development-plan')
  },

  async startPlanTask(taskId: string): Promise<PlanTask> {
    return request<PlanTask>(`/internal/v1/plan-tasks/${taskId}/start`, { method: 'POST' })
  },

  async submitPlanTaskWork(taskId: string, submissionText: string): Promise<PlanTask> {
    return request<PlanTask>(`/internal/v1/plan-tasks/${taskId}/submissions`, {
      method: 'POST',
      body: JSON.stringify({ submission_text: submissionText }),
    })
  },

  async completePlanTask(taskId: string): Promise<PlanTask> {
    return request<PlanTask>(`/internal/v1/plan-tasks/${taskId}/complete`, { method: 'POST' })
  },

  // Progress Verification
  async getStudentProgress(studentId: string): Promise<ProgressSummary> {
    return request<ProgressSummary>(`/internal/v1/students/${studentId}/progress`)
  },

  // Support Requests & Interventions
  async submitSupportRequest(subject: string, message: string): Promise<SupportRequest> {
    return request<SupportRequest>('/internal/v1/support-requests', {
      method: 'POST',
      body: JSON.stringify({ subject, message }),
    })
  },

  async listSupportRequests(): Promise<SupportRequest[]> {
    return request<SupportRequest[]>('/internal/v1/support-requests')
  },

  async recordIntervention(
    requestId: string,
    payload: {
      intervention_date: string
      agreed_actions: string
      follow_up_date?: string
      notes?: string
    }
  ): Promise<{ message: string; intervention_id: string }> {
    return request<{ message: string; intervention_id: string }>(
      `/internal/v1/support-requests/${requestId}/interventions`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )
  },

  // Institutional Management & Roster CSV Import
  async listStudents(): Promise<StudentProfile[]> {
    return request<StudentProfile[]>('/internal/v1/students')
  },

  async createImportJob(idempotencyKey: string, importType: string = 'students'): Promise<ImportJob> {
    return request<ImportJob>('/internal/v1/imports', {
      method: 'POST',
      body: JSON.stringify({
        import_type: importType,
        template_version: '1.0',
        idempotency_key: idempotencyKey,
      }),
    })
  },

  async validateImportCsv(jobId: string, file: File): Promise<ImportJob> {
    const formData = new FormData()
    formData.append('file', file)

    return request<ImportJob>(`/internal/v1/imports/${jobId}/validate`, {
      method: 'POST',
      body: formData,
    })
  },

  async getImportPreview(jobId: string): Promise<ImportPreview> {
    return request<ImportPreview>(`/internal/v1/imports/${jobId}/preview`)
  },

  async commitImportJob(jobId: string, allowPartial: boolean = false): Promise<any> {
    return request<any>(
      `/internal/v1/imports/${jobId}/commit?allow_partial=${allowPartial}`,
      { method: 'POST' }
    )
  },

  // Institutional Aggregate Reports
  async getInstitutionalReport(): Promise<InstitutionalReport> {
    return request<InstitutionalReport>('/internal/v1/reports/institutional-summary')
  },

  // Super Admin Platform overview
  async getPlatformInstitutions(): Promise<any[]> {
    return request<any[]>('/internal/v1/institutions')
  },

  // Mentorship API
  async getMyMentors(): Promise<MyMentorsResponse> {
    return request<MyMentorsResponse>('/internal/v1/students/me/mentors')
  },

  async getMentorAssignments(status?: string, studentId?: string): Promise<MentorAssignment[]> {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (studentId) params.set('student_id', studentId)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<MentorAssignment[]>(`/internal/v1/mentorship/assignments${qs}`)
  },

  async getAvailableMentors(): Promise<AvailableMentor[]> {
    return request<AvailableMentor[]>('/internal/v1/mentorship/available-mentors')
  },

  async createMentorAssignment(payload: {
    student_id: string
    mentor_membership_id: string
    assignment_type: 'primary' | 'subject'
    framework_competency_id?: string
    subject_scope?: string
    reason?: string
  }): Promise<MentorAssignment> {
    return request<MentorAssignment>('/internal/v1/mentorship/assignments', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async endMentorAssignment(id: string, reason?: string): Promise<MentorAssignment> {
    return request<MentorAssignment>(`/internal/v1/mentorship/assignments/${id}/end`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    })
  },

  // Bidirectional Messaging & Conversations
  async getConversations(status?: string): Promise<ConversationSummary[]> {
    const qs = status ? `?status=${status}` : ''
    return request<ConversationSummary[]>(`/internal/v1/conversations${qs}`)
  },

  async getConversation(id: string): Promise<ConversationDetail> {
    return request<ConversationDetail>(`/internal/v1/conversations/${id}`)
  },

  async createConversation(payload: {
    recipient_membership_id: string
    conversation_kind: 'primary_mentoring' | 'subject_mentoring' | 'assessment_query' | 'general'
    subject: string
    message_body: string
    subject_scope?: string
    student_profile_id?: string
    assessment_attempt_id?: string
  }): Promise<ConversationDetail> {
    return request<ConversationDetail>('/internal/v1/conversations', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async sendMessage(id: string, body: string): Promise<ConversationMessage> {
    return request<ConversationMessage>(`/internal/v1/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    })
  },

  async updateConversationStatus(
    id: string,
    status: 'open' | 'awaiting_response' | 'resolved' | 'reopened'
  ): Promise<{ id: string; status: string }> {
    return request<{ id: string; status: string }>(`/internal/v1/conversations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  // Persistent In-App Notifications
  async getNotifications(limit = 20, unreadOnly = false): Promise<NotificationListResponse> {
    const params = new URLSearchParams()
    if (limit) params.set('limit', limit.toString())
    if (unreadOnly) params.set('unread_only', 'true')
    const qs = params.toString() ? `?${params.toString()}` : ''
    return request<NotificationListResponse>(`/internal/v1/notifications${qs}`)
  },

  async markNotificationRead(id: string): Promise<NotificationItem> {
    return request<NotificationItem>(`/internal/v1/notifications/${id}/read`, {
      method: 'PATCH',
    })
  },

  async markAllNotificationsRead(): Promise<{ marked_count: number }> {
    return request<{ marked_count: number }>('/internal/v1/notifications/mark-all-read', {
      method: 'POST',
    })
  },

  // Institutional Access Requests (Public & Admin)
  async submitInstitutionApplication(payload: {
    institution_name: string
    representative_name: string
    representative_email: string
    verification_summary?: string
  }): Promise<InstitutionApplication> {
    return request<InstitutionApplication>('/internal/v1/institution-applications', {
      method: 'POST',
      body: JSON.stringify({
        institution_name: payload.institution_name,
        representative_name: payload.representative_name,
        representative_email: payload.representative_email,
        verification_summary: payload.verification_summary || 'Self-submitted from platform landing page',
      }),
    })
  },

  async getInstitutionApplications(): Promise<InstitutionApplication[]> {
    return request<InstitutionApplication[]>('/internal/v1/platform/institution-applications')
  },

  async reviewInstitutionApplication(
    id: string,
    decision: 'approved' | 'rejected',
    reason?: string
  ): Promise<InstitutionApplication> {
    return request<InstitutionApplication>(`/internal/v1/platform/institution-applications/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason }),
    })
  },

  // Institution Profile & Status Management
  async getInstitutionDetail(id: string): Promise<any> {
    return request<any>(`/internal/v1/platform/institutions/${id}`)
  },
  async updateInstitutionStatus(id: string, status: string, reason?: string): Promise<any> {
    return request<any>(`/internal/v1/platform/institutions/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    })
  },
  async getInstitutionStatusHistory(id: string): Promise<any[]> {
    return request<any[]>(`/internal/v1/platform/institutions/${id}/status-history`)
  },

  // Licence & Subscription Management
  async getLicences(): Promise<any[]> {
    return request<any[]>('/internal/v1/platform/licences')
  },
  async getExpiringLicences(days: number = 30): Promise<any[]> {
    return request<any[]>(`/internal/v1/platform/licences/expiring?days=${days}`)
  },
  async getLicenceDetail(licenceId: string): Promise<any> {
    return request<any>(`/internal/v1/platform/licences/${licenceId}`)
  },
  async getInstitutionLicence(instId: string): Promise<any> {
    return request<any>(`/internal/v1/platform/licences/institution/${instId}`)
  },
  async issueLicence(payload: {
    institution_id: string
    plan_tier?: string
    max_students?: number
    max_mentors?: number
    permitted_features?: string[]
    duration_days?: number
  }): Promise<any> {
    return request<any>('/internal/v1/platform/licences', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async modifyLicence(licenceId: string, payload: any): Promise<any> {
    return request<any>(`/internal/v1/platform/licences/${licenceId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  async renewLicence(licenceId: string, extendDays: number = 365, reason?: string): Promise<any> {
    return request<any>(`/internal/v1/platform/licences/${licenceId}/renew`, {
      method: 'POST',
      body: JSON.stringify({ extend_days: extendDays, reason }),
    })
  },
  async suspendLicence(licenceId: string, reason?: string): Promise<any> {
    return request<any>(`/internal/v1/platform/licences/${licenceId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  },
  async reactivateLicence(licenceId: string, reason?: string): Promise<any> {
    return request<any>(`/internal/v1/platform/licences/${licenceId}/reactivate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  },
  async revokeLicence(licenceId: string, reason?: string): Promise<any> {
    return request<any>(`/internal/v1/platform/licences/${licenceId}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  },
  async getLicenceEvents(licenceId: string): Promise<any[]> {
    return request<any[]>(`/internal/v1/platform/licences/${licenceId}/events`)
  },

  // Platform User Governance
  async getPlatformUsers(roleFilter?: string): Promise<any[]> {
    const q = roleFilter ? `?role_filter=${roleFilter}` : ''
    return request<any[]>(`/internal/v1/platform/users${q}`)
  },
  async toggleSuperAdminRole(userId: string, isSuperAdmin: boolean, reason?: string): Promise<any> {
    return request<any>(`/internal/v1/platform/users/${userId}/super-admin`, {
      method: 'POST',
      body: JSON.stringify({ is_super_admin: isSuperAdmin, reason }),
    })
  },
  async updateUserStatus(userId: string, status: string, reason?: string): Promise<any> {
    return request<any>(`/internal/v1/platform/users/${userId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    })
  },
  async getUserAccessHistory(userId: string): Promise<any> {
    return request<any>(`/internal/v1/platform/users/${userId}/access-history`)
  },

  // Platform Operations & Observability
  async getOperationsHealth(): Promise<any> {
    return request<any>('/internal/v1/platform/operations/health')
  },
  async getBackgroundJobs(): Promise<any> {
    return request<any>('/internal/v1/platform/operations/background-jobs')
  },
  async getSystemErrors(): Promise<any> {
    return request<any>('/internal/v1/platform/operations/system-errors')
  },
  async getIntegrationHealth(): Promise<any> {
    return request<any>('/internal/v1/platform/operations/integration-health')
  },
  async getPlatformAuditHistory(action?: string, limit: number = 50): Promise<any[]> {
    const params = new URLSearchParams()
    if (action) params.set('action', action)
    params.set('limit', String(limit))
    return request<any[]>(`/internal/v1/platform/operations/audit-history?${params.toString()}`)
  },

  // Platform Reports & Config
  async getPlatformKPISummary(): Promise<any> {
    return request<any>('/internal/v1/platform/reports/summary')
  },
  async getInstitutionalHealthReports(): Promise<any[]> {
    return request<any[]>('/internal/v1/platform/reports/institutional-health')
  },
  async getSecurityPolicies(): Promise<any> {
    return request<any>('/internal/v1/platform/config/security-policies')
  },
  async updateSecurityPolicies(policies: any): Promise<any> {
    return request<any>('/internal/v1/platform/config/security-policies', {
      method: 'PUT',
      body: JSON.stringify(policies),
    })
  },
  async getNotificationSettings(): Promise<any> {
    return request<any>('/internal/v1/platform/config/notification-settings')
  },
  async updateNotificationSettings(config: any): Promise<any> {
    return request<any>('/internal/v1/platform/config/notification-settings', {
      method: 'PUT',
      body: JSON.stringify(config),
    })
  },
  async getPlatformStandards(): Promise<any> {
    return request<any>('/internal/v1/platform/config/standards')
  },

  // Student 360 Consolidated View
  async getStudent360(studentId: string): Promise<any> {
    return request<any>(`/internal/v1/students/${studentId}/360`)
  },

  // Academic Structure
  async getDepartments(): Promise<any[]> {
    return request<any[]>('/internal/v1/departments')
  },
  async getCourses(): Promise<any[]> {
    return request<any[]>('/internal/v1/courses')
  },
  async getEnrollments(studentId?: string): Promise<any[]> {
    const q = studentId ? `?student_id=${studentId}` : ''
    return request<any[]>(`/internal/v1/enrollments${q}`)
  },

  // Risk Intelligence
  async trainRiskModel(modelVersion: string = 'v1.0.0'): Promise<any> {
    return request<any>('/internal/v1/risk/models/train', {
      method: 'POST',
      body: JSON.stringify({ model_version: modelVersion, use_synthetic_fallback: true }),
    })
  },
  async getRiskModels(): Promise<any[]> {
    return request<any[]>('/internal/v1/risk/models')
  },
  async triggerScoringRun(cutoffScope: string = 'midterm'): Promise<any> {
    return request<any>('/internal/v1/risk/scoring-runs', {
      method: 'POST',
      body: JSON.stringify({ cutoff_scope: cutoffScope }),
    })
  },
  async getRiskScoringRuns(): Promise<any[]> {
    return request<any[]>('/internal/v1/risk/scoring-runs')
  },
  async getRiskPredictions(scoringRunId?: string): Promise<any[]> {
    const q = scoringRunId ? `?scoring_run_id=${scoringRunId}` : ''
    return request<any[]>(`/internal/v1/risk/predictions${q}`)
  },
  async getRiskExplanation(predictionId: string): Promise<any> {
    return request<any>(`/internal/v1/risk/predictions/${predictionId}/explanation`)
  },
  async createSupportOverride(payload: {
    prediction_id?: string
    enrollment_id: string
    student_id: string
    new_support_level: string
    reason: string
  }): Promise<any> {
    return request<any>('/internal/v1/risk/support-overrides', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async getFairnessEvaluations(): Promise<any> {
    return request<any>('/internal/v1/risk/fairness-evaluations')
  },

  // Mentor Matching
  async triggerMatchingRun(payload: {
    assignment_type: string
    capacity_multiplier: number
    scope: string
    subject_scope?: string
  }): Promise<any> {
    return request<any>('/internal/v1/mentor-matching/runs', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async getMatchingRuns(): Promise<any[]> {
    return request<any[]>('/internal/v1/mentor-matching/runs')
  },
  async getMatchingRunDetail(runId: string): Promise<any> {
    return request<any>(`/internal/v1/mentor-matching/runs/${runId}`)
  },
  async approveMatchingProposal(proposalId: string, decisionReason?: string): Promise<any> {
    return request<any>(`/internal/v1/mentor-matching/proposals/${proposalId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ decision_reason: decisionReason || 'Approved by staff' }),
    })
  },
  async rejectMatchingProposal(proposalId: string, decisionReason: string): Promise<any> {
    return request<any>(`/internal/v1/mentor-matching/proposals/${proposalId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ decision_reason: decisionReason }),
    })
  },

  // AI Mentor Briefings
  async generateMentorBriefing(payload: { student_id: string; session_reference?: string }): Promise<any> {
    return request<any>('/internal/v1/mentor-briefings', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async getMentorBriefings(): Promise<any[]> {
    return request<any[]>('/internal/v1/mentor-briefings')
  },
  async getMentorBriefingDetail(briefingId: string): Promise<any> {
    return request<any>(`/internal/v1/mentor-briefings/${briefingId}`)
  },

  // Privacy, Consent & Audit Governance
  async getConsents(): Promise<any[]> {
    return request<any[]>('/internal/v1/privacy/consents')
  },
  async grantConsent(consentPurpose: string): Promise<any> {
    return request<any>('/internal/v1/privacy/consents', {
      method: 'POST',
      body: JSON.stringify({ consent_purpose: consentPurpose }),
    })
  },
  async withdrawConsent(consentId: string): Promise<any> {
    return request<any>(`/internal/v1/privacy/consents/${consentId}/withdraw`, {
      method: 'POST',
    })
  },
  async requestDataExport(): Promise<any> {
    return request<any>('/internal/v1/privacy/export-requests', {
      method: 'POST',
    })
  },
  async downloadDataExport(requestId: string): Promise<any> {
    return request<any>(`/internal/v1/privacy/export/${requestId}/download`)
  },
  async getAuditEvents(limit: number = 20): Promise<any[]> {
    return request<any[]>(`/internal/v1/audit-events?limit=${limit}`)
  },
  async verifyAuditChain(): Promise<any> {
    return request<any>('/internal/v1/audit-events/verify-chain')
  },

  // =========================================================================
  // Phase 3: Academic Foundation & Core Institution Workspaces
  // =========================================================================

  // Academic Overview
  async getAcademicOverview(): Promise<any> {
    return request<any>('/internal/v1/academic/overview')
  },

  // Academic Years / Terms
  async listAcademicTerms(): Promise<any[]> {
    return request<any[]>('/internal/v1/academic-terms')
  },
  async createAcademicTerm(payload: { name: string; start_date: string; end_date: string }): Promise<any> {
    return request<any>('/internal/v1/academic-terms', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async updateAcademicTerm(termId: string, payload: Partial<{ name: string; start_date: string; end_date: string; status: string }>): Promise<any> {
    return request<any>(`/internal/v1/academic-terms/${termId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  // Departments
  async listDepartments(): Promise<any[]> {
    return request<any[]>('/internal/v1/departments')
  },
  async createDepartment(payload: { name: string; code: string }): Promise<any> {
    return request<any>('/internal/v1/departments', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // Programmes & Cohorts
  async listProgrammes(): Promise<any[]> {
    return request<any[]>('/internal/v1/programmes')
  },
  async createProgramme(payload: { name: string; code: string; description?: string; org_node_id?: string }): Promise<any> {
    return request<any>('/internal/v1/programmes', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async listCohorts(): Promise<any[]> {
    return request<any[]>('/internal/v1/cohorts')
  },
  async createCohort(payload: { programme_id: string; name: string; start_date: string; end_date: string }): Promise<any> {
    return request<any>('/internal/v1/cohorts', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // Courses
  async listCourses(departmentId?: string): Promise<any[]> {
    const url = departmentId ? `/internal/v1/courses?department_id=${encodeURIComponent(departmentId)}` : '/internal/v1/courses'
    return request<any[]>(url)
  },
  async createCourse(payload: { code: string; title: string; description?: string; credits: number; department_id?: string }): Promise<any> {
    return request<any>('/internal/v1/courses', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async updateCourse(courseId: string, payload: Partial<{ title: string; description: string; credits: number; department_id: string; status: string }>): Promise<any> {
    return request<any>(`/internal/v1/courses/${courseId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  // Course Offerings & Sections
  async listCourseOfferings(academicTermId?: string): Promise<any[]> {
    const url = academicTermId ? `/internal/v1/course-offerings?academic_term_id=${encodeURIComponent(academicTermId)}` : '/internal/v1/course-offerings'
    return request<any[]>(url)
  },
  async createCourseOffering(payload: {
    course_id: string
    academic_term_id: string
    section_identifier: string
    instructor_membership_id?: string
    start_date?: string
    end_date?: string
  }): Promise<any> {
    return request<any>('/internal/v1/course-offerings', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // Assessment Schemes & Results
  async listOfferingAssessments(offeringId: string): Promise<any[]> {
    return request<any[]>(`/internal/v1/course-offerings/${offeringId}/assessments`)
  },
  async createOfferingAssessment(offeringId: string, payload: {
    name: string
    assessment_type: string
    max_score: number
    weight: number
    assessment_date?: string
  }): Promise<any> {
    return request<any>(`/internal/v1/course-offerings/${offeringId}/assessments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async getAssessment(assessmentId: string): Promise<any> {
    return request<any>(`/internal/v1/assessments/${assessmentId}`)
  },
  async listAssessmentResults(assessmentId: string): Promise<any[]> {
    return request<any[]>(`/internal/v1/assessments/${assessmentId}/results`)
  },
  async enterAssessmentResults(assessmentId: string, results: { enrollment_id: string; score: number; status?: string }[]): Promise<any> {
    return request<any>(`/internal/v1/assessments/${assessmentId}/results`, {
      method: 'POST',
      body: JSON.stringify({ results }),
    })
  },
  async releaseAssessmentResults(assessmentId: string): Promise<any> {
    return request<any>(`/internal/v1/assessments/${assessmentId}/release`, {
      method: 'POST',
    })
  },

  // Enrollments
  async listEnrollments(params?: { student_id?: string; course_offering_id?: string }): Promise<any[]> {
    const q = new URLSearchParams()
    if (params?.student_id) q.set('student_id', params.student_id)
    if (params?.course_offering_id) q.set('course_offering_id', params.course_offering_id)
    const qs = q.toString() ? `?${q.toString()}` : ''
    return request<any[]>(`/internal/v1/enrollments${qs}`)
  },
  async createEnrollment(payload: { student_id: string; course_offering_id: string }): Promise<any> {
    return request<any>('/internal/v1/enrollments', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async updateEnrollment(enrollmentId: string, payload: { enrollment_status?: string; final_grade?: number; final_outcome?: string }): Promise<any> {
    return request<any>(`/internal/v1/enrollments/${enrollmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  // Student Academic History (Released marks only)
  async getMyAcademicHistory(studentId?: string): Promise<any> {
    const url = studentId ? `/internal/v1/academic/my-history?student_id=${encodeURIComponent(studentId)}` : '/internal/v1/academic/my-history'
    return request<any>(url)
  },

  // Student Directory & Pagination
  async listStudentsPaginated(params: {
    cohort_id?: string
    search?: string
    status?: string
    sort_by?: string
    sort_order?: string
    page?: number
    page_size?: number
  }): Promise<{ items: StudentProfile[]; total: number; page: number; page_size: number; total_pages: number }> {
    const q = new URLSearchParams()
    if (params.cohort_id) q.set('cohort_id', params.cohort_id)
    if (params.search) q.set('search', params.search)
    if (params.status) q.set('status', params.status)
    if (params.sort_by) q.set('sort_by', params.sort_by)
    if (params.sort_order) q.set('sort_order', params.sort_order)
    if (params.page !== undefined) q.set('page', params.page.toString())
    if (params.page_size !== undefined) q.set('page_size', params.page_size.toString())
    return request<any>(`/internal/v1/students?${q.toString()}`)
  },
  async createStudent(payload: {
    first_name: string
    last_name: string
    student_identifier: string
    email: string
    cohort_id?: string
  }): Promise<StudentProfile> {
    return request<StudentProfile>('/internal/v1/students', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async updateStudent(studentId: string, payload: {
    first_name?: string
    last_name?: string
    email?: string
    status?: string
    reason?: string
  }): Promise<StudentProfile> {
    return request<StudentProfile>(`/internal/v1/students/${studentId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  // Institution Members / Staff
  async listMemberships(): Promise<any[]> {
    return request<any[]>('/internal/v1/memberships')
  },
  async createInvitation(payload: { email: string; role: string; roster_student_id?: string }): Promise<any> {
    return request<any>('/internal/v1/membership-invitations', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // Institution Settings
  async getInstitution(): Promise<any> {
    return request<any>('/internal/v1/institution')
  },
  async updateInstitution(payload: { name?: string; branding?: any; min_cohort_threshold?: number }): Promise<any> {
    return request<any>('/internal/v1/institution', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  // Academic Attendance & Marks Management (Phase 4)
  async correctAttendance(recordId: string, payload: { status: string; reason: string }): Promise<any> {
    return request<any>(`/internal/v1/attendance/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  async getAttendanceHistory(params?: {
    enrollment_id?: string
    course_offering_id?: string
    student_id?: string
    start_date?: string
    end_date?: string
  }): Promise<any[]> {
    const q = new URLSearchParams()
    if (params?.enrollment_id) q.set('enrollment_id', params.enrollment_id)
    if (params?.course_offering_id) q.set('course_offering_id', params.course_offering_id)
    if (params?.student_id) q.set('student_id', params.student_id)
    if (params?.start_date) q.set('start_date', params.start_date)
    if (params?.end_date) q.set('end_date', params.end_date)
    return request<any[]>(`/internal/v1/attendance/history?${q.toString()}`)
  },
  async bulkRecordAttendance(payload: {
    course_offering_id: string
    session_date: string
    records: { enrollment_id: string; status: string }[]
  }): Promise<any> {
    return request<any>('/internal/v1/attendance/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async unreleaseAssessment(assessmentId: string): Promise<any> {
    return request<any>(`/internal/v1/assessments/${assessmentId}/unrelease`, {
      method: 'POST',
    })
  },
  async getAcademicDataHealth(): Promise<any> {
    return request<any>('/internal/v1/academic/data-health')
  },

  // =========================================================================
  // Phase 9: Embedded Skill Swap Peer Engine
  // =========================================================================
  async getSkillSwapAccount(): Promise<any> {
    return request<any>('/internal/v1/skill-swap/account')
  },
  async listSkillSwapListings(params?: { listing_type?: string; category?: string; search?: string }): Promise<any[]> {
    const q = new URLSearchParams()
    if (params?.listing_type) q.set('listing_type', params.listing_type)
    if (params?.category) q.set('category', params.category)
    if (params?.search) q.set('search', params.search)
    const qs = q.toString() ? `?${q.toString()}` : ''
    return request<any[]>(`/internal/v1/skill-swap/listings${qs}`)
  },
  async createSkillSwapListing(payload: {
    listing_type: string
    skill_name: string
    category?: string
    proficiency_level?: string
    description?: string
  }): Promise<any> {
    return request<any>('/internal/v1/skill-swap/listings', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async archiveSkillSwapListing(listingId: string): Promise<any> {
    return request<any>(`/internal/v1/skill-swap/listings/${listingId}`, {
      method: 'DELETE',
    })
  },
  async bookSkillSwapSession(payload: {
    listing_id?: string
    offering_student_id: string
    skill_name: string
    duration_minutes?: number
    credit_cost?: number
    scheduled_at?: string
    notes?: string
  }): Promise<any> {
    return request<any>('/internal/v1/skill-swap/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async listSkillSwapSessions(statusFilter?: string): Promise<any[]> {
    const qs = statusFilter ? `?status_filter=${encodeURIComponent(statusFilter)}` : ''
    return request<any[]>(`/internal/v1/skill-swap/sessions${qs}`)
  },
  async completeSkillSwapSession(sessionId: string, payload: { rating_score?: number; feedback_text?: string }): Promise<any> {
    return request<any>(`/internal/v1/skill-swap/sessions/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async getSkillSwapTransactions(): Promise<any[]> {
    return request<any[]>('/internal/v1/skill-swap/transactions')
  },

  // =========================================================================
  // Phase 10: Career Intelligence & Dynamic Readiness Trajectories
  // =========================================================================
  async listCareerOccupations(params?: { taxonomy?: string; sector?: string; search?: string }): Promise<any[]> {
    const q = new URLSearchParams()
    if (params?.taxonomy) q.set('taxonomy', params.taxonomy)
    if (params?.sector) q.set('sector', params.sector)
    if (params?.search) q.set('search', params.search)
    const qs = q.toString() ? `?${q.toString()}` : ''
    return request<any[]>(`/internal/v1/career/occupations${qs}`)
  },
  async declareCareerGoal(payload: {
    occupation_id: string
    priority?: string
    target_graduation_date?: string
  }): Promise<any> {
    return request<any>('/internal/v1/career/goals', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async getStudentCareerGoals(studentId?: string): Promise<any[]> {
    const qs = studentId ? `?student_id=${encodeURIComponent(studentId)}` : ''
    return request<any[]>(`/internal/v1/career/goals${qs}`)
  },
  async getCareerGapAnalysis(params: { occupation_id: string; student_id?: string }): Promise<any> {
    const q = new URLSearchParams({ occupation_id: params.occupation_id })
    if (params.student_id) q.set('student_id', params.student_id)
    return request<any>(`/internal/v1/career/gap-analysis?${q.toString()}`)
  },
  async exportSkillPassport(studentId?: string): Promise<any> {
    const qs = studentId ? `?student_id=${encodeURIComponent(studentId)}` : ''
    return request<any>(`/internal/v1/career/passport/export${qs}`, {
      method: 'POST',
    })
  },

  // =========================================================================
  // Phase 11: Multimodal AI Learning Studio
  // =========================================================================
  async startStudioSession(payload: {
    modality: string
    goal_description: string
    starting_level?: string
    activity_id?: string
  }): Promise<any> {
    return request<any>('/internal/v1/multimodal/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async getStudioSession(sessionId: string): Promise<any> {
    return request<any>(`/internal/v1/multimodal/sessions/${sessionId}`)
  },
  async submitAttemptTelemetry(sessionId: string, payload: any): Promise<any> {
    return request<any>(`/internal/v1/multimodal/sessions/${sessionId}/attempt`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async completeStudioSession(sessionId: string): Promise<any> {
    return request<any>(`/internal/v1/multimodal/sessions/${sessionId}/complete`, {
      method: 'POST',
    })
  },

  // =========================================================================
  // Phase 7a: Co-Curricular & Talent Two-Pathway Engine
  // =========================================================================
  async listCoCurricularActivities(category?: string): Promise<any[]> {
    const qs = category ? `?category=${encodeURIComponent(category)}` : ''
    return request<any[]>(`/internal/v1/co-curricular/activities${qs}`)
  },
  async listCoCurricularEnrollments(studentId?: string): Promise<any[]> {
    const qs = studentId ? `?student_id=${encodeURIComponent(studentId)}` : ''
    return request<any[]>(`/internal/v1/co-curricular/enrollments${qs}`)
  },
  async enrollInCoCurricularActivity(payload: {
    activity_id: string
    aspiration_level?: string
    current_proficiency_level?: string
    weekly_hours_target?: number
  }): Promise<any> {
    return request<any>('/internal/v1/co-curricular/enrollments', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async listPracticeSessions(enrollmentId?: string): Promise<any[]> {
    const qs = enrollmentId ? `?enrollment_id=${encodeURIComponent(enrollmentId)}` : ''
    return request<any[]>(`/internal/v1/co-curricular/practice-sessions${qs}`)
  },
  async logPracticeSession(payload: {
    enrollment_id: string
    session_type?: string
    duration_minutes: number
    focus_technique: string
    notes?: string
    self_evaluation_score?: number
  }): Promise<any> {
    return request<any>('/internal/v1/co-curricular/practice-sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async submitCoCurricularEvidence(payload: {
    enrollment_id: string
    title: string
    media_uri: string
    modality?: string
    metadata_payload?: any
  }): Promise<any> {
    return request<any>('/internal/v1/co-curricular/evidence', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}


