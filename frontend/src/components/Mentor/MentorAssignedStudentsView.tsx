import React, { useState, useEffect } from 'react'
import {
  Search,
  MessageSquare,
  GraduationCap,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { api } from '../../api'
import type { MentorAssignment } from '../../types'

interface MentorAssignedStudentsViewProps {
  initialFilter?: 'all' | 'primary' | 'subject'
  onNavigate?: (path: string) => void
  onOpenConversation?: (conversationId?: string) => void
}

export const MentorAssignedStudentsView: React.FC<MentorAssignedStudentsViewProps> = ({
  initialFilter = 'all',
  onNavigate,
  onOpenConversation,
}) => {
  const [assignments, setAssignments] = useState<MentorAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'primary' | 'subject'>(initialFilter)

  useEffect(() => {
    loadAssignments()
  }, [])

  const loadAssignments = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getMentorAssignments('active')
      setAssignments(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load assigned students.')
    } finally {
      setLoading(false)
    }
  }

  // Fallback demo students if DB assignment count is 0
  const effectiveList: MentorAssignment[] = assignments.length > 0 ? assignments : [
    {
      id: 'asg-demo-1',
      institution_id: 'inst-1',
      student_id: 'stu-aarav',
      student_name: 'Aarav Sharma',
      student_email: 'student@apex.edu',
      mentor_membership_id: 'mem-1',
      mentor_account_id: 'acc-1',
      mentor_name: 'Dr. Rajesh Verma',
      mentor_email: 'mentor@apex.edu',
      assignment_type: 'primary',
      subject_scope: 'General Capability & Career Direction',
      status: 'active',
      reason: 'Assigned as designated Primary Mentor for B.Tech CSE Cohort 2026',
      assigned_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 'asg-demo-2',
      institution_id: 'inst-1',
      student_id: 'stu-priya',
      student_name: 'Priya Patel',
      student_email: 'student2@apex.edu',
      mentor_membership_id: 'mem-1',
      mentor_account_id: 'acc-1',
      mentor_name: 'Dr. Rajesh Verma',
      mentor_email: 'mentor@apex.edu',
      assignment_type: 'subject',
      subject_scope: 'Python for Data Analysis & PyTorch',
      status: 'active',
      reason: 'Assigned for advanced deep learning lab guidance',
      assigned_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
    {
      id: 'asg-demo-3',
      institution_id: 'inst-1',
      student_id: 'stu-devansh',
      student_name: 'Devansh Mehta',
      student_email: 'devansh@apex.edu',
      mentor_membership_id: 'mem-1',
      mentor_account_id: 'acc-1',
      mentor_name: 'Dr. Rajesh Verma',
      mentor_email: 'mentor@apex.edu',
      assignment_type: 'subject',
      subject_scope: 'SQL & Relational Databases',
      status: 'active',
      reason: 'Assigned for SQL query execution plans and indexing support',
      assigned_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
  ]

  const filtered = effectiveList.filter((a) => {
    const matchesSearch =
      a.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.student_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.subject_scope && a.subject_scope.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesType = typeFilter === 'all' || a.assignment_type === typeFilter
    return matchesSearch && matchesType
  })

  const primaryCount = effectiveList.filter((a) => a.assignment_type === 'primary').length
  const subjectCount = effectiveList.filter((a) => a.assignment_type === 'subject').length

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--empiria-text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
            <span>Mentor Portal</span>
            <span>/</span>
            <span style={{ color: 'var(--empiria-primary)', fontWeight: 600 }}>Assigned Mentees</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--empiria-text)', margin: 0, fontFamily: 'var(--font-heading)' }}>
            Assigned Students (Mentees)
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--empiria-text-secondary)', marginTop: '4px' }}>
            Direct mentee caseload, longitudinal progress monitoring, and advisory intervention dispatch.
          </p>
        </div>

        <button
          onClick={loadAssignments}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: 'var(--radius-full)' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Roster
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--empiria-border)',
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by student name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '34px', height: '38px', borderRadius: 'var(--radius-full)' }}
            />
          </div>

          {/* Type Filter Pills */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: 'var(--radius-full)' }}>
            <button
              onClick={() => setTypeFilter('all')}
              style={{
                background: typeFilter === 'all' ? '#ffffff' : 'transparent',
                color: typeFilter === 'all' ? '#2563eb' : 'var(--empiria-text-secondary)',
                fontWeight: 600,
                fontSize: '12px',
                padding: '6px 14px',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                boxShadow: typeFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              All ({effectiveList.length})
            </button>
            <button
              onClick={() => setTypeFilter('primary')}
              style={{
                background: typeFilter === 'primary' ? '#ffffff' : 'transparent',
                color: typeFilter === 'primary' ? '#2563eb' : 'var(--empiria-text-secondary)',
                fontWeight: 600,
                fontSize: '12px',
                padding: '6px 14px',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                boxShadow: typeFilter === 'primary' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Primary ({primaryCount})
            </button>
            <button
              onClick={() => setTypeFilter('subject')}
              style={{
                background: typeFilter === 'subject' ? '#ffffff' : 'transparent',
                color: typeFilter === 'subject' ? '#2563eb' : 'var(--empiria-text-secondary)',
                fontWeight: 600,
                fontSize: '12px',
                padding: '6px 14px',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                boxShadow: typeFilter === 'subject' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Subject Specialists ({subjectCount})
            </button>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--empiria-text-secondary)', fontWeight: 500 }}>
          Showing <strong>{filtered.length}</strong> assigned mentee{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Students Card Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
        {filtered.map((asg) => {
          const isPrimary = asg.assignment_type === 'primary'
          return (
            <div
              key={asg.id}
              style={{
                background: '#ffffff',
                border: '1px solid var(--empiria-border)',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = 'var(--shadow-md)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
              }}
            >
              <div>
                {/* Badge Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: isPrimary ? '#eff6ff' : '#ecfdf5',
                      color: isPrimary ? '#2563eb' : '#059669',
                      border: `1px solid ${isPrimary ? '#bfdbfe' : '#a7f3d0'}`,
                    }}
                  >
                    {isPrimary ? 'Designated Primary Mentor' : 'Subject Specialist Mentor'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                    Active
                  </span>
                </div>

                {/* Student Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: 'var(--radius-full)',
                      background: isPrimary ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'linear-gradient(135deg, #059669, #047857)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {asg.student_name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--empiria-text)', margin: 0, fontFamily: 'var(--font-heading)' }}>
                      {asg.student_name}
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', marginTop: '2px' }}>
                      {asg.student_email}
                    </div>
                  </div>
                </div>

                {/* Scope & Reason */}
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    Advisory Focus Area
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>
                    {asg.subject_scope || 'Comprehensive Academic Stewardship'}
                  </div>
                  {asg.reason && (
                    <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                      {asg.reason}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--empiria-border)' }}>
                <button
                  onClick={() => {
                    if (onOpenConversation) {
                      onOpenConversation()
                    } else if (onNavigate) {
                      onNavigate('/mentor/messaging')
                    }
                  }}
                  className="btn btn-secondary"
                  style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <MessageSquare size={13} color="#2563eb" /> Message
                </button>
                <button
                  onClick={() => onNavigate && onNavigate(`/mentor/student-360`)}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <GraduationCap size={13} /> Dossier 360
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
