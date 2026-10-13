import React, { useState, useEffect } from 'react'
import {
  BookOpen,
  Award,
  Clock,
  CheckCircle,
  RefreshCw,
  ChevronRight,
  Lock,
  GraduationCap,
} from 'lucide-react'
import { api } from '../../api'

interface AcademicHistoryAssessment {
  assessment_id: string
  assessment_name: string
  assessment_type: string
  max_score: number
  weight: number
  score: number | null
  status: string
  is_released: boolean
}

interface AcademicHistoryCourse {
  enrollment_id: string
  course_code: string
  course_title: string
  credits: number
  term_name: string
  section_identifier: string
  enrollment_status: string
  final_grade: number | null
  final_outcome: string | null
  attendance_sessions: number
  attendance_present: number
  attendance_rate: string | null
  assessments: AcademicHistoryAssessment[]
  released_average: number | null
}

interface StudentAcademicHistory {
  student_id: string
  student_name: string
  student_identifier: string
  total_enrolled_courses: number
  completed_courses: number
  cumulative_credits: number
  released_gpa: number | null
  courses: AcademicHistoryCourse[]
}

export const AcademicHistoryStudentView: React.FC = () => {
  const [history, setHistory] = useState<StudentAcademicHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getMyAcademicHistory()
      setHistory(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load academic records.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--empiria-text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
            <span>Student Workspace</span>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--empiria-primary)' }}>Academics & Grades</span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={24} style={{ color: 'var(--empiria-primary)' }} />
            Academic History & Released Course Results
          </h2>
          <p style={{ color: 'var(--empiria-text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Official institutional academic record, attendance compliance, and verified assessment evaluations.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={loadHistory} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <BookOpen size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            Official Institutional Academic History
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Review official course enrollments, cumulative credits, attendance percentages, and verified grades released by faculty assessors.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', background: 'var(--badge-fail-bg)', border: '1px solid var(--badge-fail-border)', borderRadius: '10px', color: 'var(--badge-fail-text)', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--empiria-text-secondary)' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px auto', color: 'var(--empiria-primary)' }} />
          Loading verified academic history...
        </div>
      ) : !history || history.courses.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--empiria-text-secondary)' }}>
          <GraduationCap size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
          <h3 style={{ fontFamily: 'var(--font-heading)' }}>No Course Enrolments Found</h3>
          <p style={{ marginTop: '6px' }}>You are not currently enrolled in any academic course offerings.</p>
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', textTransform: 'uppercase' }}>
                Enrolled Courses
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--empiria-text-primary)', marginTop: '8px' }}>
                {history.total_enrolled_courses}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', marginTop: '4px' }}>
                Total registered credits: {history.cumulative_credits}
              </div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', textTransform: 'uppercase' }}>
                Completed Courses
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--empiria-text-primary)', marginTop: '8px' }}>
                {history.completed_courses}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', marginTop: '4px' }}>
                Final requirements satisfied
              </div>
            </div>

            <div className="card" style={{ padding: '20px', borderColor: 'var(--empiria-primary-border)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--empiria-primary)', textTransform: 'uppercase' }}>
                Verified Released GPA
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--empiria-primary)', marginTop: '8px' }}>
                {history.released_gpa !== null ? `${history.released_gpa} / 4.0` : 'Pending Release'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', marginTop: '4px' }}>
                Based solely on official released marks
              </div>
            </div>
          </div>

          {/* Courses List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {history.courses.map((course) => (
              <div key={course.enrollment_id} className="card" style={{ padding: '24px' }}>
                {/* Course Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="badge badge-primary">{course.course_code}</span>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)', margin: 0 }}>
                        {course.course_title}
                      </h3>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--empiria-text-secondary)', marginTop: '6px' }}>
                      {course.term_name} • Section {course.section_identifier} • {course.credits} Credits
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-success">{course.enrollment_status.toUpperCase()}</span>
                    {course.released_average !== null && (
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--empiria-primary)', marginTop: '6px' }}>
                        Released Average: {course.released_average}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Attendance Metric */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', background: 'var(--empiria-surface-muted)', border: '1px solid var(--empiria-border)', padding: '12px 18px', borderRadius: '10px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--empiria-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={15} style={{ color: 'var(--empiria-primary)' }} />
                    Session Attendance:
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--empiria-text-secondary)' }}>
                    {course.attendance_sessions > 0
                      ? `${course.attendance_present} of ${course.attendance_sessions} sessions attended (${course.attendance_rate})`
                      : 'No session attendance recorded yet.'}
                  </div>
                </div>

                {/* Evaluation Components */}
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={15} style={{ color: 'var(--empiria-primary)' }} />
                    Assessment Components & Evaluated Marks
                  </h4>

                  {course.assessments.length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--empiria-text-secondary)', padding: '8px 0' }}>
                      No assessment components configured for this section yet.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table" style={{ width: '100%', fontSize: '13px' }}>
                        <thead>
                          <tr>
                            <th>Evaluation Component</th>
                            <th>Category</th>
                            <th>Weight</th>
                            <th>Max Marks</th>
                            <th>Result State</th>
                            <th style={{ textAlign: 'right' }}>Awarded Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {course.assessments.map((asm) => (
                            <tr key={asm.assessment_id}>
                              <td style={{ fontWeight: 600, color: 'var(--empiria-text-primary)' }}>{asm.assessment_name}</td>
                              <td>
                                <span className={`badge ${asm.assessment_type === 'internal' ? 'badge-info' : 'badge-warning'}`}>
                                  {asm.assessment_type.toUpperCase()}
                                </span>
                              </td>
                              <td>{asm.weight}x</td>
                              <td>{asm.max_score}</td>
                              <td>
                                {asm.is_released ? (
                                  <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle size={12} /> Officially Released
                                  </span>
                                ) : (
                                  <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={12} /> Pending Official Release
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                {asm.is_released && asm.score !== null ? (
                                  <span style={{ color: 'var(--empiria-primary)' }}>{asm.score} / {asm.max_score}</span>
                                ) : (
                                  <span style={{ color: 'var(--empiria-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Lock size={12} /> Pending Release
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
