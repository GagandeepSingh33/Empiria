import React, { useState, useEffect } from 'react'
import {
  Compass,
  Code2,
  Plus,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react'
import { api } from '../../api'
import type {
  MentorAssignment,
  AvailableMentor,
  StudentProfile,
} from '../../types'

export const MentorshipManagementView: React.FC = () => {
  const [assignments, setAssignments] = useState<MentorAssignment[]>([])
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [availableMentors, setAvailableMentors] = useState<AvailableMentor[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'active' | 'ended'>('active')

  // Create Assignment Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedMentorMembershipId, setSelectedMentorMembershipId] = useState('')
  const [assignmentType, setAssignmentType] = useState<'primary' | 'subject'>('primary')
  const [subjectScope, setSubjectScope] = useState('SQL & Relational Databases')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // End Assignment Modal State
  const [endModalOpen, setEndModalOpen] = useState(false)
  const [assignmentToEnd, setAssignmentToEnd] = useState<MentorAssignment | null>(null)
  const [endReason, setEndReason] = useState('')
  const [ending, setEnding] = useState(false)

  useEffect(() => {
    loadData()
  }, [filterType])

  const loadData = async () => {
    try {
      setLoading(true)
      setErrorMsg(null)
      const statusParam = filterType === 'all' ? undefined : filterType
      const [assns, stds, mtrs] = await Promise.all([
        api.getMentorAssignments(statusParam),
        api.listStudents(),
        api.getAvailableMentors(),
      ])
      setAssignments(assns)
      setStudents(stds)
      setAvailableMentors(mtrs)

      if (stds.length > 0 && !selectedStudentId) {
        setSelectedStudentId(stds[0].id)
      }
      if (mtrs.length > 0 && !selectedMentorMembershipId) {
        setSelectedMentorMembershipId(mtrs[0].membership_id)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load mentorship records')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentId || !selectedMentorMembershipId) return

    try {
      setSubmitting(true)
      setSubmitError(null)
      await api.createMentorAssignment({
        student_id: selectedStudentId,
        mentor_membership_id: selectedMentorMembershipId,
        assignment_type: assignmentType,
        subject_scope: assignmentType === 'subject' ? subjectScope : undefined,
        reason: reason || undefined,
      })
      setModalOpen(false)
      setReason('')
      await loadData()
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create mentor assignment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenEndModal = (assn: MentorAssignment) => {
    setAssignmentToEnd(assn)
    setEndReason('Completed mentoring tenure')
    setEndModalOpen(true)
  }

  const handleConfirmEnd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignmentToEnd) return

    try {
      setEnding(true)
      await api.endMentorAssignment(assignmentToEnd.id, endReason)
      setEndModalOpen(false)
      setAssignmentToEnd(null)
      await loadData()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to end assignment')
    } finally {
      setEnding(false)
    }
  }

  const subjectOptions = [
    'SQL & Relational Databases',
    'Python for Data Analysis',
    'Descriptive & Inferential Statistics',
    'Data Cleaning & Wrangling',
    'Business Intelligence & Visualization',
    'Exploratory Data Analysis',
    'Data Storytelling & Presentation',
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em', fontFamily: 'var(--font-heading)' }}>
            Mentorship Management
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Assign Primary Mentors and Subject Specialists to students with preserved historical tracking.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={loadData}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Assign Mentor
          </button>
        </div>
      </div>

      <div className="explainer-banner">
        <div className="explainer-icon-box">
          <Compass size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            Institutional Mentorship Lifecycle Administration
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Assign Primary Mentors for holistic advisory or Subject Specialists for targeted course mastery. Trace full assignment history, reasons, and active mentorship relationships.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="callout callout-warning">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        {(['active', 'ended', 'all'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterType(tab)}
            style={{
              background: filterType === tab ? 'var(--primary-600)' : 'transparent',
              color: filterType === tab ? '#ffffff' : 'var(--text-muted)',
              border: filterType === tab ? 'none' : '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'active' ? 'Active Assignments' : tab === 'ended' ? 'Archived History' : 'All Assignments'}
          </button>
        ))}
      </div>

      {/* Assignments Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
            Loading mentorship assignments...
          </div>
        ) : assignments.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Compass size={36} color="var(--text-dim)" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
              No {filterType} assignments found
            </h4>
            <p style={{ fontSize: '13px' }}>Use the "Assign Mentor" button to designate a mentor.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-alt)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Student</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Mentor</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Assignment Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Subject / Scope</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Assigned Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => {
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {a.student_name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {a.student_email}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {a.mentor_name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {a.mentor_email}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {a.assignment_type === 'primary' ? (
                          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Compass size={12} /> PRIMARY
                          </span>
                        ) : (
                          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Code2 size={12} /> SUBJECT
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', color: 'var(--text-main)' }}>
                        {a.assignment_type === 'primary' ? (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Overall Development</span>
                        ) : (
                          <strong>{a.subject_scope || 'General'}</strong>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                        {new Date(a.assigned_at).toLocaleDateString()}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${a.status === 'active' ? 'badge-success' : 'badge-neutral'}`} style={{ textTransform: 'uppercase' }}>
                          {a.status}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {a.status === 'active' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEndModal(a)}
                            style={{ fontSize: '11px', padding: '3px 8px', color: 'var(--status-gap)' }}
                          >
                            End Assignment
                          </button>
                        )}
                        {a.status !== 'active' && a.ended_at && (
                          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                            Ended {new Date(a.ended_at).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Mentor Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--empiria-overlay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--empiria-surface)',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Assign Mentor to Student
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Designate a strategic Primary Mentor or domain Subject Specialist.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {submitError && (
              <div className="callout callout-warning" style={{ marginBottom: '16px' }}>
                <AlertCircle size={16} />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAssignment}>
              <div className="form-group">
                <label className="form-label">Select Student</label>
                <select
                  className="form-select"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  required
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({s.email}) - {s.cohort_name || 'Cohort'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Select Mentor</label>
                <select
                  className="form-select"
                  value={selectedMentorMembershipId}
                  onChange={(e) => setSelectedMentorMembershipId(e.target.value)}
                  required
                >
                  {availableMentors.map((m) => (
                    <option key={m.membership_id} value={m.membership_id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Mentorship Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div
                    onClick={() => setAssignmentType('primary')}
                    style={{
                      border: assignmentType === 'primary' ? '2px solid var(--primary-600)' : '1px solid var(--border-subtle)',
                      background: assignmentType === 'primary' ? 'var(--empiria-primary-subtle)' : 'transparent',
                      padding: '12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Compass size={14} color="var(--empiria-primary)" /> PRIMARY
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      1 active mentor for overall portfolio & career growth.
                    </div>
                  </div>

                  <div
                    onClick={() => setAssignmentType('subject')}
                    style={{
                      border: assignmentType === 'subject' ? '2px solid var(--primary-600)' : '1px solid var(--border-subtle)',
                      background: assignmentType === 'subject' ? 'var(--empiria-surface-muted)' : 'transparent',
                      padding: '12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Code2 size={14} color="var(--empiria-secondary)" /> SUBJECT
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Specialized advisor scoped to specific competency.
                    </div>
                  </div>
                </div>
              </div>

              {assignmentType === 'subject' && (
                <div className="form-group">
                  <label className="form-label">Subject / Competency Scope</label>
                  <select
                    className="form-select"
                    value={subjectScope}
                    onChange={(e) => setSubjectScope(e.target.value)}
                  >
                    {subjectOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Assignment Reason / Focus Notes</label>
                <input
                  type="text"
                  className="form-input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Lead cohort advisor or SQL project mentor"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* End Assignment Confirmation Modal */}
      {endModalOpen && assignmentToEnd && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--empiria-overlay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--empiria-surface)',
              borderRadius: '12px',
              maxWidth: '460px',
              width: '100%',
              padding: '28px',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
              End Mentorship Assignment
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              This will transition the assignment to <strong>ENDED</strong> status and archive the record, preserving full history.
            </p>

            <form onSubmit={handleConfirmEnd}>
              <div className="form-group">
                <label className="form-label">Reason for Ending</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={endReason}
                  onChange={(e) => setEndReason(e.target.value)}
                  placeholder="e.g. Completed module or reassigned"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEndModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ending}
                  className="btn btn-primary"
                  style={{ background: 'var(--empiria-danger)', borderColor: 'var(--empiria-danger)' }}
                >
                  {ending ? 'Ending...' : 'End Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
