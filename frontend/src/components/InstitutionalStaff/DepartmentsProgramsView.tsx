import React, { useState, useEffect } from 'react'
import {
  Network,
  Plus,
  RefreshCw,
  Building,
  GraduationCap,
  Users,
  ChevronRight,
} from 'lucide-react'
import { api } from '../../api'

interface Department {
  id: string
  name: string
  code: string
  status: string
  created_at: string
}

interface Programme {
  id: string
  name: string
  code: string
  description?: string
  created_at: string
}

interface Cohort {
  id: string
  name: string
  programme_id: string
  start_date: string
  end_date: string
  student_count: number
}

export const DepartmentsProgramsView: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([])
  const [programmes, setProgrammes] = useState<Programme[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [showProgModal, setShowProgModal] = useState(false)
  const [showCohortModal, setShowCohortModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [deptName, setDeptName] = useState('')
  const [deptCode, setDeptCode] = useState('')

  const [progName, setProgName] = useState('')
  const [progCode, setProgCode] = useState('')
  const [progDesc, setProgDesc] = useState('')

  const [cohortName, setCohortName] = useState('')
  const [cohortProgId, setCohortProgId] = useState('')
  const [cohortStart, setCohortStart] = useState('')
  const [cohortEnd, setCohortEnd] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [depts, progs, cohs] = await Promise.all([
        api.listDepartments(),
        api.listProgrammes(),
        api.listCohorts(),
      ])
      setDepartments(depts)
      setProgrammes(progs)
      setCohorts(cohs)
    } catch (err: any) {
      setError(err.message || 'Failed to load academic departments and programmes.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deptName || !deptCode) return
    try {
      setSubmitting(true)
      await api.createDepartment({ name: deptName, code: deptCode })
      setShowDeptModal(false)
      setDeptName('')
      setDeptCode('')
      loadData()
    } catch (err: any) {
      alert(`Error creating department: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateProg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!progName || !progCode) return
    try {
      setSubmitting(true)
      await api.createProgramme({ name: progName, code: progCode, description: progDesc })
      setShowProgModal(false)
      setProgName('')
      setProgCode('')
      setProgDesc('')
      loadData()
    } catch (err: any) {
      alert(`Error creating programme: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cohortName || !cohortProgId || !cohortStart || !cohortEnd) return
    try {
      setSubmitting(true)
      await api.createCohort({
        programme_id: cohortProgId,
        name: cohortName,
        start_date: cohortStart,
        end_date: cohortEnd,
      })
      setShowCohortModal(false)
      setCohortName('')
      setCohortProgId('')
      setCohortStart('')
      setCohortEnd('')
      loadData()
    } catch (err: any) {
      alert(`Error creating cohort: ${err.message}`)
    } finally {
      setSubmitting(false)
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
            <span style={{ color: 'var(--empiria-primary)', fontWeight: 600 }}>Departments & Programmes</span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>
            <Network size={24} style={{ color: 'var(--empiria-primary)' }} />
            Academic Departments, Programmes & Cohorts
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Organize institutional faculties, degree programs, and student batch cohorts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={loadData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button className="btn btn-secondary" onClick={() => setShowDeptModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={15} />
            New Department
          </button>
          <button className="btn btn-primary" onClick={() => setShowProgModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={15} />
            New Programme
          </button>
        </div>
      </div>

      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <Network size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            Academic Organizational Structure
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Establish institutional faculties, degree programmes (e.g. B.Tech Computer Science), and student batch cohorts for structured curriculum and mentor governance.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', color: '#fca5a5', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
            <Building size={16} /> Departments
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', marginTop: '8px' }}>
            {departments.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Academic faculties
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
            <GraduationCap size={16} /> Programmes
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', marginTop: '8px' }}>
            {programmes.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Degrees & diplomas
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
            <Users size={16} /> Active Cohorts
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', marginTop: '8px' }}>
            {cohorts.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Student batch groups
          </div>
        </div>
      </div>

      {/* Grid: Departments and Programmes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Departments Column */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={18} style={{ color: 'var(--empiria-primary)' }} />
              Academic Departments
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{departments.length} active</span>
          </div>

          <div style={{ padding: '8px 0' }}>
            {departments.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No departments registered yet.
              </div>
            ) : (
              departments.map((d) => (
                <div
                  key={d.id}
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--empiria-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{d.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Code: {d.code}</div>
                  </div>
                  <span className="badge badge-success">Active</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Programmes Column */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GraduationCap size={18} style={{ color: 'var(--empiria-primary)' }} />
              Academic Programmes
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{programmes.length} enrolled</span>
          </div>

          <div style={{ padding: '8px 0' }}>
            {programmes.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No programmes registered yet.
              </div>
            ) : (
              programmes.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--empiria-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Code: {p.code} {p.description ? `• ${p.description}` : ''}
                    </div>
                  </div>
                  <span className="badge badge-info">{p.code}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Cohorts Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} style={{ color: 'var(--empiria-primary)' }} />
              Student Cohorts & Batch Schedules
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Cohorts represent graduating student classes with start/end timeline milestones.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowCohortModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Plus size={14} /> Add Cohort
          </button>
        </div>

        {cohorts.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No cohorts registered yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Cohort Name</th>
                  <th>Programme</th>
                  <th>Timeline</th>
                  <th>Enrolled Students</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => {
                  const prog = programmes.find((p) => p.id === c.programme_id)
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.name}</td>
                      <td>{prog ? prog.name : 'Institutional General'}</td>
                      <td>{c.start_date} → {c.end_date}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--empiria-primary)' }}>{c.student_count}</span> students
                      </td>
                      <td><span className="badge badge-success">Active Cohort</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Department Modal */}
      {showDeptModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--empiria-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: 'var(--empiria-surface)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '16px' }}>New Department</h3>
            <form onSubmit={handleCreateDept}>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '13px' }}>Department Name</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', marginTop: '6px' }}
                  placeholder="Computer Science & Engineering"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontSize: '13px' }}>Department Code</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', marginTop: '6px' }}
                  placeholder="CSE"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeptModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Programme Modal */}
      {showProgModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--empiria-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '460px', padding: '24px', background: 'var(--empiria-surface)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '16px' }}>New Academic Programme</h3>
            <form onSubmit={handleCreateProg}>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '13px' }}>Programme Title</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', marginTop: '6px' }}
                  placeholder="Bachelor of Technology in Computer Science"
                  value={progName}
                  onChange={(e) => setProgName(e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '13px' }}>Programme Code</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', marginTop: '6px' }}
                  placeholder="BTECH-CS"
                  value={progCode}
                  onChange={(e) => setProgCode(e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontSize: '13px' }}>Description (Optional)</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', marginTop: '6px' }}
                  placeholder="4-year undergraduate programme"
                  value={progDesc}
                  onChange={(e) => setProgDesc(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowProgModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Programme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Cohort Modal */}
      {showCohortModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--empiria-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '24px', background: 'var(--empiria-surface)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '16px' }}>New Student Cohort</h3>
            <form onSubmit={handleCreateCohort}>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '13px' }}>Cohort Name</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', marginTop: '6px' }}
                  placeholder="Class of 2028 (Batch A)"
                  value={cohortName}
                  onChange={(e) => setCohortName(e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '13px' }}>Select Programme</label>
                <select
                  className="input"
                  style={{ width: '100%', marginTop: '6px' }}
                  value={cohortProgId}
                  onChange={(e) => setCohortProgId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Programme --</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '13px' }}>Start Date</label>
                  <input
                    type="date"
                    className="input"
                    style={{ width: '100%', marginTop: '6px' }}
                    value={cohortStart}
                    onChange={(e) => setCohortStart(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '13px' }}>End Date</label>
                  <input
                    type="date"
                    className="input"
                    style={{ width: '100%', marginTop: '6px' }}
                    value={cohortEnd}
                    onChange={(e) => setCohortEnd(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCohortModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Cohort'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
