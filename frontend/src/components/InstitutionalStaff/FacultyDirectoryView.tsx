import React, { useState, useEffect } from 'react'
import {
  Users,
  Plus,
  RefreshCw,
  Shield,
  ChevronRight,
} from 'lucide-react'
import { api } from '../../api'

interface Membership {
  id: string
  account_id: string
  email: string
  display_name: string
  status: string
  roles: string[]
  created_at: string
}

export const FacultyDirectoryView: React.FC = () => {
  const [members, setMembers] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('faculty_assessor')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadMembers()
  }, [])

  const loadMembers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.listMemberships()
      setMembers(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load faculty and staff directory.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !inviteRole) return
    try {
      setSubmitting(true)
      await api.createInvitation({ email: inviteEmail, role: inviteRole })
      alert(`Invitation dispatched to ${inviteEmail} for role ${inviteRole}.`)
      setShowInviteModal(false)
      setInviteEmail('')
      loadMembers()
    } catch (err: any) {
      alert(`Error sending invitation: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'institution_admin':
        return <span className="badge badge-primary">Institution Admin</span>
      case 'faculty_assessor':
        return <span className="badge badge-info">Faculty Assessor</span>
      case 'data_operator':
        return <span className="badge badge-warning">Data Operator</span>
      case 'mentor_advisor':
        return <span className="badge badge-secondary">Mentor Advisor</span>
      default:
        return <span className="badge badge-secondary">{role}</span>
    }
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>
            <span>Institution Administration</span>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--empiria-primary)', fontWeight: 600 }}>Staff & Faculty Directory</span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>
            <Users size={24} style={{ color: 'var(--empiria-primary)' }} />
            Staff & Faculty Directory & Access Governance
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Manage faculty assessors, data operators, academic evaluators, and invitation lifecycles.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={loadMembers} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowInviteModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={15} /> Invite Staff Member
          </button>
        </div>
      </div>

      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <Users size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            Faculty & Academic Staff Governance Directory
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Invite, credential, and govern institutional staff across role tiers: Faculty Assessors (who grade and release assessment scores), Data Operators, and Institution Administrators.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', background: 'var(--empiria-danger-subtle)', border: '1px solid var(--empiria-danger)', borderRadius: '10px', color: 'var(--empiria-danger)', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Role Responsibility Matrix Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--empiria-primary)' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} style={{ color: 'var(--empiria-primary)' }} /> Faculty Assessor
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.5' }}>
            Permitted operations: Create assessment scheme components, grade continuous evaluations, submit mark entries for departmental review.
          </p>
        </div>

        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--empiria-warning)' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} style={{ color: 'var(--empiria-warning)' }} /> Data Operator
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.5' }}>
            Permitted operations: Bulk roster staging, CSV dry-run validation, session attendance records, course catalog data uploads.
          </p>
        </div>

        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--empiria-secondary)' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} style={{ color: 'var(--empiria-secondary)' }} /> Institution Admin
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.5' }}>
            Permitted operations: Official release of assessment results, staff role delegation, licensing enforcement, institutional configuration.
          </p>
        </div>
      </div>

      {/* Members Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
            Institutional Staff Directory
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{members.length} registered members</span>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px auto', color: 'var(--primary-500)' }} />
            Loading staff directory...
          </div>
        ) : members.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No institutional staff members found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Institutional Email</th>
                  <th>Assigned Roles & Permissions</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{m.display_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {m.id.slice(0, 8)}...</div>
                    </td>
                    <td>{m.email}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {m.roles.map((r, idx) => (
                          <span key={idx}>{getRoleBadge(r)}</span>
                        ))}
                      </div>
                    </td>
                    <td><span className="badge badge-success">{m.status}</span></td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {m.created_at ? new Date(m.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Staff Modal */}
      {showInviteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--empiria-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '460px', padding: '24px', background: 'var(--empiria-surface)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '16px' }}>
              Invite Institutional Staff Member
            </h3>
            <form onSubmit={handleSendInvite}>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '13px' }}>Email Address</label>
                <input
                  type="email"
                  className="input"
                  style={{ width: '100%', marginTop: '6px' }}
                  placeholder="faculty@empiria.edu"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontSize: '13px' }}>Institutional Role</label>
                <select
                  className="input"
                  style={{ width: '100%', marginTop: '6px' }}
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  required
                >
                  <option value="faculty_assessor">Faculty Assessor (Continuous Evaluation & Mark Entry)</option>
                  <option value="data_operator">Data Operator (Bulk Imports, Staging & Attendance)</option>
                  <option value="institution_admin">Institution Administrator (Full Governance & Release)</option>
                  <option value="mentor_advisor">Mentor Advisor (Student Advisory & Meetings)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowInviteModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Send Invitation Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
