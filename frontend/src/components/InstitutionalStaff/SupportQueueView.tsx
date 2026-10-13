import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import type { SupportRequest } from '../../types'
import { CheckCircle2, AlertCircle, RefreshCw, PlusCircle, X } from 'lucide-react'

export const SupportQueueView: React.FC = () => {
  const [requests, setRequests] = useState<SupportRequest[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Intervention Modal State
  const [activeRequest, setActiveRequest] = useState<SupportRequest | null>(null)
  const [agreedActions, setAgreedActions] = useState<string>('')
  const [followUpDate, setFollowUpDate] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [modalSuccess, setModalSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const data = await api.listSupportRequests()
      setRequests(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenInterventionModal = (req: SupportRequest) => {
    setActiveRequest(req)
    setAgreedActions('')
    setFollowUpDate('')
    setNotes('')
    setModalSuccess(null)
  }

  const handleRecordIntervention = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeRequest || !agreedActions.trim()) return

    try {
      setSubmitting(true)
      await api.recordIntervention(activeRequest.id, {
        intervention_date: new Date().toISOString().split('T')[0],
        agreed_actions: agreedActions,
        follow_up_date: followUpDate || undefined,
        notes: notes || undefined,
      })
      setModalSuccess('Intervention record created and linked successfully!')
      setTimeout(() => {
        setActiveRequest(null)
        loadRequests()
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <AlertCircle size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            Institutional Support & Intervention Dispatch
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Triage escalated student requests, schedule mentoring intervention meetings, and record formally agreed action items with calendar follow-up dates.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title" style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>Institutional Support Queue & Intervention Records</h2>
            <p className="card-subtitle">
              Manage student review requests and maintain traceable intervention actions.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadRequests} disabled={loading}>
            <RefreshCw size={12} className={loading ? 'spin' : ''} /> Refresh Queue
          </button>
        </div>

        {error && (
          <div className="callout callout-warning">
            <AlertCircle size={18} />
            <div>{error}</div>
          </div>
        )}

        {requests.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '16px 0' }}>
            No open support requests in the institutional queue.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {requests.map((req) => (
              <div
                key={req.id}
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '18px',
                  background: 'var(--empiria-surface)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>{req.subject}</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Student: <strong>{req.student_name}</strong> ({req.student_email})
                    </span>
                  </div>
                  <span className={`badge ${req.status === 'in_progress' ? 'badge-info' : 'badge-neutral'}`}>
                    {req.status}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-main)', background: 'var(--empiria-surface-muted)', padding: '10px 12px', borderRadius: '6px', marginBottom: '12px' }}>
                  {req.message}
                </p>

                {/* Logged Interventions List */}
                {req.interventions && req.interventions.length > 0 && (
                  <div style={{ marginTop: '10px', marginBottom: '12px', borderTop: '1px solid var(--empiria-border)', paddingTop: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--empiria-primary)', textTransform: 'uppercase' }}>
                      Logged Interventions ({req.interventions.length}):
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                      {req.interventions.map((inv) => (
                        <div key={inv.id} style={{ fontSize: '12px', background: 'var(--empiria-surface-muted)', padding: '8px 10px', borderRadius: '4px' }}>
                          <div><strong>Agreed Actions:</strong> {inv.agreed_actions}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                            Logged by {inv.actor_name} on {inv.intervention_date}
                            {inv.follow_up_date && ` • Follow-up: ${inv.follow_up_date}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => handleOpenInterventionModal(req)}>
                    <PlusCircle size={13} /> Record Intervention
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Intervention Recording Modal */}
      {activeRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
                Record P0 Intervention: {activeRequest.student_name}
              </h3>
              <button
                onClick={() => setActiveRequest(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {modalSuccess ? (
              <div className="callout callout-success">
                <CheckCircle2 size={18} />
                <div>{modalSuccess}</div>
              </div>
            ) : (
              <form onSubmit={handleRecordIntervention}>
                <div className="form-group">
                  <label className="form-label">Agreed Actions / Plan Adjustments</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="e.g. Conducted 1-on-1 code review; agreed to complete window functions portfolio module..."
                    value={agreedActions}
                    onChange={(e) => setAgreedActions(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Follow-up Date (Optional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Internal Advisor Notes (Optional)</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Private staff notes regarding engagement or prerequisites..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setActiveRequest(null)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Recording...' : 'Commit Intervention Record'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
