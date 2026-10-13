import { useState, useEffect } from 'react'
import { api } from '../../api'
import {
  GraduationCap,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Layers,
  TrendingUp,
  Award,
  Clock,
  RefreshCw,
} from 'lucide-react'

interface Student360ViewProps {
  studentId?: string
  isStaffView?: boolean
}

export function Student360View({ studentId, isStaffView = false }: Student360ViewProps) {
  const [data360, setData360] = useState<any | null>(null)
  const [availableStudents, setAvailableStudents] = useState<any[]>([])
  const [currentStudentId, setCurrentStudentId] = useState<string>(studentId || '')
  const [activeTab, setActiveTab] = useState<'academic' | 'mentors' | 'capabilities' | 'risk' | 'interventions'>('academic')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isStaffView) {
      loadStudentsList()
    } else if (studentId) {
      loadStudentData(studentId)
    }
  }, [studentId, isStaffView])

  const loadStudentsList = async () => {
    try {
      setLoading(true)
      const [studentsList, enrollments] = await Promise.all([
        api.listStudents().catch(() => []),
        api.getEnrollments().catch(() => []),
      ])
      const studentMap = new Map()
      studentsList?.forEach((s: any) => {
        studentMap.set(s.id, {
          id: s.id,
          name: `${s.first_name} ${s.last_name}`,
          identifier: s.student_identifier,
        })
      })
      enrollments?.forEach((e: any) => {
        if (e.student_id && !studentMap.has(e.student_id)) {
          studentMap.set(e.student_id, {
            id: e.student_id,
            name: e.student_name,
            identifier: e.student_identifier,
          })
        }
      })
      const list = Array.from(studentMap.values())
      setAvailableStudents(list)
      const targetId = studentId || (list.length > 0 ? list[0].id : '')
      if (targetId) {
        setCurrentStudentId(targetId)
        await loadStudentData(targetId)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load students.')
    } finally {
      setLoading(false)
    }
  }

  const loadStudentData = async (sId: string) => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.getStudent360(sId)
      setData360(res)
    } catch (err: any) {
      setError(err.message || 'Failed to load Student 360 profile.')
    } finally {
      setLoading(false)
    }
  }

  const handleStudentSelect = async (newId: string) => {
    setCurrentStudentId(newId)
    await loadStudentData(newId)
  }

  if (loading && !data360) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
        <RefreshCw size={28} className="spin" style={{ color: 'var(--empiria-primary)', marginBottom: '12px' }} />
        <p style={{ color: 'var(--empiria-text-secondary)', fontSize: '14px' }}>Loading Student 360 Context...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '24px', background: 'var(--badge-fail-bg)', border: '1px solid var(--badge-fail-border)', borderRadius: '8px', color: 'var(--badge-fail-text)' }}>
        <p style={{ fontWeight: 600, margin: '0 0 6px 0', fontFamily: 'var(--font-heading)' }}>Error Loading Student 360</p>
        <p style={{ margin: 0, fontSize: '13px' }}>{error}</p>
      </div>
    )
  }

  // Normalize both flat backend response (Student360Response) and nested data structures
  const student = data360?.student || {
    id: data360?.student_id,
    full_name: `${data360?.first_name || ''} ${data360?.last_name || ''}`.trim() || data360?.student_name,
    student_identifier: data360?.student_identifier,
    email: data360?.email,
    department: data360?.department || 'Computer Science',
    program: data360?.program || 'Data Analytics B.S.',
    current_term: data360?.current_term || 'Fall 2026',
    status: data360?.status,
  }

  const rawEnrollments = data360?.academic?.enrollments || data360?.enrollments || []
  const validAtt = rawEnrollments
    .filter((e: any) => e.attendance_rate && e.attendance_rate !== 'N/A')
    .map((e: any) => parseFloat(String(e.attendance_rate).replace('%', '')))
  const avgAtt = validAtt.length > 0 ? (validAtt.reduce((a: number, b: number) => a + b, 0) / validAtt.length).toFixed(1) : null

  const validAsm = rawEnrollments
    .filter((e: any) => e.assessment_average && e.assessment_average !== 'N/A')
    .map((e: any) => parseFloat(String(e.assessment_average).replace('%', '')))
  const avgAsm = validAsm.length > 0 ? (validAsm.reduce((a: number, b: number) => a + b, 0) / validAsm.length).toFixed(1) : null

  const academic = data360?.academic || {
    enrollments: rawEnrollments,
    overall_attendance_rate: avgAtt,
    overall_assessment_average: avgAsm,
  }

  const mentors = data360?.mentors || {
    primary_mentor: data360?.primary_mentor,
    subject_mentors: data360?.subject_mentors || [],
  }

  const capabilities = data360?.capabilities || {
    active_goals: data360?.active_goals || [],
    competency_gaps: data360?.competency_gaps || [],
    development_tasks: data360?.development_tasks || [],
    verified_skills_count: (data360?.competency_gaps || []).filter((g: any) => g.status === 'verified' || g.finding_type === 'target_met').length || (7 - (data360?.competency_gaps?.length || 0)),
    active_development_plans_count: (data360?.development_tasks?.length ? 1 : 0) + (data360?.active_goals?.length ? 1 : 0),
  }

  const risk = data360?.risk || {
    risk_support_level: data360?.risk_support_level,
    risk_calibrated_probability: data360?.risk_calibrated_probability,
    risk_drivers: data360?.risk_drivers || [],
    protective_factors: data360?.protective_factors || [],
  }

  const support = data360?.support || {
    interventions: data360?.interventions || [],
  }

  const isStaff = isStaffView || !!(risk && risk.risk_support_level !== null && risk.risk_support_level !== undefined)

  return (
    <div className="section-container" style={{ padding: '0 0 40px 0' }}>
      {/* Educational Explainer Banner */}
      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <GraduationCap size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#2563eb', background: '#dbeafe', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
              Holistic Student Passport
            </span>
            <div className="explainer-title" style={{ margin: 0 }}>
              What is the Student 360 Workspace?
            </div>
          </div>
          <div className="explainer-text">
            A unified intelligence dossier bringing together academic course enrollments, verified competency rubrics, designated mentor advisors, and early-warning risk indicators into a single, comprehensive record.
          </div>
        </div>
      </div>

      {/* Top Banner & Selector */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--empiria-border)',
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--empiria-primary-subtle)',
                  color: 'var(--empiria-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '16px',
                  border: '1px solid var(--empiria-border)',
                }}
              >
                {student?.full_name ? student.full_name.charAt(0).toUpperCase() : 'S'}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--empiria-text-primary)', fontFamily: 'var(--font-heading)' }}>
                  {student?.full_name || 'Student Profile'}
                </h2>
                <div style={{ fontSize: '13px', color: 'var(--empiria-text-secondary)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span><strong>ID:</strong> {student?.student_identifier || student?.id}</span>
                  <span>•</span>
                  <span><strong>Email:</strong> {student?.email}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap', fontSize: '13px' }}>
              <span style={{ background: 'var(--empiria-surface-muted)', border: '1px solid var(--empiria-border)', padding: '4px 10px', borderRadius: '6px', color: 'var(--empiria-text-primary)' }}>
                <strong>Dept:</strong> {student?.department || 'Computer Science'}
              </span>
              <span style={{ background: 'var(--empiria-surface-muted)', border: '1px solid var(--empiria-border)', padding: '4px 10px', borderRadius: '6px', color: 'var(--empiria-text-primary)' }}>
                <strong>Program:</strong> {student?.program || 'Data Analytics B.S.'}
              </span>
              <span style={{ background: 'var(--empiria-surface-muted)', border: '1px solid var(--empiria-border)', padding: '4px 10px', borderRadius: '6px', color: 'var(--empiria-text-primary)' }}>
                <strong>Term:</strong> {student?.current_term || 'Fall 2026'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
            {isStaffView && availableStudents.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--empiria-text-secondary)' }}>Switch Student:</label>
                <select
                  value={currentStudentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--empiria-border)',
                    fontSize: '13px',
                    fontWeight: 500,
                    background: 'var(--empiria-surface)',
                    color: 'var(--empiria-text-primary)',
                  }}
                >
                  {availableStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.identifier})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                background: isStaff ? 'var(--badge-info-bg)' : 'var(--empiria-primary-subtle)',
                color: isStaff ? 'var(--badge-info-text)' : 'var(--empiria-primary)',
                border: `1px solid ${isStaff ? 'var(--badge-info-border)' : 'var(--empiria-border)'}`,
              }}
            >
              <Shield size={13} />
              {isStaff ? 'Staff View — Full Academic & Risk Context' : 'Student Self-Service View — Privacy Protected'}
            </div>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ background: 'var(--bg-surface-alt)', padding: '12px 16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Attendance Rate</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
              {academic?.overall_attendance_rate != null ? `${academic.overall_attendance_rate}%` : 'N/A'}
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface-alt)', padding: '12px 16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Course Grade Avg</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
              {academic?.overall_assessment_average != null ? `${academic.overall_assessment_average}%` : 'N/A'}
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface-alt)', padding: '12px 16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Verified Skills</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
              {capabilities?.verified_skills_count ?? 0}
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface-alt)', padding: '12px 16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Active Goals & Plans</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
              {capabilities?.active_development_plans_count ?? 0}
            </div>
          </div>

          {isStaff && risk?.risk_support_level && (
            <div
              style={{
                background:
                  risk.risk_support_level === 'urgent'
                    ? 'var(--badge-fail-bg)'
                    : risk.risk_support_level === 'high'
                    ? 'var(--badge-warn-bg)'
                    : 'var(--badge-pass-bg)',
                padding: '12px 16px',
                borderRadius: '8px',
                border: `1px solid ${
                  risk.risk_support_level === 'urgent'
                    ? 'var(--badge-fail-border)'
                    : risk.risk_support_level === 'high'
                    ? 'var(--badge-warn-border)'
                    : 'var(--badge-pass-border)'
                }`,
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', fontWeight: 600 }}>Support Category</div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color:
                    risk.risk_support_level === 'urgent'
                      ? 'var(--badge-fail-text)'
                      : risk.risk_support_level === 'high'
                      ? 'var(--badge-warn-text)'
                      : 'var(--badge-pass-text)',
                  marginTop: '4px',
                }}
              >
                {risk.risk_support_level}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--empiria-border)', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('academic')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'academic' ? '2px solid var(--empiria-primary)' : '2px solid transparent',
            color: activeTab === 'academic' ? 'var(--empiria-primary)' : 'var(--empiria-text-secondary)',
            fontWeight: activeTab === 'academic' ? 600 : 500,
            padding: '10px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <GraduationCap size={16} /> Course Enrollments ({academic?.enrollments?.length ?? 0})
        </button>

        <button
          onClick={() => setActiveTab('mentors')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'mentors' ? '2px solid var(--empiria-primary)' : '2px solid transparent',
            color: activeTab === 'mentors' ? 'var(--empiria-primary)' : 'var(--empiria-text-secondary)',
            fontWeight: activeTab === 'mentors' ? 600 : 500,
            padding: '10px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Compass size={16} /> Mentorship Team
        </button>

        <button
          onClick={() => setActiveTab('capabilities')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'capabilities' ? '2px solid var(--empiria-primary)' : '2px solid transparent',
            color: activeTab === 'capabilities' ? 'var(--empiria-primary)' : 'var(--empiria-text-secondary)',
            fontWeight: activeTab === 'capabilities' ? 600 : 500,
            padding: '10px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Layers size={16} /> Capability & Career Goals
        </button>

        {isStaff && (
          <button
            onClick={() => setActiveTab('risk')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'risk' ? '2px solid var(--empiria-primary)' : '2px solid transparent',
              color: activeTab === 'risk' ? 'var(--empiria-primary)' : 'var(--empiria-text-secondary)',
              fontWeight: activeTab === 'risk' ? 600 : 500,
              padding: '10px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <TrendingUp size={16} /> Academic Risk & Attributions
          </button>
        )}

        <button
          onClick={() => setActiveTab('interventions')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'interventions' ? '2px solid var(--empiria-primary)' : '2px solid transparent',
            color: activeTab === 'interventions' ? 'var(--empiria-primary)' : 'var(--empiria-text-secondary)',
            fontWeight: activeTab === 'interventions' ? 600 : 500,
            padding: '10px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Clock size={16} /> Interventions & Support ({support?.interventions?.length ?? 0})
        </button>
      </div>

      {/* Tab 1: Course Enrollments */}
      {activeTab === 'academic' && (
        <div style={{ background: 'var(--empiria-surface)', border: '1px solid var(--empiria-border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--empiria-border)' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--empiria-text-primary)', fontFamily: 'var(--font-heading)' }}>
              Course Offerings & Academic Records
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--empiria-surface-muted)', borderBottom: '1px solid var(--empiria-border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--empiria-text-secondary)' }}>Course Code</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--empiria-text-secondary)' }}>Title</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--empiria-text-secondary)' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--empiria-text-secondary)' }}>Attendance</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--empiria-text-secondary)' }}>Assessment Avg</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--empiria-text-secondary)' }}>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {academic?.enrollments?.length > 0 ? (
                  academic.enrollments.map((enr: any) => (
                    <tr key={enr.enrollment_id} style={{ borderBottom: '1px solid var(--empiria-border)' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--empiria-primary)' }}>
                        {enr.course_code}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--empiria-text-primary)' }}>{enr.course_title}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            background: enr.status === 'enrolled' ? 'var(--badge-pass-bg)' : 'var(--empiria-surface-muted)',
                            color: enr.status === 'enrolled' ? 'var(--badge-pass-text)' : 'var(--empiria-text-secondary)',
                            border: `1px solid ${enr.status === 'enrolled' ? 'var(--badge-pass-border)' : 'var(--empiria-border)'}`,
                          }}
                        >
                          {enr.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--empiria-text-primary)' }}>
                        {enr.attendance_rate != null ? `${enr.attendance_rate}%` : 'N/A'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--empiria-text-primary)' }}>
                        {enr.assessment_average != null ? `${enr.assessment_average}%` : 'N/A'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            background:
                              enr.final_outcome === 'pass' || enr.final_outcome === 'distinction'
                                ? 'var(--badge-pass-bg)'
                                : enr.final_outcome === 'fail'
                                ? 'var(--badge-fail-bg)'
                                : 'var(--empiria-surface-muted)',
                            color:
                              enr.final_outcome === 'pass' || enr.final_outcome === 'distinction'
                                ? 'var(--badge-pass-text)'
                                : enr.final_outcome === 'fail'
                                ? 'var(--badge-fail-text)'
                                : 'var(--empiria-text-secondary)',
                            border: `1px solid ${
                              enr.final_outcome === 'pass' || enr.final_outcome === 'distinction'
                                ? 'var(--badge-pass-border)'
                                : enr.final_outcome === 'fail'
                                ? 'var(--badge-fail-border)'
                                : 'var(--empiria-border)'
                            }`,
                          }}
                        >
                          {enr.final_outcome || 'In Progress'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No course enrollments registered.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Mentorship Team */}
      {activeTab === 'mentors' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Primary Mentor Card */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Compass size={18} color="var(--primary-600)" />
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
                Designated Primary Mentor
              </h4>
            </div>

            {mentors?.primary_mentor ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'var(--primary-100)',
                      color: 'var(--primary-800)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '16px',
                    }}
                  >
                    {mentors.primary_mentor.mentor_name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-main)' }}>
                      {mentors.primary_mentor.mentor_name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {mentors.primary_mentor.mentor_email}
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                  {mentors.primary_mentor.biography || 'Provides overarching academic roadmap, career trajectory planning, and holistic student support.'}
                </p>

                <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                  <span style={{ background: 'var(--badge-pass-bg)', color: 'var(--badge-pass-text)', border: '1px solid var(--badge-pass-border)', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    Active Assignment
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--empiria-text-secondary)', fontSize: '13px' }}>
                No active Primary Mentor assigned yet.
              </div>
            )}
          </div>

          {/* Subject Mentors */}
          <div
            style={{
              background: 'var(--empiria-surface)',
              border: '1px solid var(--empiria-border)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Layers size={18} color="var(--empiria-primary)" />
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--empiria-text-primary)', fontFamily: 'var(--font-heading)' }}>
                Subject & Competency Mentors
              </h4>
            </div>

            {mentors?.subject_mentors?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {mentors.subject_mentors.map((sm: any) => (
                  <div
                    key={sm.assignment_id || sm.id}
                    style={{
                      background: 'var(--empiria-surface-muted)',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--empiria-border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--empiria-text-primary)' }}>{sm.mentor_name}</span>
                      <span
                        style={{
                          background: 'var(--empiria-primary-subtle)',
                          color: 'var(--empiria-primary)',
                          border: '1px solid var(--empiria-border)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}
                      >
                        {sm.subject_scope || 'Competency Scope'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)' }}>{sm.mentor_email}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--empiria-text-secondary)', fontSize: '13px' }}>
                No active Subject Mentors assigned.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Capability & Career Goals */}
      {activeTab === 'capabilities' && (
        <div
          style={{
            background: 'var(--empiria-surface)',
            border: '1px solid var(--empiria-border)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Award size={20} color="var(--empiria-primary)" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--empiria-text-primary)', fontFamily: 'var(--font-heading)' }}>
              Capability Development & Career Alignment
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ background: 'var(--empiria-surface-muted)', border: '1px solid var(--empiria-border)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>
                Target Career Pathway
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--empiria-text-primary)' }}>
                {capabilities?.career_goal || 'Junior Data Analyst'}
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: 'var(--empiria-text-secondary)', lineHeight: 1.4 }}>
                Target proficiency across 8 core competencies: SQL, Python, Manipulation, Cleaning, Statistics, Visualization, Reasoning, and Communication.
              </p>
            </div>

            <div style={{ background: 'var(--empiria-surface-muted)', border: '1px solid var(--empiria-border)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '8px' }}>
                Identified Skill Gaps
              </div>
              {capabilities?.top_skill_gaps?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {capabilities.top_skill_gaps.map((gap: string, idx: number) => (
                    <span
                      key={idx}
                      style={{
                        background: 'var(--badge-fail-bg)',
                        color: 'var(--badge-fail-text)',
                        border: '1px solid var(--badge-fail-border)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {gap}
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--empiria-text-secondary)' }}>No critical competency gaps identified.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Academic Risk & Attributions (Staff View Only) */}
      {activeTab === 'risk' && isStaff && (
        <div
          style={{
            background: 'var(--empiria-surface)',
            border: '1px solid var(--empiria-border)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <TrendingUp size={20} color="var(--empiria-primary)" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--empiria-text-primary)', fontFamily: 'var(--font-heading)' }}>
              Explainable Risk Intelligence & Feature Attributions
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div style={{ background: 'var(--empiria-surface-muted)', border: '1px solid var(--empiria-border)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', fontWeight: 600 }}>Calibrated Risk Probability</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--badge-fail-text)', marginTop: '4px' }}>
                {risk?.risk_calibrated_probability != null ? `${(risk.risk_calibrated_probability * 100).toFixed(1)}%` : 'N/A'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', marginTop: '4px' }}>
                Probability of academic setback (Platt Calibrated)
              </div>
            </div>

            <div style={{ background: 'var(--empiria-surface-muted)', border: '1px solid var(--empiria-border)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', fontWeight: 600 }}>Support Category</div>
              <div style={{ fontSize: '24px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--empiria-text-primary)', marginTop: '4px' }}>
                {risk?.risk_support_level || 'standard'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', marginTop: '4px' }}>
                Policy Threshold: {risk?.policy_version || 'v1.0'}
              </div>
            </div>
          </div>

          {/* Contributing Drivers & Protective Factors */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div style={{ border: '1px solid var(--badge-warn-border)', background: 'var(--badge-warn-bg)', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600, color: 'var(--badge-warn-text)', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-heading)' }}>
                <AlertTriangle size={15} /> Top Risk Drivers (+ SHAP Attribution)
              </h4>
              {risk?.risk_drivers?.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--badge-warn-text)', lineHeight: 1.5 }}>
                  {risk.risk_drivers.map((d: any, idx: number) => (
                    <li key={idx}>
                      <strong>{typeof d === 'string' ? d : d.feature}:</strong> {typeof d === 'string' ? '' : `impact +${d.attribution?.toFixed(2)}`}
                    </li>
                  ))}
                </ul>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--badge-warn-text)' }}>No significant risk drivers flagged.</span>
              )}
            </div>

            <div style={{ border: '1px solid var(--badge-pass-border)', background: 'var(--badge-pass-bg)', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600, color: 'var(--badge-pass-text)', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-heading)' }}>
                <CheckCircle2 size={15} /> Protective Factors (- SHAP Attribution)
              </h4>
              {risk?.protective_factors?.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--badge-pass-text)', lineHeight: 1.5 }}>
                  {risk.protective_factors.map((p: any, idx: number) => (
                    <li key={idx}>
                      <strong>{typeof p === 'string' ? p : p.feature}:</strong> {typeof p === 'string' ? '' : `protective ${p.attribution?.toFixed(2)}`}
                    </li>
                  ))}
                </ul>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--badge-pass-text)' }}>No significant protective factors detected.</span>
              )}
            </div>
          </div>

          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--empiria-surface-muted)', border: '1px solid var(--empiria-border)', borderRadius: '6px', fontSize: '12px', color: 'var(--empiria-text-secondary)' }}>
            <strong>Section 15/16 Attribution Notice:</strong> Feature attributions reflect statistical model correlations on held-out academic records and do not establish causal relationships. Consequential academic decisions require authorized staff review.
          </div>
        </div>
      )}

      {/* Tab 5: Interventions */}
      {activeTab === 'interventions' && (
        <div style={{ background: 'var(--empiria-surface)', border: '1px solid var(--empiria-border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--empiria-border)' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--empiria-text-primary)', fontFamily: 'var(--font-heading)' }}>
              Logged Academic Support Interventions
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--empiria-surface-muted)', borderBottom: '1px solid var(--empiria-border)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--empiria-text-secondary)' }}>Intervention Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--empiria-text-secondary)' }}>Description</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--empiria-text-secondary)' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--empiria-text-secondary)' }}>Assigned Staff</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--empiria-text-secondary)' }}>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {support?.interventions?.length > 0 ? (
                  support.interventions.map((item: any) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--empiria-border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--empiria-primary)' }}>
                        {item.type || 'Academic Advising'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--empiria-text-primary)' }}>
                        {item.description}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            background:
                              item.status === 'completed'
                                ? 'var(--badge-pass-bg)'
                                : item.status === 'pending'
                                ? 'var(--badge-warn-bg)'
                                : 'var(--badge-fail-bg)',
                            color:
                              item.status === 'completed'
                                ? 'var(--badge-pass-text)'
                                : item.status === 'pending'
                                ? 'var(--badge-warn-text)'
                                : 'var(--badge-fail-text)',
                            border: `1px solid ${
                              item.status === 'completed'
                                ? 'var(--badge-pass-border)'
                                : item.status === 'pending'
                                ? 'var(--badge-warn-border)'
                                : 'var(--badge-fail-border)'
                            }`,
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--empiria-text-secondary)' }}>
                        {item.assigned_actor || 'Institution Advisor'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--empiria-text-secondary)' }}>
                        {item.due_date || 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--empiria-text-secondary)' }}>
                      No active support interventions logged.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
