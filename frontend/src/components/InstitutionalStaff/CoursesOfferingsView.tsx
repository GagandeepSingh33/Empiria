import React, { useState, useEffect } from 'react'
import {
  BookOpen,
  Plus,
  RefreshCw,
  Award,
  Users,
  ChevronRight,
  Send,
  Edit,
} from 'lucide-react'
import { api } from '../../api'

interface Department {
  id: string
  name: string
  code: string
}

interface AcademicTerm {
  id: string
  name: string
}

interface Course {
  id: string
  code: string
  title: string
  description?: string
  credits: number
  department_id?: string
  status: string
}

interface CourseOffering {
  id: string
  course_id: string
  academic_term_id: string
  section_identifier: string
  course_title?: string
  course_code?: string
  term_name?: string
  status: string
}

interface CourseAssessment {
  id: string
  name: string
  assessment_type: string
  max_score: number
  weight: number
  assessment_date?: string
  total_submissions: number
  released_submissions: number
}

interface Enrollment {
  id: string
  student_id: string
  student_name?: string
  student_identifier?: string
  enrollment_status: string
  final_grade?: number
  final_outcome?: string
}

export const CoursesOfferingsView: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([])
  const [offerings, setOfferings] = useState<CourseOffering[]>([])
  const [terms, setTerms] = useState<AcademicTerm[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Selected Offering Drawer / Panel
  const [selectedOffering, setSelectedOffering] = useState<CourseOffering | null>(null)
  const [assessments, setAssessments] = useState<CourseAssessment[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loadingAssessments, setLoadingAssessments] = useState(false)

  // Modals
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [showOfferingModal, setShowOfferingModal] = useState(false)
  const [showAssessmentModal, setShowAssessmentModal] = useState(false)
  const [showGradeModal, setShowGradeModal] = useState(false)
  const [selectedAssessmentForGrading, setSelectedAssessmentForGrading] = useState<CourseAssessment | null>(null)
  const [gradingResults, setGradingResults] = useState<{ [enrollmentId: string]: number }>({})
  const [gradingStatus, setGradingStatus] = useState<string>('draft')

  const [submitting, setSubmitting] = useState(false)

  // New Course Form
  const [courseCode, setCourseCode] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [courseDesc, setCourseDesc] = useState('')
  const [courseCredits, setCourseCredits] = useState('3.0')
  const [courseDeptId, setCourseDeptId] = useState('')

  // New Offering Form
  const [offeringCourseId, setOfferingCourseId] = useState('')
  const [offeringTermId, setOfferingTermId] = useState('')
  const [offeringSection, setOfferingSection] = useState('01')

  // New Assessment Form
  const [asmName, setAsmName] = useState('')
  const [asmType, setAsmType] = useState('internal')
  const [asmMaxScore, setAsmMaxScore] = useState('100')
  const [asmWeight, setAsmWeight] = useState('1.0')

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      setLoading(true)
      setError(null)
      const [cList, oList, tList, dList] = await Promise.all([
        api.listCourses(),
        api.listCourseOfferings(),
        api.listAcademicTerms(),
        api.listDepartments(),
      ])
      setCourses(cList)
      setOfferings(oList)
      setTerms(tList)
      setDepartments(dList)
    } catch (err: any) {
      setError(err.message || 'Failed to load courses and offerings.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectOffering = async (off: CourseOffering) => {
    setSelectedOffering(off)
    try {
      setLoadingAssessments(true)
      const [asmList, enrList] = await Promise.all([
        api.listOfferingAssessments(off.id),
        api.listEnrollments({ course_offering_id: off.id }),
      ])
      setAssessments(asmList)
      setEnrollments(enrList)
    } catch (err: any) {
      alert(`Error loading offering details: ${err.message}`)
    } finally {
      setLoadingAssessments(false)
    }
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseCode || !courseTitle) return
    try {
      setSubmitting(true)
      await api.createCourse({
        code: courseCode,
        title: courseTitle,
        description: courseDesc,
        credits: parseFloat(courseCredits) || 3.0,
        department_id: courseDeptId || undefined,
      })
      setShowCourseModal(false)
      setCourseCode('')
      setCourseTitle('')
      setCourseDesc('')
      loadAll()
    } catch (err: any) {
      alert(`Error creating course: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateOffering = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!offeringCourseId || !offeringTermId) return
    try {
      setSubmitting(true)
      await api.createCourseOffering({
        course_id: offeringCourseId,
        academic_term_id: offeringTermId,
        section_identifier: offeringSection || '01',
      })
      setShowOfferingModal(false)
      setOfferingCourseId('')
      setOfferingTermId('')
      setOfferingSection('01')
      loadAll()
    } catch (err: any) {
      alert(`Error creating offering: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOffering || !asmName) return
    try {
      setSubmitting(true)
      await api.createOfferingAssessment(selectedOffering.id, {
        name: asmName,
        assessment_type: asmType,
        max_score: parseFloat(asmMaxScore) || 100,
        weight: parseFloat(asmWeight) || 1.0,
      })
      setShowAssessmentModal(false)
      setAsmName('')
      handleSelectOffering(selectedOffering)
    } catch (err: any) {
      alert(`Error creating assessment: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenGradebook = async (asm: CourseAssessment) => {
    setSelectedAssessmentForGrading(asm)
    try {
      const results = await api.listAssessmentResults(asm.id)
      const initialScores: { [enrId: string]: number } = {}
      results.forEach((r) => {
        if (r.score !== null && r.score !== undefined) {
          initialScores[r.enrollment_id] = r.score
        }
      })
      setGradingResults(initialScores)
      setShowGradeModal(true)
    } catch (err: any) {
      alert(`Error loading results: ${err.message}`)
    }
  }

  const handleSaveGrades = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAssessmentForGrading) return
    try {
      setSubmitting(true)
      const payloadResults = Object.entries(gradingResults).map(([enrId, score]) => ({
        enrollment_id: enrId,
        score: Number(score),
        status: gradingStatus,
      }))
      await api.enterAssessmentResults(selectedAssessmentForGrading.id, payloadResults)
      alert(`Successfully saved grades for ${payloadResults.length} students.`)
      setShowGradeModal(false)
      if (selectedOffering) handleSelectOffering(selectedOffering)
    } catch (err: any) {
      alert(`Error saving grades: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReleaseResults = async (asmId: string) => {
    if (!confirm('Are you sure you want to officially release results? Once released, students will be able to view their verified marks in their academic workspace.')) {
      return
    }
    try {
      const res = await api.releaseAssessmentResults(asmId)
      alert(res.message || 'Results officially released!')
      if (selectedOffering) handleSelectOffering(selectedOffering)
    } catch (err: any) {
      alert(`Error releasing results: ${err.message}`)
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
            <span style={{ color: 'var(--empiria-primary)' }}>Courses & Offerings</span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={24} style={{ color: 'var(--empiria-primary)' }} />
            Courses, Offerings & Assessment Schemes
          </h2>
          <p style={{ color: 'var(--empiria-text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Manage course catalog, section offerings, continuous assessment schemes, and official result release states.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={loadAll} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button className="btn btn-secondary" onClick={() => setShowCourseModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={15} /> Add Course
          </button>
          <button className="btn btn-primary" onClick={() => setShowOfferingModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={15} /> Create Offering
          </button>
        </div>
      </div>

      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <BookOpen size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            Academic Course Catalog & Semester Offerings
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Configure degree courses, sections, and weighted assessment schemes (Quizzes, Midterms, Practicals). Faculty assessors enter and formally release grades directly to student records here.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', background: 'var(--badge-fail-bg)', border: '1px solid var(--badge-fail-border)', borderRadius: '10px', color: 'var(--badge-fail-text)', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Main Grid: Offerings List & Offering Details / Assessment Drawer */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedOffering ? '1fr 1.2fr' : '1fr', gap: '24px' }}>
        {/* Left: Offerings Directory */}
        <div>
          <div className="card" style={{ overflow: 'hidden', marginBottom: '24px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} style={{ color: 'var(--primary-400)' }} />
                Active Course Offerings & Sections
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{offerings.length} offerings</span>
            </div>

            {offerings.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active course offerings found. Create one using the button above.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Course & Code</th>
                      <th>Term</th>
                      <th>Section</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offerings.map((off) => {
                      const isSelected = selectedOffering?.id === off.id
                      return (
                        <tr
                          key={off.id}
                          style={{
                            background: isSelected ? 'rgba(13, 148, 136, 0.1)' : undefined,
                            cursor: 'pointer',
                          }}
                          onClick={() => handleSelectOffering(off)}
                        >
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                              {off.course_code || 'COURSE'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {off.course_title || 'Untitled'}
                            </div>
                          </td>
                          <td style={{ fontSize: '13px' }}>{off.term_name || 'Term'}</td>
                          <td>
                            <span className="badge badge-info">Sec {off.section_identifier}</span>
                          </td>
                          <td>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectOffering(off)
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Award size={14} /> Schemes
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Courses Master Catalog */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={18} style={{ color: 'var(--primary-400)' }} />
                Institutional Course Catalog
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{courses.length} courses</span>
            </div>

            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {courses.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.code} - {c.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.credits} Credits {c.description ? `• ${c.description}` : ''}</div>
                  </div>
                  <span className="badge badge-secondary">{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Selected Offering Detail / Assessment Scheme & Result Release Console */}
        {selectedOffering && (
          <div className="card" style={{ padding: '24px', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <span className="badge badge-primary" style={{ marginBottom: '6px' }}>Selected Offering Console</span>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {selectedOffering.course_code}: {selectedOffering.course_title}
                </h3>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Term: {selectedOffering.term_name} • Section {selectedOffering.section_identifier} • {enrollments.length} Enrolled Students
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedOffering(null)}
                title="Close Drawer"
              >
                ✕
              </button>
            </div>

            {/* Assessment Schemes Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={16} style={{ color: 'var(--primary-400)' }} />
                Assessment Scheme & Evaluation Components
              </h4>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowAssessmentModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} /> Add Component
              </button>
            </div>

            {loadingAssessments ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px auto' }} />
                Loading assessment scheme...
              </div>
            ) : assessments.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                <p>No assessment components configured for this offering yet.</p>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAssessmentModal(true)} style={{ marginTop: '8px' }}>
                  Define First Component (e.g., Midterm, Lab, End-Term)
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {assessments.map((asm) => (
                  <div
                    key={asm.id}
                    style={{
                      padding: '16px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {asm.name}
                        <span className={`badge ${asm.assessment_type === 'internal' ? 'badge-info' : 'badge-warning'}`}>
                          {asm.assessment_type.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Max Score: {asm.max_score} • Weight: {asm.weight}x • Recorded: {asm.total_submissions} • Released: {asm.released_submissions}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenGradebook(asm)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit size={14} /> Enter Marks
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleReleaseResults(asm.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--empiria-primary)' }}
                        title="Release official results to student workspaces"
                      >
                        <Send size={14} /> Release
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Enrolled Students Table */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} style={{ color: 'var(--primary-400)' }} />
                  Enrolled Students ({enrollments.length})
                </h4>
              </div>

              {enrollments.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px 0' }}>
                  No students currently enrolled in this section.
                </div>
              ) : (
                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  <table className="table" style={{ width: '100%', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Identifier</th>
                        <th>Status</th>
                        <th>Final Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrollments.map((enr) => (
                        <tr key={enr.id}>
                          <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>{enr.student_name || 'Student'}</td>
                          <td>{enr.student_identifier || 'N/A'}</td>
                          <td><span className="badge badge-success">{enr.enrollment_status}</span></td>
                          <td>{enr.final_grade !== null && enr.final_grade !== undefined ? enr.final_grade : 'In Progress'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      {showCourseModal && (
        <div className="modal-backdrop" onClick={() => setShowCourseModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', background: 'var(--empiria-surface)', border: '1px solid var(--empiria-border)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>Add Course to Catalog</h3>
            <form onSubmit={handleCreateCourse}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '13px' }}>Code</label>
                  <input
                    type="text"
                    className="input"
                    style={{ width: '100%', marginTop: '6px' }}
                    placeholder="CS301"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '13px' }}>Course Title</label>
                  <input
                    type="text"
                    className="input"
                    style={{ width: '100%', marginTop: '6px' }}
                    placeholder="Data Structures & Algorithms"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '13px' }}>Credits</label>
                  <input
                    type="number"
                    step="0.5"
                    className="input"
                    style={{ width: '100%', marginTop: '6px' }}
                    value={courseCredits}
                    onChange={(e) => setCourseCredits(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '13px' }}>Department</label>
                  <select
                    className="input"
                    style={{ width: '100%', marginTop: '6px' }}
                    value={courseDeptId}
                    onChange={(e) => setCourseDeptId(e.target.value)}
                  >
                    <option value="">-- Optional Dept --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontSize: '13px' }}>Description</label>
                <textarea
                  className="input"
                  style={{ width: '100%', marginTop: '6px', minHeight: '60px' }}
                  placeholder="Overview of syllabus and course goals..."
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCourseModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Add Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Offering Modal */}
      {showOfferingModal && (
        <div className="modal-backdrop" onClick={() => setShowOfferingModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', background: 'var(--empiria-surface)', border: '1px solid var(--empiria-border)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>Create Course Offering & Section</h3>
            <form onSubmit={handleCreateOffering}>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '13px' }}>Select Course</label>
                <select
                  className="input"
                  style={{ width: '100%', marginTop: '6px' }}
                  value={offeringCourseId}
                  onChange={(e) => setOfferingCourseId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Course --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '13px' }}>Academic Term</label>
                  <select
                    className="input"
                    style={{ width: '100%', marginTop: '6px' }}
                    value={offeringTermId}
                    onChange={(e) => setOfferingTermId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Term --</option>
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '13px' }}>Section</label>
                  <input
                    type="text"
                    className="input"
                    style={{ width: '100%', marginTop: '6px' }}
                    placeholder="01"
                    value={offeringSection}
                    onChange={(e) => setOfferingSection(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowOfferingModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Offering'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Assessment Modal */}
      {showAssessmentModal && (
        <div className="modal-backdrop" onClick={() => setShowAssessmentModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', background: 'var(--empiria-surface)', border: '1px solid var(--empiria-border)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>Add Assessment Component</h3>
            <form onSubmit={handleCreateAssessment}>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '13px' }}>Component Name</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', marginTop: '6px' }}
                  placeholder="Midterm Examination, Continuous Lab Evaluation"
                  value={asmName}
                  onChange={(e) => setAsmName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '13px' }}>Component Type</label>
                  <select
                    className="input"
                    style={{ width: '100%', marginTop: '6px' }}
                    value={asmType}
                    onChange={(e) => setAsmType(e.target.value)}
                  >
                    <option value="internal">Internal (Continuous)</option>
                    <option value="external">External (End-Term)</option>
                    <option value="quiz">Quiz / Assignment</option>
                    <option value="lab">Lab Practical</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '13px' }}>Max Score</label>
                  <input
                    type="number"
                    className="input"
                    style={{ width: '100%', marginTop: '6px' }}
                    value={asmMaxScore}
                    onChange={(e) => setAsmMaxScore(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontSize: '13px' }}>Weight (Multiplier)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  style={{ width: '100%', marginTop: '6px' }}
                  value={asmWeight}
                  onChange={(e) => setAsmWeight(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssessmentModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Save Assessment Component'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grade Entry Modal */}
      {showGradeModal && selectedAssessmentForGrading && (
        <div className="modal-backdrop" onClick={() => setShowGradeModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', background: 'var(--empiria-surface)', border: '1px solid var(--empiria-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Mark Entry: {selectedAssessmentForGrading.name}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Max Marks: {selectedAssessmentForGrading.max_score} • {enrollments.length} Enrolled Students
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowGradeModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveGrades}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>Status State:</label>
                <select
                  className="input"
                  style={{ padding: '4px 10px', fontSize: '13px' }}
                  value={gradingStatus}
                  onChange={(e) => setGradingStatus(e.target.value)}
                >
                  <option value="draft">Draft (Assessor In-Progress)</option>
                  <option value="submitted">Submitted for Department Review</option>
                  <option value="verified">Verified by Academic Board</option>
                </select>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Marks will only be visible to students once officially released.
                </span>
              </div>

              <div style={{ maxHeight: '340px', overflowY: 'auto', marginBottom: '20px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <table className="table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Identifier</th>
                      <th style={{ width: '130px' }}>Score (/{selectedAssessmentForGrading.max_score})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((enr) => (
                      <tr key={enr.id}>
                        <td>{enr.student_name || 'Student'}</td>
                        <td>{enr.student_identifier || 'N/A'}</td>
                        <td>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={selectedAssessmentForGrading.max_score}
                            className="input"
                            style={{ width: '100px', padding: '4px 8px', fontSize: '13px' }}
                            value={gradingResults[enr.id] !== undefined ? gradingResults[enr.id] : ''}
                            onChange={(e) =>
                              setGradingResults({
                                ...gradingResults,
                                [enr.id]: parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder="Score"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowGradeModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save & Record Grades'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
