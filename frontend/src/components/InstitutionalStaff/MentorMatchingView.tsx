import { useState, useEffect } from 'react'
import { api } from '../../api'
import {
  Compass,
  Sliders,
  CheckCircle,
  XCircle,
  Play,
} from 'lucide-react'

export function MentorMatchingView() {
  const [runs, setRuns] = useState<any[]>([])
  const [selectedRun, setSelectedRun] = useState<any | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Matching configuration
  const [assignmentType, setAssignmentType] = useState<string>('primary')
  const [subjectScope, setSubjectScope] = useState<string>('Data Analysis')
  const [capacityMultiplier, setCapacityMultiplier] = useState<number>(1.0)
  const [scope, setScope] = useState<string>('all_students')

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false)
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState<string>('')

  useEffect(() => {
    loadRuns()
  }, [])

  const loadRuns = async () => {
    try {
      setLoading(true)
      const data = await api.getMatchingRuns()
      setRuns(data || [])
      if (data && data.length > 0) {
        loadRunDetail(data[0].id)
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load matching runs.' })
    } finally {
      setLoading(false)
    }
  }

  const loadRunDetail = async (runId: string) => {
    try {
      const detail = await api.getMatchingRunDetail(runId)
      setSelectedRun(detail)
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load proposal details.' })
    }
  }

  const handleTriggerMatching = async () => {
    try {
      setActionLoading(true)
      setStatusMsg(null)
      const res = await api.triggerMatchingRun({
        assignment_type: assignmentType,
        subject_scope: assignmentType === 'subject' ? subjectScope : undefined,
        capacity_multiplier: capacityMultiplier,
        scope,
      })
      setStatusMsg({
        type: 'success',
        text: `Hungarian optimization matching completed: ${res.proposals_count} proposals generated!`,
      })
      await loadRuns()
      setSelectedRun(res)
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to execute matching run.' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleApproveProposal = async (proposalId: string) => {
    try {
      setActionLoading(true)
      await api.approveMatchingProposal(proposalId, 'Approved by staff review')
      setStatusMsg({ type: 'success', text: 'Proposal approved! Official active mentor assignment created.' })
      if (selectedRun) {
        await loadRunDetail(selectedRun.id)
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to approve proposal.' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenReject = (proposalId: string) => {
    setRejectTargetId(proposalId)
    setRejectReason('')
    setRejectModalOpen(true)
  }

  const handleConfirmReject = async () => {
    if (!rejectTargetId || !rejectReason.trim()) return
    try {
      setActionLoading(true)
      await api.rejectMatchingProposal(rejectTargetId, rejectReason)
      setStatusMsg({ type: 'success', text: 'Proposal rejected with documented justification.' })
      setRejectModalOpen(false)
      if (selectedRun) {
        await loadRunDetail(selectedRun.id)
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to reject proposal.' })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="section-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>
            <Compass size={24} color="var(--empiria-primary)" />
            Capacity-Aware Mentor Matching (Hungarian Optimization)
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
            Linear sum assignment optimization matching student competency gaps with mentor workload capacities and domain proficiencies. Proposals require human approval before assignment.
          </p>
        </div>
      </div>

      {/* Educational Explainer Banner */}
      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <Compass size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#2563eb', background: '#dbeafe', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
              Dual-Tier Algorithmic Matching
            </span>
            <div className="explainer-title" style={{ margin: 0 }}>
              How Mentor Allocation Works
            </div>
          </div>
          <div className="explainer-text">
            Using the Hungarian linear assignment algorithm, Empiria pairs students with faculty mentors based on required technical domains, demonstrated rubric deficits, and faculty capacity caps. Deans review and confirm matches with one click before student notification.
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className={`status-banner status-${statusMsg.type}`} style={{ marginBottom: '20px' }}>
          {statusMsg.text}
        </div>
      )}

      {/* Configuration & Trigger Card */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} /> Optimization Run Parameters
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Assignment Type</label>
            <select
              className="form-control"
              value={assignmentType}
              onChange={(e) => setAssignmentType(e.target.value)}
            >
              <option value="primary">Primary Mentor (Career & Holistic)</option>
              <option value="subject">Subject Mentor (Domain Specific)</option>
            </select>
          </div>

          {assignmentType === 'subject' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Subject Scope</label>
              <select
                className="form-control"
                value={subjectScope}
                onChange={(e) => setSubjectScope(e.target.value)}
              >
                <option value="SQL">SQL & Database Querying</option>
                <option value="Python">Python Data Science</option>
                <option value="Statistics">Applied Statistics & Math</option>
                <option value="Data Analysis">Exploratory Data Analysis</option>
                <option value="Visualization">Data Visualization & BI</option>
              </select>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Capacity Multiplier: <strong>{capacityMultiplier}x</strong>
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.25"
              value={capacityMultiplier}
              onChange={(e) => setCapacityMultiplier(parseFloat(e.target.value))}
              style={{ width: '100%', marginTop: '6px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Candidate Scope</label>
            <select
              className="form-control"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="all_students">All Active Students</option>
              <option value="unassigned_only">Unassigned Students Only</option>
            </select>
          </div>

          <div>
            <button
              className="btn btn-primary"
              onClick={handleTriggerMatching}
              disabled={actionLoading}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Play size={16} /> Run Hungarian Matching
            </button>
          </div>
        </div>
      </div>

      {/* Matching Proposals Table */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
            Proposed Matches ({selectedRun ? selectedRun.proposals_count : 0})
          </h3>

          {runs.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Historical Runs:</span>
              <select
                className="form-control"
                style={{ width: 'auto', fontSize: '13px' }}
                value={selectedRun?.id || ''}
                onChange={(e) => loadRunDetail(e.target.value)}
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    Run {r.id.substring(0, 8)} ({r.assignment_type} - {new Date(r.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>Loading matching proposals...</div>
        ) : !selectedRun || selectedRun.proposals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <Compass size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <p>No proposals available. Run the matching algorithm above to generate optimal student-mentor pairs.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Candidate</th>
                  <th>Proposed Mentor</th>
                  <th>Type & Scope</th>
                  <th>Compatibility Score</th>
                  <th>Optimization Factors</th>
                  <th>Status</th>
                  <th>Human Decision</th>
                </tr>
              </thead>
              <tbody>
                {selectedRun.proposals.map((prop: any) => {
                  const scorePct = Math.round(prop.compatibility_score * 100)
                  const factors = prop.contributing_factors || {}

                  return (
                    <tr key={prop.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{prop.student_name || 'Student'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{prop.student_identifier}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{prop.mentor_name || 'Mentor'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{prop.mentor_email}</div>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: prop.assignment_type === 'primary' ? 'var(--empiria-primary-subtle)' : 'var(--empiria-surface-muted)',
                            color: prop.assignment_type === 'primary' ? 'var(--empiria-primary)' : 'var(--empiria-secondary)',
                            textTransform: 'uppercase',
                          }}
                        >
                          {prop.assignment_type}
                        </span>
                        {prop.subject_scope && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Scope: {prop.subject_scope}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '60px', height: '6px', background: 'var(--empiria-border)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${scorePct}%`, height: '100%', background: scorePct >= 70 ? 'var(--empiria-success)' : 'var(--empiria-primary)' }} />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{scorePct}%</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        <div>Skills: {factors.matched_competencies?.join(', ') || 'Domain Match'}</div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          Capacity: {factors.current_workload ?? 0} / {factors.effective_capacity ?? 5} slots
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background:
                              prop.approval_status === 'approved' ? 'var(--empiria-success-subtle)' : prop.approval_status === 'rejected' ? 'var(--empiria-danger-subtle)' : 'var(--empiria-warning-subtle)',
                            color:
                              prop.approval_status === 'approved' ? 'var(--empiria-success)' : prop.approval_status === 'rejected' ? 'var(--empiria-danger)' : 'var(--empiria-warning)',
                            textTransform: 'uppercase',
                          }}
                        >
                          {prop.approval_status}
                        </span>
                      </td>
                      <td>
                        {prop.approval_status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleApproveProposal(prop.id)}
                              disabled={actionLoading}
                              style={{ fontSize: '12px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <CheckCircle size={13} /> Approve
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenReject(prop.id)}
                              disabled={actionLoading}
                              style={{ fontSize: '12px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--empiria-danger)' }}
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {prop.decision_reason || 'Reviewed'}
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

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <div className="modal-backdrop" onClick={() => setRejectModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Reject Proposal</h3>
              <button className="modal-close" onClick={() => setRejectModalOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Reason for Rejection</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="State the rationale for declining this proposal..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setRejectModalOpen(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmReject}
                disabled={actionLoading || !rejectReason.trim()}
                style={{ background: 'var(--empiria-danger)', borderColor: 'var(--empiria-danger)' }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
