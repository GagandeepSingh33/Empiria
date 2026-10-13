import React, { useState, useEffect } from 'react'
import {
  GraduationCap,
  Plus,
  RefreshCw,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Edit2,
  Users,
} from 'lucide-react'
import { api } from '../../api'
import type { StudentProfile } from '../../types'

interface Cohort {
  id: string
  name: string
}

interface StudentDirectoryViewProps {
  onSelectStudent?: (studentId: string) => void
}

export const StudentDirectoryView: React.FC<StudentDirectoryViewProps> = ({ onSelectStudent }) => {
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(15)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Search
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [cohortFilter, setCohortFilter] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [targetStudentForStatus, setTargetStudentForStatus] = useState<StudentProfile | null>(null)
  const [newStatus, setNewStatus] = useState('active')
  const [statusReason, setStatusReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Register Form
  const [regFirstName, setRegFirstName] = useState('')
  const [regLastName, setRegLastName] = useState('')
  const [regIdentifier, setRegIdentifier] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regCohortId, setRegCohortId] = useState('')

  useEffect(() => {
    loadCohorts()
  }, [])

  useEffect(() => {
    loadStudents()
  }, [page, pageSize, statusFilter, cohortFilter, sortBy, sortOrder])

  const loadCohorts = async () => {
    try {
      const data = await api.listCohorts()
      setCohorts(data)
    } catch {
      // ignore
    }
  }

  const loadStudents = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.listStudentsPaginated({
        page,
        page_size: pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
        cohort_id: cohortFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      })

      if (res && res.items) {
        setStudents(res.items)
        setTotal(res.total)
        setTotalPages(res.total_pages)
      } else if (Array.isArray(res)) {
        setStudents(res)
        setTotal((res as any).length)
        setTotalPages(1)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load student directory.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadStudents()
  }

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regFirstName || !regLastName || !regIdentifier || !regEmail) return
    try {
      setSubmitting(true)
      await api.createStudent({
        first_name: regFirstName,
        last_name: regLastName,
        student_identifier: regIdentifier,
        email: regEmail,
        cohort_id: regCohortId || undefined,
      })
      setShowRegisterModal(false)
      setRegFirstName('')
      setRegLastName('')
      setRegIdentifier('')
      setRegEmail('')
      setRegCohortId('')
      loadStudents()
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetStudentForStatus) return
    try {
      setSubmitting(true)
      await api.updateStudent(targetStudentForStatus.id, {
        status: newStatus,
        reason: statusReason || 'Status updated by administrator',
      })
      setShowStatusModal(false)
      setTargetStudentForStatus(null)
      setStatusReason('')
      loadStudents()
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleExportCsv = () => {
    const q = new URLSearchParams()
    if (statusFilter) q.set('status', statusFilter)
    if (cohortFilter) q.set('cohort_id', cohortFilter)
    window.open(`/internal/v1/students/export?${q.toString()}`, '_blank')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-success">Active Enrolment</span>
      case 'suspended':
        return <span className="badge badge-danger">Suspended</span>
      case 'graduated':
        return <span className="badge badge-info">Graduated Alumni</span>
      default:
        return <span className="badge badge-secondary">{status}</span>
    }
  }

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--empiria-text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
            <span>Institution Administration</span>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--empiria-primary)' }}>Student Directory</span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GraduationCap size={24} style={{ color: 'var(--empiria-primary)' }} />
            Student Directory & Enrolment Management
          </h2>
          <p style={{ color: 'var(--empiria-text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Authoritative student registry, status lifecycle management, cohort allocation, and academic export.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={loadStudents} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button className="btn btn-secondary" onClick={handleExportCsv} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={15} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={() => setShowRegisterModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={15} /> Register Student
          </button>
        </div>
      </div>

      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <GraduationCap size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            Authoritative Institutional Student Registry
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Manage student enrollments, cohort assignments, and lifecycle states (Active, Suspended, Graduated). Drill down directly into each student's holistic 360° competence dossier.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', background: 'var(--badge-fail-bg)', border: '1px solid var(--badge-fail-border)', borderRadius: '10px', color: 'var(--badge-fail-text)', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '18px 24px', marginBottom: '20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '14px', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input"
              style={{ width: '100%', paddingLeft: '36px' }}
              placeholder="Search by name, identifier, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Enrolment Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="graduated">Graduated</option>
          </select>

          {/* Cohort Filter */}
          <select
            className="input"
            value={cohortFilter}
            onChange={(e) => {
              setCohortFilter(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Cohorts</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Sort By */}
          <select
            className="input"
            value={`${sortBy}_${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split('_')
              setSortBy(sb)
              setSortOrder(so)
              setPage(1)
            }}
          >
            <option value="name_asc">Name (A → Z)</option>
            <option value="name_desc">Name (Z → A)</option>
            <option value="identifier_asc">Student ID (Asc)</option>
            <option value="identifier_desc">Student ID (Desc)</option>
            <option value="created_at_desc">Recently Registered</option>
          </select>

          <button type="submit" className="btn btn-primary" style={{ padding: '9px 18px' }}>
            Search
          </button>
        </form>
      </div>

      {/* Students Directory Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} style={{ color: 'var(--primary-400)' }} />
            Directory Roster ({total} students matching criteria)
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Page {page} of {totalPages}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px auto', color: 'var(--primary-500)' }} />
            Loading student directory...
          </div>
        ) : students.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <GraduationCap size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <p>No students found matching your criteria.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Student ID</th>
                  <th>Email Address</th>
                  <th>Cohort</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {s.first_name} {s.last_name}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-secondary" style={{ fontFamily: 'monospace' }}>
                        {s.student_identifier}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.email}</td>
                    <td>{s.cohort_name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                    <td>{getStatusBadge(s.status)}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setTargetStudentForStatus(s)
                            setNewStatus(s.status)
                            setShowStatusModal(true)
                          }}
                          title="Update Status Lifecycle"
                        >
                          <Edit2 size={13} /> Status
                        </button>
                        {onSelectStudent && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => onSelectStudent(s.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="View Academic 360 Workspace"
                          >
                            <ExternalLink size={13} /> 360 View
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

        {/* Pagination Bar */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Showing {students.length} of {total} registered students
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Register Student Modal */}
      {showRegisterModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '24px', background: 'var(--empiria-surface)', border: '1px solid var(--empiria-border)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)', marginBottom: '16px' }}>
              Register Individual Student
            </h3>
            <form onSubmit={handleRegisterStudent}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '13px' }}>First Name</label>
                  <input
                    type="text"
                    className="input"
                    style={{ width: '100%', marginTop: '6px' }}
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '13px' }}>Last Name</label>
                  <input
                    type="text"
                    className="input"
                    style={{ width: '100%', marginTop: '6px' }}
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '13px' }}>Student Identifier / Roll</label>
                  <input
                    type="text"
                    className="input"
                    style={{ width: '100%', marginTop: '6px' }}
                    placeholder="STU-2026-001"
                    value={regIdentifier}
                    onChange={(e) => setRegIdentifier(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '13px' }}>Institutional Email</label>
                  <input
                    type="email"
                    className="input"
                    style={{ width: '100%', marginTop: '6px' }}
                    placeholder="student@empiria.edu"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontSize: '13px' }}>Assign to Cohort</label>
                <select
                  className="input"
                  style={{ width: '100%', marginTop: '6px' }}
                  value={regCohortId}
                  onChange={(e) => setRegCohortId(e.target.value)}
                >
                  <option value="">-- Optional Cohort --</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRegisterModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Registering...' : 'Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Lifecycle Update Modal */}
      {showStatusModal && targetStudentForStatus && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '460px', padding: '24px', background: 'var(--empiria-surface)', border: '1px solid var(--empiria-border)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)', marginBottom: '12px' }}>
              Update Student Enrolment Status
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Student: {targetStudentForStatus.first_name} {targetStudentForStatus.last_name} ({targetStudentForStatus.student_identifier})
            </p>
            <form onSubmit={handleUpdateStatus}>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '13px' }}>Target Enrolment Status</label>
                <select
                  className="input"
                  style={{ width: '100%', marginTop: '6px' }}
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="active">Active Enrolment</option>
                  <option value="suspended">Suspended</option>
                  <option value="graduated">Graduated Alumni</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontSize: '13px' }}>Administrative Reason / Audit Note</label>
                <textarea
                  className="input"
                  style={{ width: '100%', marginTop: '6px', minHeight: '70px' }}
                  placeholder="Reason for status transition..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Confirm Status Transition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
