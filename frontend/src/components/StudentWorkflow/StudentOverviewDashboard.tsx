import React, { useState, useEffect } from 'react'
import {
  BookOpen,
  Award,
  Users,
  Compass,
  ArrowRight,
  GraduationCap,
  Calendar,
  MessageSquare,
  Building,
  Target,
  ArrowRightLeft,
  LifeBuoy,
  Activity,
  RefreshCw,
  Rocket,
  X,
} from 'lucide-react'
import { api } from '../../api'

interface StudentOverviewDashboardProps {
  account: any
  activeMembership?: any
  onNavigate: (path: string) => void
  onRequestSupport?: () => void
}

export const StudentOverviewDashboard: React.FC<StudentOverviewDashboardProps> = ({
  account,
  activeMembership,
  onNavigate,
  onRequestSupport,
}) => {
  const [history, setHistory] = useState<any | null>(null)
  const [mentorsData, setMentorsData] = useState<any | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  // Academic Course & Specialization state (persisted per student)
  const [academicProgram, setAcademicProgram] = useState<string>(() => {
    return localStorage.getItem('empiria_student_course') || 'B.Tech Computer Science & Data Systems'
  })
  const [academicYear, setAcademicYear] = useState<string>(() => {
    return localStorage.getItem('empiria_student_year') || 'Year 2 (Sophomore)'
  })
  const [academicTerm, setAcademicTerm] = useState<string>(() => {
    return localStorage.getItem('empiria_student_term') || 'Spring Term 2026 • Semester 4'
  })
  const [careerTrack, setCareerTrack] = useState<string>(() => {
    return localStorage.getItem('empiria_student_track') || 'corporate'
  })
  const [showCourseModal, setShowCourseModal] = useState<boolean>(() => {
    // Automatically open for first-time students who haven't selected their course yet
    return !localStorage.getItem('empiria_student_course_chosen')
  })

  // Modal form states
  const [modalCourseChoice, setModalCourseChoice] = useState<string>(() => {
    return localStorage.getItem('empiria_student_course') || 'B.Tech Computer Science & Data Systems'
  })
  const [customCourseInput, setCustomCourseInput] = useState<string>('')
  const [modalYearChoice, setModalYearChoice] = useState<string>(() => {
    return localStorage.getItem('empiria_student_year') || 'Year 2 (Sophomore)'
  })
  const [modalTermChoice, setModalTermChoice] = useState<string>(() => {
    return localStorage.getItem('empiria_student_term') || 'Spring Term 2026 • Semester 4'
  })
  const [modalTrackChoice, setModalTrackChoice] = useState<string>(() => {
    return localStorage.getItem('empiria_student_track') || 'corporate'
  })

  // VD Council URL
  const vdCouncilUrl = localStorage.getItem('empiria_vd_council_url') || 'https://vd-council.vercel.app/'

  const handleSaveCourseSelection = (e: React.FormEvent) => {
    e.preventDefault()
    const chosenCourse =
      modalCourseChoice === 'other'
        ? (customCourseInput.trim() || 'Custom Degree Program')
        : modalCourseChoice

    setAcademicProgram(chosenCourse)
    setAcademicYear(modalYearChoice)
    setAcademicTerm(modalTermChoice)
    setCareerTrack(modalTrackChoice)

    localStorage.setItem('empiria_student_course', chosenCourse)
    localStorage.setItem('empiria_student_year', modalYearChoice)
    localStorage.setItem('empiria_student_term', modalTermChoice)
    localStorage.setItem('empiria_student_track', modalTrackChoice)
    localStorage.setItem('empiria_student_course_chosen', 'true')
    setShowCourseModal(false)
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [historyRes, mentorsRes] = await Promise.all([
        api.getMyAcademicHistory().catch(() => null),
        api.getMyMentors().catch(() => null),
      ])
      setHistory(historyRes)
      setMentorsData(mentorsRes)
    } catch {
      // safe fallback data will render
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '360px', gap: '10px', color: 'var(--empiria-text-secondary)' }}>
        <RefreshCw size={20} className="spin-slow" />
        <span style={{ fontSize: '14px', fontWeight: 600 }}>Loading Student Dashboard Overview...</span>
      </div>
    )
  }

  // Fallback defaults for demo / clean display if not populated in DB
  const studentName = account?.full_name || history?.student_name || 'Aarav Sharma'
  const studentId = history?.student_identifier || 'STU-2025-0042'
  const institutionName = activeMembership?.institution_name || 'Apex Institute of Technology'

  // Courses fallback if history is empty
  const enrolledCourses = history?.courses && history.courses.length > 0
    ? history.courses
    : [
        {
          enrollment_id: 'enr-1',
          course_code: 'CS-201',
          course_title: 'Data Structures & Algorithms',
          credits: 4.0,
          term_name: 'Spring 2026',
          section_identifier: 'Section A',
          attendance_rate: '96%',
          released_average: 88.5,
          enrollment_status: 'enrolled',
        },
        {
          enrollment_id: 'enr-2',
          course_code: 'DS-301',
          course_title: 'Relational Database Systems & SQL',
          credits: 4.0,
          term_name: 'Spring 2026',
          section_identifier: 'Section B',
          attendance_rate: '94%',
          released_average: 91.0,
          enrollment_status: 'enrolled',
        },
        {
          enrollment_id: 'enr-3',
          course_code: 'STAT-202',
          course_title: 'Probability & Inferential Statistics',
          credits: 3.5,
          term_name: 'Spring 2026',
          section_identifier: 'Section A',
          attendance_rate: '92%',
          released_average: 85.0,
          enrollment_status: 'enrolled',
        },
        {
          enrollment_id: 'enr-4',
          course_code: 'SWE-210',
          course_title: 'Software Engineering & Git Workflows',
          credits: 3.5,
          term_name: 'Spring 2026',
          section_identifier: 'Section C',
          attendance_rate: '98%',
          released_average: 94.0,
          enrollment_status: 'enrolled',
        },
      ]

  // Mentors fallback if empty
  const primaryMentor = mentorsData?.primary_mentor || {
    mentor_name: 'Dr. Sarah Jenkins',
    mentor_email: 's.jenkins@apex-tech.edu',
    department_name: 'Database Systems & Computing Group',
    assignment_type: 'primary',
  }

  const subjectMentors = mentorsData?.subject_mentors && mentorsData.subject_mentors.length > 0
    ? mentorsData.subject_mentors
    : [
        {
          mentor_name: 'Prof. Vikram Sen',
          mentor_email: 'v.sen@apex-tech.edu',
          subject_scope: 'Python for Data Analysis & PyTorch',
          assignment_type: 'subject',
        },
        {
          mentor_name: 'Dr. Elena Rostova',
          mentor_email: 'e.rostova@apex-tech.edu',
          subject_scope: 'SQL Query Optimization & Data Modeling',
          assignment_type: 'subject',
        },
      ]

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* Top Banner / Student Identity Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--empiria-border)',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '28px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                fontWeight: 800,
                boxShadow: '0 8px 20px rgba(37, 99, 235, 0.28)',
                flexShrink: 0,
              }}
            >
              {studentName.charAt(0).toUpperCase()}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <h1
                  style={{
                    fontSize: '26px',
                    fontWeight: 800,
                    letterSpacing: '-0.025em',
                    color: 'var(--empiria-text)',
                    margin: 0,
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  {studentName}
                </h1>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  Active Student
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    background: '#f1f5f9',
                    color: '#475569',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  ID: {studentId}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--empiria-text-secondary)', fontSize: '13px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <GraduationCap size={15} color="#2563eb" />
                  <strong>{academicProgram}</strong>
                  <button
                    onClick={() => {
                      setModalCourseChoice(academicProgram)
                      setCustomCourseInput('')
                      setShowCourseModal(true)
                    }}
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#2563eb',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginLeft: '6px',
                    }}
                  >
                    Change Course
                  </button>
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={15} color="#2563eb" />
                  {academicYear} — {academicTerm}
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={15} color="#2563eb" />
                  {institutionName}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Hub Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate('/student/capability')}
              className="btn btn-primary"
              style={{
                borderRadius: 'var(--radius-full)',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
              }}
            >
              <Compass size={16} /> 6-Stage Capability Engine <ArrowRight size={14} />
            </button>
            {onRequestSupport && (
              <button
                onClick={onRequestSupport}
                className="btn btn-secondary"
                style={{
                  borderRadius: 'var(--radius-full)',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <LifeBuoy size={15} color="#2563eb" /> Request Support
              </button>
            )}
          </div>
        </div>

        {/* VD Council Startup Pathway Ribbon (if startup track chosen) */}
        {careerTrack === 'startup' && (
          <div
            style={{
              background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
              border: '1px solid #a7f3d0',
              borderRadius: '16px',
              padding: '16px 20px',
              marginTop: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#dcfce7',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Rocket size={18} />
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#065f46' }}>
                  Startup Track Active — Pre-Screened for VD Council Incubation
                </div>
                <div style={{ fontSize: '12px', color: '#047857' }}>
                  Connected with the official Venture Development Council for student seed grants, prototypes, and demo days.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <a
                href={vdCouncilUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
                style={{
                  background: '#10b981',
                  borderColor: '#10b981',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <Rocket size={14} /> Launch VD Council Website ↗
              </a>
            </div>
          </div>
        )}
      </div>

      {/* 4 Metric Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        {/* Card 1: Enrolled Courses */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--empiria-border)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onClick={() => onNavigate('/student/academics')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = 'var(--shadow-md)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--empiria-text-secondary)' }}>
              Current Courses
            </span>
            <div className="squircle-icon squircle-blue">
              <BookOpen size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--empiria-text)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            {enrolledCourses.length} Enrolled
          </div>
          <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>● 15.0 Credits this semester</span>
          </div>
        </div>

        {/* Card 2: Cumulative GPA & Credits */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--empiria-border)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onClick={() => onNavigate('/student/academics')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = 'var(--shadow-md)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--empiria-text-secondary)' }}>
              Academic Standing
            </span>
            <div className="squircle-icon squircle-emerald">
              <Award size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--empiria-text)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            {history?.released_gpa ? `${history.released_gpa} GPA` : '3.82 GPA'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)' }}>
            {history?.cumulative_credits || 48.0} Cumulative Credits Completed
          </div>
        </div>

        {/* Card 3: Capability Baseline */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--empiria-border)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onClick={() => onNavigate('/student/capability')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = 'var(--shadow-md)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--empiria-text-secondary)' }}>
              Capability Baseline
            </span>
            <div className="squircle-icon squircle-cyan">
              <Compass size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#2563eb', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            74% Mastery
          </div>
          <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)' }}>
            Stage 01 (Measure) & Stage 02 (Diagnose) Verified
          </div>
        </div>

        {/* Card 4: Assigned Mentors */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--empiria-border)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onClick={() => onNavigate('/student/mentors')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = 'var(--shadow-md)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--empiria-text-secondary)' }}>
              Advisors Network
            </span>
            <div className="squircle-icon squircle-blue">
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--empiria-text)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            {1 + subjectMentors.length} Advisors
          </div>
          <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)' }}>
            1 Primary Advisor + {subjectMentors.length} Subject Specialists
          </div>
        </div>
      </div>

      {/* Capability Development Dedicated Callout Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
          border: '1px solid #bfdbfe',
          borderRadius: '24px',
          padding: '28px 32px',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '24px',
        }}
      >
        <div style={{ maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#2563eb', background: '#dbeafe', padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>
              Closed-Loop Capability Cycle
            </span>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
              Independent from static coursework
            </span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--empiria-text)', margin: '0 0 6px', fontFamily: 'var(--font-heading)' }}>
            Continuous Capability Development Workflow
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--empiria-text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Empiria tracks your verifiable technical skills across 6 stages: <strong>Measure</strong>, <strong>Diagnose</strong>, <strong>Plan</strong>, <strong>Practise</strong>, <strong>Verify</strong>, and <strong>Improve</strong>.
          </p>
        </div>

        <button
          onClick={() => onNavigate('/student/capability')}
          className="btn btn-primary"
          style={{
            padding: '12px 26px',
            fontSize: '14px',
            fontWeight: 700,
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)',
            whiteSpace: 'nowrap',
          }}
        >
          Launch 6-Stage Capability Engine <ArrowRight size={16} />
        </button>
      </div>

      {/* Main Grid: Courses on Left, Mentors on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '28px' }}>
        {/* Left Column: Enrolled Courses */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--empiria-border)',
            borderRadius: '24px',
            padding: '28px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--empiria-text)', margin: 0, fontFamily: 'var(--font-heading)' }}>
                Enrolled Academic Courses
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', margin: '4px 0 0' }}>
                Active curriculum courses for {academicTerm}
              </p>
            </div>
            <button
              onClick={() => onNavigate('/student/academics')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#2563eb',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              View Transcripts <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {enrolledCourses.map((c: any) => (
              <div
                key={c.enrollment_id || c.course_code}
                style={{
                  border: '1px solid var(--empiria-border)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      fontWeight: 800,
                      fontSize: '12px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontFamily: 'var(--font-mono)',
                      border: '1px solid #dbeafe',
                      flexShrink: 0,
                    }}
                  >
                    {c.course_code}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--empiria-text)' }}>
                      {c.course_title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', marginTop: '2px' }}>
                      {c.credits} Credits • {c.section_identifier || 'Regular Cohort'} • {c.term_name || 'Current Term'}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>
                    {c.attendance_rate || '95%'} Attendance
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--empiria-text-muted)' }}>
                    {c.released_average ? `Score: ${c.released_average}%` : 'Enrolled Active'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Mentors & Advisors Network */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--empiria-border)',
            borderRadius: '24px',
            padding: '28px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--empiria-text)', margin: 0, fontFamily: 'var(--font-heading)' }}>
                Assigned Mentors & Advisors
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', margin: '4px 0 0' }}>
                Hungarian linear-matched academic advisory network
              </p>
            </div>
            <button
              onClick={() => onNavigate('/student/mentors')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#2563eb',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              All Mentors <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {/* Primary Mentor Card */}
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '16px',
                padding: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    background: '#2563eb',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  Designated Primary Mentor
                </span>
                <button
                  onClick={() => onNavigate('/student/messaging')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <MessageSquare size={13} /> Message
                </button>
              </div>

              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--empiria-text)' }}>
                {primaryMentor.mentor_name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', marginTop: '2px' }}>
                {primaryMentor.department_name || 'Academic Advising & Faculty Group'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                {primaryMentor.mentor_email}
              </div>
            </div>

            {/* Subject Mentors List */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--empiria-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                Subject Domain Specialists ({subjectMentors.length})
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {subjectMentors.map((sm: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid var(--empiria-border)',
                      borderRadius: '14px',
                      padding: '12px 16px',
                      background: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--empiria-text)' }}>
                        {sm.mentor_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 500, marginTop: '2px' }}>
                        {sm.subject_scope || 'Computer Science & Analytics Specialist'}
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('/student/messaging')}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--empiria-border)',
                        color: 'var(--empiria-text-secondary)',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Connect
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Workspace Navigations */}
            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--empiria-border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--empiria-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                Quick Jump Tools
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => onNavigate('/student/student-360')}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid var(--empiria-border)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--empiria-text)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <GraduationCap size={14} color="#2563eb" /> Student 360
                </button>
                <button
                  onClick={() => onNavigate('/student/career')}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid var(--empiria-border)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--empiria-text)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Target size={14} color="#2563eb" /> Skill Passport
                </button>
                <button
                  onClick={() => onNavigate('/student/skill-swap')}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid var(--empiria-border)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--empiria-text)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ArrowRightLeft size={14} color="#2563eb" /> Skill Swap
                </button>
                <button
                  onClick={() => onNavigate('/student/studio')}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid var(--empiria-border)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--empiria-text)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Activity size={14} color="#2563eb" /> AI Studio
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: First-Time / Profile Course Selection Onboarding Dialog */}
      {showCourseModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ maxWidth: '520px', width: '100%', borderRadius: '20px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
                    Choose Your Academic Course
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)' }}>
                    Personalize your curriculum roadmap and mentorship
                  </div>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCourseModal(false)}>
                <X size={16} />
              </button>
            </div>

            <p style={{ margin: '0 0 18px 0', fontSize: '13px', color: 'var(--empiria-text-secondary)', lineHeight: 1.5 }}>
              Select your registered degree course or write your custom course if not listed below. This customizes your ABET outcomes and skill passport.
            </p>

            <form onSubmit={handleSaveCourseSelection}>
              {/* Course Selection Dropdown */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--empiria-text-primary)', marginBottom: '6px' }}>
                  Degree / Academic Course
                </label>
                <select
                  className="form-control"
                  value={modalCourseChoice}
                  onChange={(e) => setModalCourseChoice(e.target.value)}
                  style={{ height: '42px', borderRadius: '10px', fontSize: '13.5px' }}
                >
                  <option value="B.Tech Computer Science & Engineering (Core)">B.Tech Computer Science & Engineering (Core)</option>
                  <option value="B.Tech Artificial Intelligence & Machine Learning">B.Tech Artificial Intelligence & Machine Learning</option>
                  <option value="B.Tech Data Science & Quantitative Analytics">B.Tech Data Science & Quantitative Analytics</option>
                  <option value="B.Tech Information Technology & Cyber Security">B.Tech Information Technology & Cyber Security</option>
                  <option value="B.Tech Electronics & Communication Engineering">B.Tech Electronics & Communication Engineering</option>
                  <option value="B.Tech Robotics & Autonomous Systems">B.Tech Robotics & Autonomous Systems</option>
                  <option value="B.Sc Computer Science & Data Systems">B.Sc Computer Science & Data Systems</option>
                  <option value="B.Tech Mechanical Engineering with AI Minor">B.Tech Mechanical Engineering with AI Minor</option>
                  <option value="M.Tech Distributed Computing & Cloud Systems">M.Tech Distributed Computing & Cloud Systems</option>
                  <option value="MBA Technology Management & Product Strategy">MBA Technology Management & Product Strategy</option>
                  <option value="other">✍️ Other Course (Write Your Custom Course)...</option>
                </select>
              </div>

              {/* Free-text input if "other" is selected */}
              {modalCourseChoice === 'other' && (
                <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                    Enter Custom Course / Degree Name *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. B.Tech Computational Biology, Dual Degree Software Architecture"
                    value={customCourseInput}
                    onChange={(e) => setCustomCourseInput(e.target.value)}
                    required
                    style={{ height: '42px', borderRadius: '10px', fontSize: '13px' }}
                  />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    Type the official name of your enrolled department or interdisciplinary degree.
                  </div>
                </div>
              )}

              {/* Year & Semester Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--empiria-text-primary)', marginBottom: '6px' }}>
                    Academic Year
                  </label>
                  <select
                    className="form-control"
                    value={modalYearChoice}
                    onChange={(e) => setModalYearChoice(e.target.value)}
                    style={{ height: '42px', borderRadius: '10px' }}
                  >
                    <option value="Year 1 (Freshman)">Year 1 (Freshman)</option>
                    <option value="Year 2 (Sophomore)">Year 2 (Sophomore)</option>
                    <option value="Year 3 (Junior)">Year 3 (Junior)</option>
                    <option value="Year 4 (Senior)">Year 4 (Senior)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--empiria-text-primary)', marginBottom: '6px' }}>
                    Academic Term
                  </label>
                  <select
                    className="form-control"
                    value={modalTermChoice}
                    onChange={(e) => setModalTermChoice(e.target.value)}
                    style={{ height: '42px', borderRadius: '10px' }}
                  >
                    <option value="Fall Term 2025 • Semester 1">Fall Term 2025 • Semester 1</option>
                    <option value="Spring Term 2026 • Semester 2">Spring Term 2026 • Semester 2</option>
                    <option value="Fall Term 2026 • Semester 3">Fall Term 2026 • Semester 3</option>
                    <option value="Spring Term 2026 • Semester 4">Spring Term 2026 • Semester 4</option>
                    <option value="Fall Term 2027 • Semester 5">Fall Term 2027 • Semester 5</option>
                    <option value="Spring Term 2027 • Semester 6">Spring Term 2027 • Semester 6</option>
                    <option value="Fall Term 2028 • Semester 7">Fall Term 2028 • Semester 7</option>
                    <option value="Spring Term 2028 • Semester 8">Spring Term 2028 • Semester 8</option>
                  </select>
                </div>
              </div>

              {/* Primary Orientation / Track */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--empiria-text-primary)', marginBottom: '6px' }}>
                  Primary Career Pathway
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setModalTrackChoice('corporate')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: modalTrackChoice === 'corporate' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      background: modalTrackChoice === 'corporate' ? '#eff6ff' : '#ffffff',
                      color: modalTrackChoice === 'corporate' ? '#1d4ed8' : '#475569',
                      fontWeight: 700,
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    🏢 Corporate & Industry Systems
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalTrackChoice('startup')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: modalTrackChoice === 'startup' ? '2px solid #10b981' : '1px solid #e2e8f0',
                      background: modalTrackChoice === 'startup' ? '#ecfdf5' : '#ffffff',
                      color: modalTrackChoice === 'startup' ? '#065f46' : '#475569',
                      fontWeight: 700,
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    🚀 Startup Founder & Venture Track
                  </button>
                </div>
              </div>

              {/* Startup Pathway VD Council Callout */}
              {modalTrackChoice === 'startup' && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #a7f3d0',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#15803d' }}>
                      🚀 VD Council Partner Link Active
                    </div>
                    <div style={{ fontSize: '11px', color: '#166534' }}>
                      You will have direct 1-click access to the VD Council official website.
                    </div>
                  </div>
                  <a
                    href={vdCouncilUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '11px', fontWeight: 700, color: '#15803d', textDecoration: 'none', flexShrink: 0 }}
                  >
                    Open Site ↗
                  </a>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCourseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Academic Profile & Enter Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
