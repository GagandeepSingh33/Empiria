import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Plus,
  RefreshCw,
  CheckCircle,
  Clock,
  Archive,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react'
import { api } from '../../api'

interface AcademicTerm {
  id: string
  name: string
  start_date: string
  end_date: string
  status: string
  created_at: string
}

export const AcademicCalendarView: React.FC = () => {
  const [terms, setTerms] = useState<AcademicTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // New term form state
  const [termName, setTermName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    loadTerms()
  }, [])

  const loadTerms = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.listAcademicTerms()
      setTerms(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load academic terms.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!termName || !startDate || !endDate) return

    try {
      setSubmitting(true)
      await api.createAcademicTerm({
        name: termName,
        start_date: startDate,
        end_date: endDate,
      })
      setShowAddModal(false)
      setTermName('')
      setStartDate('')
      setEndDate('')
      loadTerms()
    } catch (err: any) {
      alert(`Error creating term: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateStatus = async (termId: string, status: string) => {
    try {
      await api.updateAcademicTerm(termId, { status })
      loadTerms()
    } catch (err: any) {
      alert(`Error updating term status: ${err.message}`)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle size={12} /> Active Term
          </span>
        )
      case 'upcoming':
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} /> Upcoming
          </span>
        )
      case 'completed':
        return (
          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Layers size={12} /> Completed
          </span>
        )
      default:
        return (
          <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Archive size={12} /> Archived
          </span>
        )
    }
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--empiria-text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
            <span>Institution Administration</span>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--empiria-primary)' }}>Academic Years & Terms</span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={24} style={{ color: 'var(--empiria-primary)' }} />
            Academic Calendar & Term Management
          </h2>
          <p style={{ color: 'var(--empiria-text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Configure institutional semesters, academic sessions, and scheduling boundary dates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={loadTerms} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} />
            Add Academic Term
          </button>
        </div>
      </div>

      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <Calendar size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            Institutional Academic Terms & Timetable Cycles
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Define semester boundaries, active academic cycles, and registration deadlines that anchor course offerings, attendance tracking, and grading periods.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', background: 'var(--badge-fail-bg)', border: '1px solid var(--badge-fail-border)', borderRadius: '10px', color: 'var(--badge-fail-text)', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Overview Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Configured Terms
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--empiria-text-primary)', marginTop: '8px' }}>
            {terms.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', marginTop: '4px' }}>
            Official calendar sessions
          </div>
        </div>

        <div className="card" style={{ padding: '20px', borderColor: 'var(--empiria-border)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--empiria-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Session
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--empiria-secondary)', marginTop: '8px' }}>
            {terms.find((t) => t.status === 'active')?.name || 'None Active'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', marginTop: '4px' }}>
            Current instruction term
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Upcoming Terms
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', marginTop: '8px' }}>
            {terms.filter((t) => t.status === 'upcoming').length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Scheduled future terms
          </div>
        </div>
      </div>

      {/* Terms Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
            Configured Academic Sessions
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {terms.length} terms registered
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px auto', color: 'var(--primary-500)' }} />
            Loading academic terms...
          </div>
        ) : terms.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Calendar size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <p>No academic terms configured yet.</p>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ marginTop: '12px' }}>
              Add First Academic Term
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Academic Term / Session</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {terms.map((term) => (
                  <tr key={term.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{term.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {term.id.slice(0, 8)}...</div>
                    </td>
                    <td>{term.start_date}</td>
                    <td>{term.end_date}</td>
                    <td>{getStatusBadge(term.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        {term.status !== 'active' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleUpdateStatus(term.id, 'active')}
                            title="Set as Active Term"
                          >
                            Activate
                          </button>
                        )}
                        {term.status === 'active' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleUpdateStatus(term.id, 'completed')}
                            title="Mark as Completed"
                          >
                            Complete
                          </button>
                        )}
                        {term.status !== 'archived' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleUpdateStatus(term.id, 'archived')}
                            title="Archive Term"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Term Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              background: 'var(--empiria-surface)',
              border: '1px solid var(--empiria-border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: 'var(--primary-500)' }} />
                New Academic Term
              </h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddModal(false)}
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTerm}>
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 500 }}>
                  Term Name (e.g., Fall 2026, Semester 1 2026)
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', marginTop: '6px' }}
                  placeholder="Fall 2026"
                  value={termName}
                  onChange={(e) => setTermName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 500 }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    style={{ width: '100%', marginTop: '6px' }}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 500 }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    style={{ width: '100%', marginTop: '6px' }}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {submitting ? 'Creating...' : 'Create Academic Term'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
