import React from 'react'
import {
  LayoutDashboard,
  Building2,
  Key,
  Users,
  BarChart3,
  ShieldAlert,
  FileText,
  Bell,
  Settings,
  UserCheck,
  Calendar,
  Network,
  BookOpen,
  GraduationCap,
  Compass,
  UploadCloud,
  AlertTriangle,
  LifeBuoy,
  BarChart2,
  Layers,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Target,
  Clock,
  User,
  Activity,
  ArrowRightLeft,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export interface SidebarItem {
  id: string
  label: string
  path: string
  icon: React.ReactNode
  badge?: string | number
}

interface SidebarProps {
  role: 'super_admin' | 'institution_admin' | 'faculty' | 'mentor' | 'student' | string
  currentPath: string
  onNavigate: (path: string) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  role,
  currentPath,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}) => {
  const getItemsForRole = (): SidebarItem[] => {
    switch (role) {
      case 'super_admin':
        return [
          { id: 'dashboard', label: 'Overview & KPIs', path: '/super-admin/dashboard', icon: <LayoutDashboard size={18} /> },
          { id: 'institutions', label: 'Institutions', path: '/super-admin/institutions', icon: <Building2 size={18} /> },
          { id: 'licences', label: 'Licences & Limits', path: '/super-admin/licences', icon: <Key size={18} /> },
          { id: 'users', label: 'Platform Users', path: '/super-admin/users', icon: <Users size={18} /> },
          { id: 'operations', label: 'Operations & Health', path: '/super-admin/operations', icon: <Activity size={18} /> },
          { id: 'reports', label: 'Platform Reports', path: '/super-admin/reports', icon: <BarChart3 size={18} /> },
          { id: 'policies', label: 'Global Policies', path: '/super-admin/policies', icon: <ShieldAlert size={18} /> },
          { id: 'logs', label: 'System Logs & Auditing', path: '/super-admin/logs', icon: <FileText size={18} /> },
          { id: 'notifications', label: 'Notifications & Alerts', path: '/super-admin/notifications', icon: <Bell size={18} /> },
          { id: 'settings', label: 'Operational Settings', path: '/super-admin/settings', icon: <Settings size={18} /> },
          { id: 'profile', label: 'Profile & Account', path: '/super-admin/profile', icon: <UserCheck size={18} /> },
        ]

      case 'institution_admin':
      case 'institution_data_operator':
        return [
          { id: 'dashboard', label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
          { id: 'academic_calendar', label: 'Academic Years & Terms', path: '/admin/academic-calendar', icon: <Calendar size={18} /> },
          { id: 'departments', label: 'Departments & Programs', path: '/admin/departments', icon: <Network size={18} /> },
          { id: 'courses', label: 'Courses & Offerings', path: '/admin/courses', icon: <BookOpen size={18} /> },
          { id: 'students', label: 'Student Directory & Enrolment', path: '/admin/students', icon: <GraduationCap size={18} /> },
          { id: 'faculty', label: 'Staff & Faculty Directory', path: '/admin/faculty', icon: <Users size={18} /> },
          { id: 'mentorship', label: 'Mentorship Allocation & Workload', path: '/admin/mentorship', icon: <Compass size={18} /> },
          { id: 'academic_data_import', label: 'Academic Data Import', path: '/admin/academic-data-import', icon: <UploadCloud size={18} /> },
          { id: 'review_queue', label: 'Student Review Priority Queue', path: '/admin/review-queue', icon: <AlertTriangle size={18} /> },
          { id: 'interventions', label: 'Support & Interventions', path: '/admin/interventions', icon: <LifeBuoy size={18} /> },
          { id: 'analytics', label: 'Institutional Analytics & Health', path: '/admin/analytics', icon: <BarChart2 size={18} /> },
          { id: 'frameworks', label: 'Competency Frameworks', path: '/admin/frameworks', icon: <Layers size={18} /> },
          { id: 'messaging', label: 'Messaging & Communications', path: '/admin/messaging', icon: <MessageSquare size={18} /> },
          { id: 'privacy_governance', label: 'Privacy, Consent & Audit', path: '/admin/privacy-governance', icon: <ShieldCheck size={18} /> },
          { id: 'settings', label: 'Institution Settings & Profile', path: '/admin/settings', icon: <Settings size={18} /> },
        ]

      case 'mentor':
      case 'mentor_advisor':
      case 'faculty':
      case 'faculty_assessor':
        return [
          { id: 'dashboard', label: 'Dashboard', path: '/mentor/dashboard', icon: <LayoutDashboard size={18} /> },
          { id: 'assigned_students', label: 'Assigned Students (Mentees)', path: '/mentor/assigned-students', icon: <Users size={18} /> },
          { id: 'subject_students', label: 'Subject-Specific Students', path: '/mentor/subject-students', icon: <BookOpen size={18} /> },
          { id: 'briefings', label: 'Pre-Session AI Briefings', path: '/mentor/briefings', icon: <Sparkles size={18} /> },
          { id: 'meetings', label: 'Meeting Schedule & Follow-ups', path: '/mentor/meetings', icon: <Calendar size={18} /> },
          { id: 'review_queue', label: 'Academic Review Queue', path: '/mentor/review-queue', icon: <AlertCircle size={18} /> },
          { id: 'improvement_plans', label: 'Improvement Plans & Interventions', path: '/mentor/improvement-plans', icon: <Target size={18} /> },
          { id: 'student_360', label: 'Student 360 Workspace', path: '/mentor/student-360', icon: <GraduationCap size={18} /> },
          { id: 'skill_swap', label: 'Peer Skill Swaps', path: '/mentor/skill-swap', icon: <ArrowRightLeft size={18} /> },
          { id: 'co_curricular', label: 'Co-Curricular Pursuits', path: '/mentor/co-curricular', icon: <Trophy size={18} /> },
          { id: 'messaging', label: 'Messages & Communications', path: '/mentor/messaging', icon: <MessageSquare size={18} /> },
          { id: 'workload', label: 'Availability & Workload Profile', path: '/mentor/workload', icon: <Clock size={18} /> },
          { id: 'profile', label: 'Profile & Settings', path: '/mentor/profile', icon: <User size={18} /> },
        ]

      case 'student':
      default:
        return [
          { id: 'dashboard', label: 'Dashboard', path: '/student/dashboard', icon: <LayoutDashboard size={18} /> },
          { id: 'capability', label: 'Capability Development', path: '/student/capability', icon: <Compass size={18} /> },
          { id: 'academics', label: 'Academics & Grades', path: '/student/academics', icon: <BookOpen size={18} /> },
          { id: 'student_360', label: 'Student 360 Workspace', path: '/student/student-360', icon: <GraduationCap size={18} /> },
          { id: 'skill_swap', label: 'Peer Skill Swap Network', path: '/student/skill-swap', icon: <ArrowRightLeft size={18} /> },
          { id: 'career', label: 'Career Intelligence & Passport', path: '/student/career', icon: <Target size={18} /> },
          { id: 'studio', label: 'Multimodal AI Studio', path: '/student/studio', icon: <Activity size={18} /> },
          { id: 'co_curricular', label: 'Co-Curricular & Talent Paths', path: '/student/co-curricular', icon: <Trophy size={18} /> },
          { id: 'mentors', label: 'My Mentors & Advisors', path: '/student/mentors', icon: <Users size={18} /> },
          { id: 'improvement_plans', label: 'Improvement Plans & Tasks', path: '/student/improvement-plans', icon: <Clock size={18} /> },
          { id: 'messaging', label: 'Messages & Inquiries', path: '/student/messaging', icon: <MessageSquare size={18} /> },
          { id: 'support_requests', label: 'Support Requests', path: '/student/support-requests', icon: <LifeBuoy size={18} /> },
        ]
    }
  }

  const items = getItemsForRole()

  const getPortalLabel = () => {
    switch (role) {
      case 'super_admin':
      case 'platform_super_admin':
        return 'Platform Super Admin'
      case 'institution_admin':
      case 'institution_data_operator':
      case 'data_operator':
        return 'Institution Admin Portal'
      case 'mentor':
      case 'mentor_advisor':
      case 'faculty':
      case 'faculty_assessor':
        return 'Mentor & Advisor Portal'
      case 'student':
      default:
        return 'Student Portal'
    }
  }

  return (
    <aside
      className={`portal-sidebar ${collapsed ? 'collapsed' : ''}`}
      style={{
        width: collapsed ? '72px' : '260px',
        background: '#ffffff',
        borderRight: '1px solid var(--empiria-border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        zIndex: 40,
        height: 'calc(100vh - 68px)',
        position: 'sticky',
        top: '68px',
      }}
    >
      {/* Portal Category Header */}
      <div
        style={{
          padding: collapsed ? '16px 8px' : '16px 18px',
          borderBottom: '1px solid var(--empiria-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {!collapsed && (
          <div>
            <div style={{ fontSize: '10px', color: 'var(--empiria-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              PORTAL NAVIGATION
            </div>
            <div style={{ fontSize: '13px', color: 'var(--empiria-text)', fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {getPortalLabel()}
            </div>
          </div>
        )}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              background: '#f8fafc',
              border: '1px solid var(--empiria-border)',
              borderRadius: '8px',
              color: 'var(--empiria-text-muted)',
              padding: '5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: collapsed ? '0 auto' : '0',
            }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Nav List */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {items.map((item) => {
            const isActive = currentPath === item.path || currentPath.startsWith(`${item.path}/`)
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.path)}
                  title={collapsed ? item.label : undefined}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: collapsed ? '10px 0' : '9px 12px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    background: isActive ? '#eff6ff' : 'transparent',
                    border: 'none',
                    borderRadius: '12px',
                    color: isActive ? '#2563eb' : 'var(--empiria-text-secondary)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--empiria-text)'
                      e.currentTarget.style.background = '#f8fafc'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--empiria-text-secondary)'
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <span style={{ color: isActive ? '#2563eb' : 'var(--empiria-text-muted)', display: 'flex', alignItems: 'center' }}>
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                  )}
                  {!collapsed && item.badge !== undefined && (
                    <span
                      style={{
                        background: '#2563eb',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Role Footer Badge */}
      {!collapsed && (
        <div
          style={{
            padding: '14px 16px',
            borderTop: '1px solid var(--empiria-border)',
            fontSize: '11px',
            color: 'var(--empiria-text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}
        >
          <span>Active Role</span>
          <span
            style={{
              color: '#2563eb',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              fontSize: '10px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              padding: '3px 8px',
              borderRadius: 'var(--radius-full)',
            }}
          >
            {role.replace('_', ' ')}
          </span>
        </div>
      )}
    </aside>
  )
}
