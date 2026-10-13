import React, { useState, useEffect } from 'react'
import {
  Users,
  Calendar,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  GraduationCap,
  Target,
  Clock,
  ChevronRight,
  Settings,
} from 'lucide-react'
import { api } from '../../api'
import type { MentorAssignment, Account, ActiveMembership } from '../../types'

interface MentorDashboardViewProps {
  account?: Account
  activeMembership?: ActiveMembership | null
  onNavigate: (path: string) => void
  onOpenConversation?: (conversationId?: string) => void
}

export const MentorDashboardView: React.FC<MentorDashboardViewProps> = ({
  account,
  activeMembership,
  onNavigate,
  onOpenConversation,
}) => {
  const [assignments, setAssignments] = useState<MentorAssignment[]>([])
  const [briefings, setBriefings] = useState<any[]>([])
  const [supportRequests, setSupportRequests] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const mentorName =
    account?.display_name ||
    (account?.first_name ? `${account.first_name} ${account.last_name || ''}`.trim() : 'Dr. Rajesh Verma')
  const mentorEmail = account?.email || 'mentor@apex.edu'

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [assignmentsRes, briefingsRes, supportRes] = await Promise.allSettled([
        api.getMentorAssignments('active'),
        api.getMentorBriefings(),
        api.listSupportRequests(),
      ])

      if (assignmentsRes.status === 'fulfilled') {
        setAssignments(assignmentsRes.value || [])
      }
      if (briefingsRes.status === 'fulfilled') {
        setBriefings(briefingsRes.value || [])
      }
      if (supportRes.status === 'fulfilled') {
        setSupportRequests(supportRes.value || [])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load mentor workspace metrics.')
    } finally {
      setLoading(false)
    }
  }

  const activeCount = assignments.length
  const pendingRequests = supportRequests.filter((r) => r.status === 'open' || r.status === 'in_progress').length
  const briefingsCount = briefings.length

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <RefreshCw size={28} className="spin" style={{ color: 'var(--empiria-primary)', marginBottom: '14px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
          Loading Mentor & Advisor Workspace...
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Syncing mentee cohorts, pre-session briefings, and intervention queues
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* Editorial Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>
            <span>Institutional Mentorship</span>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--empiria-primary)', fontWeight: 600 }}>Advisor Workspace</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            Advisor & Faculty Mentorship Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', maxWidth: '720px' }}>
            Longitudinal mentee stewardship, pre-session deterministic briefings, and human-in-the-loop support governance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={loadDashboardData} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onNavigate('/mentor/briefings')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Sparkles size={15} />
            Pre-Session Briefings
          </button>
        </div>
      </div>

      {/* Mentor Profile & Description Banner */}
      <div
        className="card"
        style={{
          marginBottom: '28px',
          padding: '24px 28px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%)',
          border: '1px solid rgba(37, 99, 235, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: '320px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 800,
              boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)',
              flexShrink: 0,
            }}
          >
            {mentorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  color: '#2563eb',
                  background: '#dbeafe',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {activeMembership?.institution_name || 'Empiria Institution'} · Faculty Mentor
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {mentorEmail}
              </span>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 4px 0', fontFamily: 'var(--font-display)' }}>
              {mentorName} — Professor & Senior Faculty Advisor
            </h2>

            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: '780px' }}>
              Department of Computer Science & Engineering · Office: Turing Hall Room 412 · Advising Hours: Tue & Thu 3:00–5:30 PM.
              Specialized in distributed systems, database architectures, algorithmic problem solving, and student capability acceleration.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('/mentor/profile')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Settings size={14} />
            Edit Profile & Office Hours
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', background: 'var(--status-critical-bg)', border: '1px solid var(--status-critical)', borderRadius: '8px', color: 'var(--status-critical)', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {/* KPI Highlight Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '32px' }}>
        {/* Metric 1 */}
        <div className="card" style={{ padding: '20px', margin: 0, borderLeft: '4px solid var(--empiria-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)' }}>
              Assigned Mentees
            </span>
            <Users size={18} style={{ color: 'var(--empiria-primary)' }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {activeCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Active cohort students under direct advisory
          </div>
        </div>

        {/* Metric 2 */}
        <div className="card" style={{ padding: '20px', margin: 0, borderLeft: '4px solid var(--empiria-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)' }}>
              Pre-Session Briefings
            </span>
            <Sparkles size={18} style={{ color: 'var(--empiria-secondary)' }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {briefingsCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Synthesized competency trajectories ready
          </div>
        </div>

        {/* Metric 3 */}
        <div className="card" style={{ padding: '20px', margin: 0, borderLeft: '4px solid var(--status-warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)' }}>
              Support Requests
            </span>
            <AlertTriangle size={18} style={{ color: 'var(--status-warning)' }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {pendingRequests}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Open student inquiries requiring mentor review
          </div>
        </div>

        {/* Metric 4 */}
        <div className="card" style={{ padding: '20px', margin: 0, borderLeft: '4px solid #5E6470' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)' }}>
              Workload Headroom
            </span>
            <Clock size={18} style={{ color: '#5E6470' }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {Math.max(0, 15 - activeCount)} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>slots open</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Institutional cap: 15 primary mentees
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Column: Assigned Mentees Table */}
        <div>
          <div className="card" style={{ margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--empiria-border)' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', margin: 0, fontFamily: 'var(--font-display)' }}>
                  Assigned Mentees & Advisory Cohort
                </h2>
                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Students receiving continuous academic & capability mentoring under your supervision.
                </p>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigate('/mentor/assigned-students')}
              >
                View All Mentees
              </button>
            </div>

            {assignments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <Users size={36} style={{ color: 'var(--empiria-border)', marginBottom: '12px' }} />
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                  No Active Mentee Assignments Yet
                </h4>
                <p style={{ fontSize: '13px', maxWidth: '420px', margin: '0 auto 16px auto' }}>
                  The Hungarian matching algorithm or department administrators will allocate students based on capability focus and advisory headroom.
                </p>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNavigate('/mentor/subject-students')}
                >
                  Explore Subject Mentoring Matching
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--empiria-surface-muted)', borderBottom: '1px solid var(--empiria-border)' }}>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>Student</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>Scope & Role</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>Assigned Date</th>
                      <th style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((asg) => (
                      <tr key={asg.id} style={{ borderBottom: '1px solid var(--empiria-border)' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {asg.student_name || 'Student Mentee'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {asg.student_email || asg.student_id.substring(0, 10)}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            className="badge"
                            style={{
                              background: asg.assignment_type === 'primary' ? 'var(--empiria-primary-subtle)' : 'var(--empiria-secondary-subtle)',
                              color: asg.assignment_type === 'primary' ? 'var(--empiria-primary)' : 'var(--empiria-secondary)',
                              textTransform: 'capitalize',
                              fontWeight: 600,
                            }}
                          >
                            {asg.assignment_type} Mentor
                          </span>
                          {asg.subject_scope && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {asg.subject_scope}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                          {asg.assigned_at ? new Date(asg.assigned_at).toLocaleDateString() : 'Active'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Open Student 360 Workspace"
                              onClick={() => onNavigate(`/mentor/student-360`)}
                              style={{ padding: '4px 8px' }}
                            >
                              <GraduationCap size={13} />
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Generate AI Briefing"
                              onClick={() => onNavigate(`/mentor/briefings`)}
                              style={{ padding: '4px 8px' }}
                            >
                              <Sparkles size={13} />
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Send Message"
                              onClick={() => {
                                if (onOpenConversation) {
                                  onOpenConversation()
                                } else {
                                  onNavigate('/mentor/messaging')
                                }
                              }}
                              style={{ padding: '4px 8px' }}
                            >
                              <MessageSquare size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pre-Session Briefing Quick-Launch & Workload */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick-Launch Pre-Session Briefing Card */}
          <div className="card" style={{ margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Sparkles size={18} style={{ color: 'var(--empiria-primary)' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: 0, fontFamily: 'var(--font-display)' }}>
                Pre-Session AI Briefings
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '16px' }}>
              Deterministic synthesis of recent competency assessments, verified progress differentials, and recommended advisory prompts.
            </p>

            <button
              className="btn btn-primary"
              onClick={() => onNavigate('/mentor/briefings')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Sparkles size={15} />
              Open Briefing Generator
            </button>
          </div>

          {/* Quick Navigation Action Grid */}
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '14px', fontFamily: 'var(--font-display)' }}>
              Mentor Workspace Shortcuts
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => onNavigate('/mentor/meetings')}
                style={{ width: '100%', justifyContent: 'space-between', display: 'flex', alignItems: 'center', padding: '10px 14px' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={15} style={{ color: 'var(--empiria-primary)' }} />
                  Meeting Schedule & Log
                </span>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => onNavigate('/mentor/review-queue')}
                style={{ width: '100%', justifyContent: 'space-between', display: 'flex', alignItems: 'center', padding: '10px 14px' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={15} style={{ color: 'var(--status-warning)' }} />
                  Academic Review Queue
                </span>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => onNavigate('/mentor/improvement-plans')}
                style={{ width: '100%', justifyContent: 'space-between', display: 'flex', alignItems: 'center', padding: '10px 14px' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={15} style={{ color: 'var(--empiria-secondary)' }} />
                  Improvement Plans & Interventions
                </span>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => onNavigate('/mentor/student-360')}
                style={{ width: '100%', justifyContent: 'space-between', display: 'flex', alignItems: 'center', padding: '10px 14px' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GraduationCap size={15} style={{ color: '#5E6470' }} />
                  Student 360 Workspace
                </span>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => onNavigate('/mentor/workload')}
                style={{ width: '100%', justifyContent: 'space-between', display: 'flex', alignItems: 'center', padding: '10px 14px' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={15} style={{ color: 'var(--text-muted)' }} />
                  Availability & Workload Profile
                </span>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
