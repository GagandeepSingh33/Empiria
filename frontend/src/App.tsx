import { useState, useEffect } from 'react'
import { api } from './api'
import type { Account, ActiveMembership } from './types'
import { LandingPage } from './components/LandingPage'
import { LoginPage } from './components/LoginPage'
import { PortalShell } from './components/Layout/PortalShell'
import {
  ForgotPasswordView,
  ResetPasswordView,
  AcceptInvitationView,
  PublicContentPageView,
} from './components/Public/PublicViews'
import { WorkflowTabs, type WorkflowStage } from './components/StudentWorkflow/WorkflowTabs'
import { AssessmentTaker } from './components/StudentWorkflow/AssessmentTaker'
import { DiagnosisView } from './components/StudentWorkflow/DiagnosisView'
import { PlanView } from './components/StudentWorkflow/PlanView'
import { PracticeView } from './components/StudentWorkflow/PracticeView'
import { ProgressView } from './components/StudentWorkflow/ProgressView'
import { SupportRequestModal } from './components/StudentWorkflow/SupportRequestModal'
import { StudentMyMentors } from './components/StudentWorkflow/StudentMyMentors'
import { ConversationsView } from './components/Conversations/ConversationsView'
import { MentorshipManagementView } from './components/InstitutionalStaff/MentorshipManagementView'
import { RosterImportView } from './components/InstitutionalStaff/RosterImportView'
import { SupportQueueView } from './components/InstitutionalStaff/SupportQueueView'
import { ReportsView } from './components/InstitutionalStaff/ReportsView'
import { FrameworkView } from './components/InstitutionalStaff/FrameworkView'
import { PlatformAdminView } from './components/SuperAdmin/PlatformAdminView'
import { Student360View } from './components/StudentWorkflow/Student360View'
import { RiskIntelligenceView } from './components/InstitutionalStaff/RiskIntelligenceView'
import { MentorBriefingView } from './components/InstitutionalStaff/MentorBriefingView'
import { PrivacyGovernanceView } from './components/InstitutionalStaff/PrivacyGovernanceView'
import { AcademicCalendarView } from './components/InstitutionalStaff/AcademicCalendarView'
import { DepartmentsProgramsView } from './components/InstitutionalStaff/DepartmentsProgramsView'
import { CoursesOfferingsView } from './components/InstitutionalStaff/CoursesOfferingsView'
import { StudentDirectoryView } from './components/InstitutionalStaff/StudentDirectoryView'
import { FacultyDirectoryView } from './components/InstitutionalStaff/FacultyDirectoryView'
import { InstitutionSettingsView } from './components/InstitutionalStaff/InstitutionSettingsView'
import { AcademicHistoryStudentView } from './components/StudentWorkflow/AcademicHistoryStudentView'
import { StudentOverviewDashboard } from './components/StudentWorkflow/StudentOverviewDashboard'
import { MentorDashboardView } from './components/Mentor/MentorDashboardView'
import { MentorAssignedStudentsView } from './components/Mentor/MentorAssignedStudentsView'
import { MentorMeetingsView } from './components/Mentor/MentorMeetingsView'
import { MentorReviewQueueView } from './components/Mentor/MentorReviewQueueView'
import { MentorImprovementPlansView } from './components/Mentor/MentorImprovementPlansView'
import { MentorProfileView } from './components/Mentor/MentorProfileView'
import { MentorWorkloadView } from './components/Mentor/MentorWorkloadView'
import { SkillSwapView } from './components/StudentWorkflow/SkillSwapView'
import { CareerIntelligenceView } from './components/StudentWorkflow/CareerIntelligenceView'
import { MultimodalStudioView } from './components/StudentWorkflow/MultimodalStudioView'
import { CoCurricularPathwaysView } from './components/StudentWorkflow/CoCurricularPathwaysView'
import { RefreshCw } from 'lucide-react'

export default function App() {
  const [account, setAccount] = useState<Account | undefined>(undefined)
  const [activeMembership, setActiveMembership] = useState<ActiveMembership | undefined>(undefined)
  const [activeRole, setActiveRole] = useState<string>('student')
  const [loading, setLoading] = useState<boolean>(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [loginSubmitting, setLoginSubmitting] = useState<boolean>(false)

  // URL / Route path state
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/')

  // Student workflow state (Domain A)
  const [studentStage, setStudentStage] = useState<WorkflowStage>('measure')
  const [selectedPracticeTaskId, setSelectedPracticeTaskId] = useState<string | undefined>(undefined)
  const [supportModalOpen, setSupportModalOpen] = useState<boolean>(false)

  // Target conversation for direct messaging navigation
  const [targetConversationId, setTargetConversationId] = useState<string | undefined>(undefined)

  useEffect(() => {
    checkSession()

    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigateTo = (path: string) => {
    window.history.pushState(null, '', path)
    setCurrentPath(path)
    window.scrollTo(0, 0)
  }

  const getPortalHomeForRole = (role: string) => {
    switch (role) {
      case 'super_admin':
      case 'platform_super_admin':
        return '/super-admin/dashboard'
      case 'institution_admin':
      case 'institution_data_operator':
      case 'data_operator':
        return '/admin/dashboard'
      case 'mentor':
      case 'mentor_advisor':
      case 'faculty':
      case 'faculty_assessor':
        return '/mentor/dashboard'
      case 'student':
      default:
        return '/student/dashboard'
    }
  }

  const determineRole = (sessionData: {
    is_super_admin?: boolean
    account?: Account
    active_membership?: ActiveMembership
  }): string => {
    // If user is super admin at platform or account level, their role is super_admin
    if (
      sessionData.is_super_admin === true ||
      sessionData.account?.is_super_admin === true ||
      sessionData.account?.account_type === 'super_admin'
    ) {
      return 'super_admin'
    }
    // If membership specifies roles, select primary institutional role
    if (sessionData.active_membership?.roles && sessionData.active_membership.roles.length > 0) {
      return sessionData.active_membership.roles[0]
    }
    return 'student'
  }

  const checkSession = async () => {
    try {
      setLoading(true)
      const session = await api.getSession()
      if (session.authenticated && session.account) {
        setAccount(session.account)
        setActiveMembership(session.active_membership)
        const primaryRole = determineRole(session)
        setActiveRole(primaryRole)

        // If landing on root or login while authenticated, forward to portal home
        const p = window.location.pathname || '/'
        if (p === '/' || p === '/login') {
          navigateTo(getPortalHomeForRole(primaryRole))
        }
      } else {
        setAccount(undefined)
        setActiveMembership(undefined)
      }
    } catch {
      setAccount(undefined)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (email: string, pass: string) => {
    try {
      setLoginSubmitting(true)
      setAuthError(null)
      const res = await api.login(email, pass)
      if (res.authenticated && res.account) {
        setAccount(res.account)
        setActiveMembership(res.active_membership)
        const primaryRole = determineRole(res)
        setActiveRole(primaryRole)
        navigateTo(getPortalHomeForRole(primaryRole))
      }
    } catch (err: any) {
      setAuthError(err.message || 'Login failed')
    } finally {
      setLoginSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await api.logout()
    } finally {
      setAccount(undefined)
      setActiveMembership(undefined)
      navigateTo('/login')
    }
  }

  const handleOpenConversation = (conversationId?: string) => {
    setTargetConversationId(conversationId)
    if (activeRole === 'student') {
      navigateTo('/student/messaging')
    } else if (
      activeRole === 'mentor' ||
      activeRole === 'mentor_advisor' ||
      activeRole === 'faculty' ||
      activeRole === 'faculty_assessor'
    ) {
      navigateTo('/mentor/messaging')
    } else {
      navigateTo('/admin/messaging')
    }
  }

  if (loading) {
    return (
      <div className="app-container" style={{ minHeight: '100vh', background: 'var(--empiria-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <RefreshCw size={36} className="spin" style={{ color: 'var(--empiria-primary)', marginBottom: '16px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>Initializing EMPIRIA Platform...</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>Verifying institutional session & security keys</p>
      </div>
    )
  }

  // =========================================================================
  // PUBLIC WEBSITE ROUTES (DOC-A Diagram 2)
  // Accessible without authentication
  // =========================================================================
  if (!account) {
    if (currentPath === '/') {
      return <LandingPage onNavigateLogin={() => navigateTo('/login')} onNavigate={navigateTo} />
    }
    if (currentPath === '/login') {
      return (
        <LoginPage
          onLogin={handleLogin}
          onNavigateHome={() => navigateTo('/')}
          submitting={loginSubmitting}
          authError={authError}
        />
      )
    }
    if (
      currentPath === '/forgot-password' ||
      currentPath === '/request-reset' ||
      currentPath === '/recover-credentials'
    ) {
      return <ForgotPasswordView onNavigate={navigateTo} />
    }
    if (currentPath.startsWith('/reset-password')) {
      return <ResetPasswordView onNavigate={navigateTo} />
    }
    if (currentPath.startsWith('/accept-invitation')) {
      return <AcceptInvitationView onNavigate={navigateTo} />
    }
    if (currentPath === '/about') {
      return <PublicContentPageView onNavigate={navigateTo} type="about" />
    }
    if (currentPath === '/features') {
      return <PublicContentPageView onNavigate={navigateTo} type="features" />
    }
    if (currentPath === '/contact') {
      return <PublicContentPageView onNavigate={navigateTo} type="contact" />
    }
    if (currentPath === '/privacy') {
      return <PublicContentPageView onNavigate={navigateTo} type="privacy" />
    }
    if (currentPath === '/terms') {
      return <PublicContentPageView onNavigate={navigateTo} type="terms" />
    }

    // Default redirect to login for any unrecognized unauthenticated path
    return (
      <LoginPage
        onLogin={handleLogin}
        onNavigateHome={() => navigateTo('/')}
        submitting={loginSubmitting}
        authError={authError}
      />
    )
  }

  // =========================================================================
  // AUTHENTICATED PORTALS (DOC-A Diagrams 3–6)
  // Route Guards enforce authorized portal boundaries
  // =========================================================================

  // Compatibility redirect for legacy '/app' or root bookmarks
  if (currentPath === '/' || currentPath === '/app') {
    navigateTo(getPortalHomeForRole(activeRole))
  }

  // Automatic redirect if a mentor/admin lands on /student/*
  if (
    currentPath.startsWith('/student') &&
    activeRole !== 'student' &&
    !account.is_super_admin &&
    account.account_type !== 'super_admin'
  ) {
    const home = getPortalHomeForRole(activeRole)
    if (home && home !== currentPath) {
      navigateTo(home)
    }
  }

  // -------------------------------------------------------------------------
  // 1. Platform Super Admin Portal (/super-admin/*)
  // -------------------------------------------------------------------------
  if (currentPath.startsWith('/super-admin')) {
    return (
      <PortalShell
        account={account}
        activeMembership={activeMembership}
        activeRole={activeRole}
        targetPortal="super_admin"
        currentPath={currentPath}
        onNavigate={navigateTo}
        onLogout={handleLogout}
        onOpenConversation={handleOpenConversation}
      >
        <PlatformAdminView currentPath={currentPath} onNavigate={navigateTo} />
      </PortalShell>
    )
  }

  // -------------------------------------------------------------------------
  // 2. Institution Admin Portal (/admin/*)
  // -------------------------------------------------------------------------
  if (currentPath.startsWith('/admin')) {
    return (
      <PortalShell
        account={account}
        activeMembership={activeMembership}
        activeRole={activeRole}
        targetPortal="institution_admin"
        currentPath={currentPath}
        onNavigate={navigateTo}
        onLogout={handleLogout}
        onOpenConversation={handleOpenConversation}
      >
        {currentPath === '/admin/dashboard' && <ReportsView />}
        {currentPath === '/admin/academic-calendar' && <AcademicCalendarView />}
        {currentPath === '/admin/departments' && <DepartmentsProgramsView />}
        {currentPath === '/admin/courses' && <CoursesOfferingsView />}
        {currentPath === '/admin/students' && (
          <StudentDirectoryView onSelectStudent={(id) => navigateTo(`/admin/students/${id}`)} />
        )}
        {currentPath.startsWith('/admin/students/') && (
          <Student360View
            studentId={currentPath.replace('/admin/students/', '')}
            isStaffView={true}
          />
        )}
        {currentPath === '/admin/faculty' && <FacultyDirectoryView />}
        {currentPath === '/admin/mentorship' && <MentorshipManagementView />}
        {currentPath === '/admin/academic-data-import' && <RosterImportView />}
        {currentPath === '/admin/review-queue' && <RiskIntelligenceView />}
        {currentPath === '/admin/interventions' && <SupportQueueView />}
        {currentPath === '/admin/analytics' && <ReportsView />}
        {currentPath === '/admin/frameworks' && <FrameworkView />}
        {currentPath === '/admin/messaging' && (
          <ConversationsView
            currentAccount={account}
            initialConversationId={targetConversationId}
            activeRole={activeRole}
          />
        )}
        {currentPath === '/admin/privacy-governance' && <PrivacyGovernanceView />}
        {currentPath === '/admin/settings' && <InstitutionSettingsView />}
        {!['/admin/dashboard', '/admin/academic-calendar', '/admin/departments', '/admin/courses', '/admin/students', '/admin/faculty', '/admin/mentorship', '/admin/academic-data-import', '/admin/review-queue', '/admin/interventions', '/admin/analytics', '/admin/frameworks', '/admin/messaging', '/admin/privacy-governance', '/admin/settings'].includes(currentPath) && !currentPath.startsWith('/admin/students/') && (
          <ReportsView />
        )}
      </PortalShell>
    )
  }

  // -------------------------------------------------------------------------
  // 3. Mentor Portal (/mentor/*)
  // -------------------------------------------------------------------------
  if (currentPath.startsWith('/mentor')) {
    return (
      <PortalShell
        account={account}
        activeMembership={activeMembership}
        activeRole={activeRole}
        targetPortal="mentor"
        currentPath={currentPath}
        onNavigate={navigateTo}
        onLogout={handleLogout}
        onOpenConversation={handleOpenConversation}
      >
        {currentPath === '/mentor/dashboard' && (
          <MentorDashboardView
            account={account}
            activeMembership={activeMembership}
            onNavigate={navigateTo}
            onOpenConversation={handleOpenConversation}
          />
        )}
        {currentPath === '/mentor/assigned-students' && (
          <MentorAssignedStudentsView
            initialFilter="all"
            onNavigate={navigateTo}
            onOpenConversation={handleOpenConversation}
          />
        )}
        {currentPath === '/mentor/subject-students' && (
          <MentorAssignedStudentsView
            initialFilter="subject"
            onNavigate={navigateTo}
            onOpenConversation={handleOpenConversation}
          />
        )}
        {currentPath === '/mentor/briefings' && <MentorBriefingView />}
        {currentPath === '/mentor/meetings' && (
          <MentorMeetingsView
            onNavigate={navigateTo}
            onOpenConversation={handleOpenConversation}
          />
        )}
        {currentPath === '/mentor/review-queue' && (
          <MentorReviewQueueView
            onNavigate={navigateTo}
            onOpenConversation={handleOpenConversation}
          />
        )}
        {currentPath === '/mentor/improvement-plans' && (
          <MentorImprovementPlansView
            onNavigate={navigateTo}
            onOpenConversation={handleOpenConversation}
          />
        )}
        {currentPath === '/mentor/student-360' && <Student360View isStaffView={true} />}
        {currentPath === '/mentor/skill-swap' && <SkillSwapView />}
        {currentPath === '/mentor/co-curricular' && <CoCurricularPathwaysView />}
        {currentPath === '/mentor/messaging' && (
          <ConversationsView
            currentAccount={account}
            initialConversationId={targetConversationId}
            activeRole={activeRole}
          />
        )}
        {currentPath === '/mentor/workload' && (
          <MentorWorkloadView
            account={account}
            activeMembership={activeMembership}
            onNavigate={navigateTo}
          />
        )}
        {currentPath === '/mentor/profile' && (
          <MentorProfileView
            account={account}
            activeMembership={activeMembership}
          />
        )}
        {!['/mentor/dashboard', '/mentor/assigned-students', '/mentor/subject-students', '/mentor/briefings', '/mentor/meetings', '/mentor/review-queue', '/mentor/improvement-plans', '/mentor/student-360', '/mentor/skill-swap', '/mentor/co-curricular', '/mentor/messaging', '/mentor/workload', '/mentor/profile'].includes(currentPath) && (
          <MentorDashboardView
            account={account}
            activeMembership={activeMembership}
            onNavigate={navigateTo}
            onOpenConversation={handleOpenConversation}
          />
        )}
      </PortalShell>
    )
  }

  // -------------------------------------------------------------------------
  // 4. Student Portal (/student/*)
  // -------------------------------------------------------------------------
  return (
    <PortalShell
      account={account}
      activeMembership={activeMembership}
      activeRole={activeRole}
      targetPortal="student"
      currentPath={currentPath}
      onNavigate={navigateTo}
      onLogout={handleLogout}
      onOpenConversation={handleOpenConversation}
    >
      {/* Dedicated Student Overview Dashboard (Name, Courses, Year, Mentors, Quick Hub) */}
      {currentPath === '/student/dashboard' && (
        <StudentOverviewDashboard
          account={account}
          activeMembership={activeMembership}
          onNavigate={navigateTo}
          onRequestSupport={() => setSupportModalOpen(true)}
        />
      )}

      {/* Dedicated 6-Stage Capability Development Engine (/student/capability) */}
      {currentPath === '/student/capability' && (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <WorkflowTabs
            currentStage={studentStage}
            onSelectStage={(stage) => setStudentStage(stage)}
          />

          <div style={{ marginTop: '20px' }}>
            {studentStage === 'measure' && (
              <AssessmentTaker
                onAssessmentCompleted={() => setStudentStage('diagnose')}
              />
            )}

            {studentStage === 'diagnose' && (
              <DiagnosisView
                studentId={account.id}
                onProceedToPlan={() => setStudentStage('plan')}
                onProceedToMeasure={() => setStudentStage('measure')}
              />
            )}

            {studentStage === 'plan' && (
              <PlanView
                onProceedToPractice={(taskId) => {
                  setSelectedPracticeTaskId(taskId)
                  setStudentStage('practise')
                }}
              />
            )}

            {studentStage === 'practise' && (
              <PracticeView
                initialTaskId={selectedPracticeTaskId}
                onProceedToVerify={() => setStudentStage('verify')}
              />
            )}

            {studentStage === 'verify' && (
              <AssessmentTaker
                onAssessmentCompleted={() => setStudentStage('improve')}
              />
            )}

            {studentStage === 'improve' && (
              <ProgressView
                studentId={account.id}
                onRequestSupport={() => setSupportModalOpen(true)}
              />
            )}

            <SupportRequestModal
              isOpen={supportModalOpen}
              onClose={() => setSupportModalOpen(false)}
              onSubmitted={() => {}}
            />
          </div>
        </div>
      )}

      {/* Academics & Student 360 */}
      {currentPath === '/student/academics' && <AcademicHistoryStudentView />}
      {currentPath === '/student/student-360' && (
        <Student360View studentId={account.id} isStaffView={false} />
      )}

      {/* Mentors */}
      {currentPath === '/student/mentors' && (
        <StudentMyMentors onOpenConversation={handleOpenConversation} />
      )}

      {/* Improvement Plans */}
      {currentPath === '/student/improvement-plans' && (
        <PlanView
          onProceedToPractice={(taskId) => {
            setSelectedPracticeTaskId(taskId)
            setStudentStage('practise')
            navigateTo('/student/capability')
          }}
        />
      )}

      {/* Learning Recommendations */}
      {currentPath === '/student/learning-resources' && (
        <PracticeView
          initialTaskId={selectedPracticeTaskId}
          onProceedToVerify={() => {
            setStudentStage('verify')
            navigateTo('/student/capability')
          }}
        />
      )}

      {/* Messages */}
      {currentPath === '/student/messaging' && (
        <ConversationsView
          currentAccount={account}
          initialConversationId={targetConversationId}
          activeRole={activeRole}
        />
      )}

      {/* Support Requests */}
      {currentPath === '/student/support-requests' && (
        <div>
          <ProgressView
            studentId={account.id}
            onRequestSupport={() => setSupportModalOpen(true)}
          />
          <SupportRequestModal
            isOpen={supportModalOpen}
            onClose={() => setSupportModalOpen(false)}
            onSubmitted={() => {}}
          />
        </div>
      )}



      {/* Expanded Vision: Peer Skill Swap */}
      {currentPath === '/student/skill-swap' && <SkillSwapView />}

      {/* Expanded Vision: Career Intelligence & Skill Passport */}
      {currentPath === '/student/career' && <CareerIntelligenceView />}

      {/* Expanded Vision: Multimodal AI Learning Studio */}
      {currentPath === '/student/studio' && <MultimodalStudioView />}

      {/* Expanded Vision: Co-Curricular & Talent Pathways */}
      {currentPath === '/student/co-curricular' && <CoCurricularPathwaysView />}

    </PortalShell>
  )
}
