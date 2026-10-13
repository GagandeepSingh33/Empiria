import React, { useState } from 'react'
import {
  Target,
  Search,
  Calendar,
  PlayCircle,
  Award,
  TrendingUp,
  Building,
  CheckCircle2,
  Users,
  Compass,
  ArrowRight,
  Send,
  X,
  Database,
  Code2,
  PieChart,
  TableProperties,
  BarChart2,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Cpu,
  GraduationCap,
} from 'lucide-react'
import { api } from '../api'

interface LandingPageProps {
  onNavigateLogin: () => void
  onNavigate?: (path: string) => void
}

interface DiagnosticSimulation {
  student: {
    name: string
    program: string
    semester: string
    avatar: string
    baselineScore: number
    strengths: string[]
    gaps: string[]
  }
  mentor: {
    name: string
    title: string
    department: string
    avatar: string
    specialization: string[]
    matchFit: number
  }
  summary: string
  verifiableBadge: string
}

const DEMO_DIAGNOSTICS: DiagnosticSimulation[] = [
  {
    student: {
      name: 'Aarav Sharma',
      program: 'B.Tech Computer Science',
      semester: 'Semester 4',
      avatar: 'A',
      baselineScore: 68,
      strengths: ['Python Automation', 'Data Structures'],
      gaps: ['SQL Indexing & Tuning', 'Query Execution Plans'],
    },
    mentor: {
      name: 'Dr. Sarah Jenkins',
      title: 'Primary Mentor Advisor',
      department: 'Database Systems Group',
      avatar: 'S',
      specialization: ['Query Optimization', 'Relational Schemas'],
      matchFit: 96,
    },
    summary: 'Aarav (68% Baseline) matched with Dr. Sarah Jenkins (96% fit)',
    verifiableBadge: 'Target Mastery 94% Projected',
  },
  {
    student: {
      name: 'Priya Patel',
      program: 'Data Science & Analytics',
      semester: 'Semester 6',
      avatar: 'P',
      baselineScore: 74,
      strengths: ['Inferential Statistics', 'Pandas & NumPy'],
      gaps: ['PyTorch Neural Nets', 'Model Evaluation'],
    },
    mentor: {
      name: 'Prof. Vikram Sen',
      title: 'Subject Specialist',
      department: 'Machine Intelligence Lab',
      avatar: 'V',
      specialization: ['Deep Learning', 'PyTorch & Transformers'],
      matchFit: 98,
    },
    summary: 'Priya (74% Baseline) matched with Prof. Vikram Sen (98% fit)',
    verifiableBadge: 'Target Mastery 96% Projected',
  },
  {
    student: {
      name: 'Devansh Mehta',
      program: 'Software Engineering',
      semester: 'Semester 3',
      avatar: 'D',
      baselineScore: 62,
      strengths: ['Algorithms & Complexity', 'Git Workflows'],
      gaps: ['REST Security', 'OAuth2 & JWT Auth'],
    },
    mentor: {
      name: 'Dr. Elena Rostova',
      title: 'Faculty Assessor & Mentor',
      department: 'Cybersecurity & Systems',
      avatar: 'E',
      specialization: ['API Security', 'Applied Cryptography'],
      matchFit: 94,
    },
    summary: 'Devansh (62% Baseline) matched with Dr. Elena Rostova (94% fit)',
    verifiableBadge: 'Target Mastery 92% Projected',
  },
]

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateLogin, onNavigate }) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [instName, setInstName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [studentCapacity, setStudentCapacity] = useState('500')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Interactive Live Capability Simulation
  const [simIndex, setSimIndex] = useState(0)
  const [simSpinning, setSimSpinning] = useState(false)

  const activeDiag = DEMO_DIAGNOSTICS[simIndex]

  const handleNextSimulation = () => {
    setSimSpinning(true)
    setTimeout(() => {
      setSimIndex((prev) => (prev + 1) % DEMO_DIAGNOSTICS.length)
      setSimSpinning(false)
    }, 200)
  }

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg(null)
    try {
      await api.submitInstitutionApplication({
        institution_name: instName,
        representative_name: contactName,
        representative_email: contactEmail,
        verification_summary: notes || 'Platform landing page inquiry',
      })
      setSubmitSuccess(true)
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to submit institution partnership request.')
    } finally {
      setSubmitting(false)
    }
  }

  const stages = [
    {
      num: '01',
      title: 'MEASURE',
      icon: <Target size={20} color="#2563eb" />,
      desc: 'Rigorous diagnostic assessments establish baseline competency across key technical domains before learning begins.',
    },
    {
      num: '02',
      title: 'DIAGNOSE',
      icon: <Search size={20} color="#2563eb" />,
      desc: 'Deterministic rubric scoring uncovers precise conceptual and practical skill gaps down to individual curriculum objectives.',
    },
    {
      num: '03',
      title: 'PLAN',
      icon: <Calendar size={20} color="#2563eb" />,
      desc: 'Dynamic, competency-guided action plans schedule structured study, targeted exercises, and milestone deadlines.',
    },
    {
      num: '04',
      title: 'PRACTISE',
      icon: <PlayCircle size={20} color="#2563eb" />,
      desc: 'Evidence-based lab tasks with real code, queries, and analytical deliverables submitted for verification.',
    },
    {
      num: '05',
      title: 'VERIFY',
      icon: <Award size={20} color="#2563eb" />,
      desc: 'Re-assessment and assessor reviews validate mastery, ensuring students demonstrate verified proficiency.',
    },
    {
      num: '06',
      title: 'IMPROVE',
      icon: <TrendingUp size={20} color="#2563eb" />,
      desc: 'Continuous growth trajectories with longitudinal institutional intelligence and early intervention workflows.',
    },
  ]

  const competencies = [
    { title: 'SQL & Relational Databases', icon: <Database size={18} />, desc: 'Complex joins, window functions, aggregation, indexing' },
    { title: 'Python for Data Analysis', icon: <Code2 size={18} />, desc: 'Pandas, NumPy, data structures, automation scripts' },
    { title: 'Descriptive & Inferential Statistics', icon: <BarChart2 size={18} />, desc: 'Hypothesis testing, distributions, significance, sampling' },
    { title: 'Data Cleaning & Wrangling', icon: <TableProperties size={18} />, desc: 'Handling missing values, outlier detection, deduplication' },
    { title: 'Business Intelligence & Visualization', icon: <PieChart size={18} />, desc: 'Dashboard design, KPI metrics, stakeholder charts' },
    { title: 'Exploratory Data Analysis', icon: <Sparkles size={18} />, desc: 'Pattern detection, correlation discovery, feature insights' },
    { title: 'Data Storytelling & Presentation', icon: <Users size={18} />, desc: 'Executive summaries, data-driven decisions, narrative flow' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--empiria-background)', color: 'var(--empiria-text-main)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header matching reference */}
      <header
        style={{
          borderBottom: '1px solid var(--empiria-border)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="brand-logo-squircle">
              <Compass size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.03em', color: 'var(--empiria-text)', fontFamily: 'var(--font-heading)' }}>
                EMPIRIA
              </div>
              <div style={{ fontSize: '11px', color: 'var(--empiria-text-muted)', fontWeight: 500 }}>
                Continuous Capability & Academic Intelligence
              </div>
            </div>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <button
              onClick={() => {
                const el = document.getElementById('how-it-works')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--empiria-text-secondary)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'color 0.15s ease' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--empiria-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--empiria-text-secondary)')}
            >
              How It Works
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('workflow-stages')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--empiria-text-secondary)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'color 0.15s ease' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--empiria-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--empiria-text-secondary)')}
            >
              The 6-Stage Loop
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('competencies-catalog')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--empiria-text-secondary)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'color 0.15s ease' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--empiria-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--empiria-text-secondary)')}
            >
              Competencies
            </button>
            <button
              onClick={() => onNavigate ? onNavigate('/about') : null}
              style={{ background: 'transparent', border: 'none', color: 'var(--empiria-text-secondary)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'color 0.15s ease' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--empiria-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--empiria-text-secondary)')}
            >
              About
            </button>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={onNavigateLogin}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--empiria-text)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '6px 12px',
              }}
            >
              Log In
            </button>
            <button
              onClick={onNavigateLogin}
              className="btn btn-primary"
              style={{
                borderRadius: 'var(--radius-full)',
                padding: '10px 22px',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Access Workspace <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section (Matching Reference Design Layout) */}
      <section
        style={{
          padding: '64px 24px 72px',
          maxWidth: '1280px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)', gap: '48px', alignItems: 'center' }}>
          {/* Left Column: Stacked Headlines */}
          <div>
            {/* Pill Chip Tag */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#eff6ff',
                border: '1px solid #dbeafe',
                padding: '6px 16px',
                borderRadius: 'var(--radius-full)',
                fontSize: '12px',
                color: 'var(--empiria-primary)',
                fontWeight: 600,
                marginBottom: '24px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span style={{ color: '#2563eb' }}>●</span>
              <span>The Continuous Capability Platform</span>
              <span style={{ color: '#94a3b8' }}>|</span>
              <span>100% Deterministic & Audit-Safe</span>
              <span>⚡</span>
            </div>

            {/* 3-Line Stacked Headline matching Photo 1 layout with Empiria's authentic copy */}
            <div style={{ marginBottom: '22px' }}>
              <h1
                style={{
                  fontSize: '52px',
                  fontWeight: 800,
                  letterSpacing: '-0.035em',
                  lineHeight: 1.12,
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--empiria-text)',
                }}
              >
                Measure capability.
                <br />
                <span style={{ color: '#2563eb' }}>Diagnose skill gaps.</span>
                <br />
                Accelerate growth.
              </h1>
            </div>

            {/* Subtitle in plain, easy-to-understand English */}
            <p
              style={{
                fontSize: '16px',
                color: 'var(--empiria-text-secondary)',
                lineHeight: 1.65,
                maxWidth: '520px',
                marginBottom: '32px',
              }}
            >
              Empiria transforms academic potential into verified capability through deterministic skill diagnosis, personalized development pathways, capacity-aware mentor matching, and longitudinal institutional intelligence.
            </p>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <button
                onClick={onNavigateLogin}
                className="btn btn-primary"
                style={{
                  padding: '13px 28px',
                  fontSize: '15px',
                  borderRadius: 'var(--radius-full)',
                  boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)',
                }}
              >
                Access Student Workspace <ArrowRight size={16} />
              </button>
              <button
                onClick={() => setModalOpen(true)}
                className="btn btn-secondary"
                style={{
                  padding: '13px 26px',
                  fontSize: '15px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                <Building size={16} color="var(--empiria-primary)" /> Request Institutional Demo
              </button>
            </div>
          </div>

          {/* Right Column: Live Capability Engine Card */}
          <div>
            <div
              style={{
                background: '#ffffff',
                border: '1px solid var(--empiria-border)',
                borderRadius: '24px',
                padding: '28px',
                boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(226, 232, 240, 0.6)',
                position: 'relative',
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="pulse-dot" />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--empiria-text)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    LIVE CAPABILITY ENGINE
                  </span>
                </div>

                <button
                  onClick={handleNextSimulation}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid var(--empiria-border)',
                    borderRadius: 'var(--radius-full)',
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--empiria-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                  }}
                  title="Click to preview another student diagnosis"
                >
                  <RefreshCw size={11} className={simSpinning ? 'spin' : ''} /> Simulate Diagnostic
                </button>
              </div>

              {/* Side-by-Side Profiles */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: '12px',
                  alignItems: 'center',
                  background: '#f8fafc',
                  border: '1px solid var(--empiria-border)',
                  borderRadius: '16px',
                  padding: '18px 16px',
                  marginBottom: '18px',
                }}
              >
                {/* Student Diagnostic (Left) */}
                <div style={{ background: '#ffffff', border: '1px solid var(--empiria-border)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#eff6ff',
                        color: '#2563eb',
                        fontWeight: 700,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #bfdbfe',
                      }}
                    >
                      {activeDiag.student.avatar}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--empiria-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {activeDiag.student.name}{' '}
                        <span style={{ fontSize: '10px', color: '#2563eb', fontWeight: 600 }}>Student</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--empiria-text-muted)' }}>{activeDiag.student.program}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
                      ● Demonstrated ({activeDiag.student.baselineScore}%):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {activeDiag.student.strengths.map((s) => (
                        <span
                          key={s}
                          style={{
                            background: '#ecfdf5',
                            color: '#059669',
                            border: '1px solid #a7f3d0',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 6px',
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
                      ● Identified Skill Gaps:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {activeDiag.student.gaps.map((s) => (
                        <span
                          key={s}
                          style={{
                            background: '#fef2f2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 6px',
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Central Bridge Icon */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#2563eb',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
                    flexShrink: 0,
                  }}
                >
                  <ArrowRight size={15} />
                </div>

                {/* Matched Mentor Advisor (Right) */}
                <div style={{ background: '#ffffff', border: '1px solid var(--empiria-border)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#f0fdf4',
                        color: '#16a34a',
                        fontWeight: 700,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      {activeDiag.mentor.avatar}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--empiria-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {activeDiag.mentor.name}{' '}
                        <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>Advisor</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--empiria-text-muted)' }}>{activeDiag.mentor.title}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
                      ● Academic Specialization:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {activeDiag.mentor.specialization.map((s) => (
                        <span
                          key={s}
                          style={{
                            background: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #dbeafe',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 6px',
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
                      ● Hungarian Match Fit:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      <span
                        style={{
                          background: '#ecfdf5',
                          color: '#059669',
                          border: '1px solid #a7f3d0',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                        }}
                      >
                        {activeDiag.mentor.matchFit}% Optimal Capacity Fit
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Matching Result Bar */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                  borderRadius: '14px',
                  padding: '14px 18px',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.15)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 800,
                      color: '#93c5fd',
                    }}
                  >
                    {activeDiag.mentor.matchFit}%
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Deterministic Diagnostic Alignment <span>✨</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '2px' }}>
                      {activeDiag.summary}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.25)',
                    border: '1px solid rgba(16, 185, 129, 0.5)',
                    color: '#6ee7b7',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '11px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activeDiag.verifiableBadge}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Explanatory 3-Step Section (Matching User Photo 2 with Empiria's authentic copy) */}
      <section
        id="how-it-works"
        style={{
          background: '#ffffff',
          borderTop: '1px solid var(--empiria-border)',
          borderBottom: '1px solid var(--empiria-border)',
          padding: '72px 24px',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          {/* Section Subtitle */}
          <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 48px' }}>
            <p
              style={{
                fontSize: '17px',
                fontWeight: 500,
                color: 'var(--empiria-text-secondary)',
                lineHeight: 1.6,
              }}
            >
              No uncalibrated grading, no static transcripts. Closed-loop deterministic continuous capability pathways for ambitious students and higher education institutions.
            </p>
          </div>

          {/* 3 Large Numbered Cards (01, 02, 03) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Card 01 */}
            <div className="step-watermark-card">
              <span className="step-watermark-num">01</span>
              <div className="squircle-icon squircle-blue">
                <Target size={24} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--empiria-text)', marginBottom: '8px' }}>
                Measure & Diagnose
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--empiria-text-muted)', lineHeight: 1.65 }}>
                Rigorous diagnostic assessments establish baseline competency across CSE domains and pinpoint skill gaps down to exact curriculum objectives.
              </p>
            </div>

            {/* Card 02 */}
            <div className="step-watermark-card">
              <span className="step-watermark-num">02</span>
              <div className="squircle-icon squircle-cyan">
                <Calendar size={24} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--empiria-text)', marginBottom: '8px' }}>
                Plan & Practise
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--empiria-text-muted)', lineHeight: 1.65 }}>
                Dynamic, competency-guided action plans schedule targeted lab tasks, real code exercises, and evidence submissions with milestone deadlines.
              </p>
            </div>

            {/* Card 03 */}
            <div className="step-watermark-card">
              <span className="step-watermark-num">03</span>
              <div className="squircle-icon squircle-emerald">
                <Award size={24} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--empiria-text)', marginBottom: '8px' }}>
                Verify & Mentor
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--empiria-text-muted)', lineHeight: 1.65 }}>
                Assessor reviews validate mastery while Hungarian-matched faculty mentors provide capacity-aware stewardship and pre-session briefings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6-Stage Core Workflow Section */}
      <section id="workflow-stages" style={{ padding: '80px 24px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--empiria-primary)' }}>
            The Empiria Core Engine
          </span>
          <h2 style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: 'var(--empiria-text)', fontFamily: 'var(--font-heading)' }}>
            The Six-Stage Development Workflow
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--empiria-text-secondary)', marginTop: '8px', maxWidth: '640px', margin: '8px auto 0' }}>
            A closed-loop capability architecture ensuring every student reaches verifiable, industry-ready mastery.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {stages.map((st) => (
            <div
              key={st.num}
              style={{
                background: '#ffffff',
                border: '1px solid var(--empiria-border)',
                borderRadius: '18px',
                padding: '28px',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                e.currentTarget.style.borderColor = '#cbd5e1'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                e.currentTarget.style.borderColor = 'var(--empiria-border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '3px 9px', borderRadius: 'var(--radius-full)' }}>
                  STAGE {st.num}
                </span>
                <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '10px' }}>
                  {st.icon}
                </div>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--empiria-text)', margin: 0, fontFamily: 'var(--font-heading)' }}>
                {st.title}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--empiria-text-muted)', lineHeight: 1.6, margin: 0 }}>
                {st.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Competencies Catalog Section */}
      <section
        id="competencies-catalog"
        style={{
          background: '#ffffff',
          borderTop: '1px solid var(--empiria-border)',
          borderBottom: '1px solid var(--empiria-border)',
          padding: '80px 24px',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--empiria-primary)' }}>
              Curriculum Rubrics & Frameworks
            </span>
            <h2 style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: 'var(--empiria-text)', fontFamily: 'var(--font-heading)' }}>
              Comprehensive Computer Science & Analytics Competencies
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--empiria-text-secondary)', marginTop: '8px', maxWidth: '640px', margin: '8px auto 0' }}>
              Standardized, verifiable rubrics mapped directly to university syllabi and international industry standards.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {competencies.map((c) => (
              <div
                key={c.title}
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--empiria-border)',
                  borderRadius: '16px',
                  padding: '22px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#eff6ff'
                  e.currentTarget.style.borderColor = '#bfdbfe'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f8fafc'
                  e.currentTarget.style.borderColor = 'var(--empiria-border)'
                }}
              >
                <div style={{ background: '#ffffff', color: '#2563eb', padding: '10px', borderRadius: '10px', boxShadow: 'var(--shadow-xs)' }}>
                  {c.icon}
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--empiria-text)', margin: '0 0 4px 0' }}>
                    {c.title}
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--empiria-text-muted)', margin: 0, lineHeight: 1.5 }}>
                    {c.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Institutional Intelligence & Enterprise Architecture */}
      <section style={{ padding: '80px 24px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--empiria-primary)' }}>
            Enterprise Capabilities
          </span>
          <h2 style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: 'var(--empiria-text)', fontFamily: 'var(--font-heading)' }}>
            Engineered for Universities & Higher Education
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--empiria-text-secondary)', marginTop: '8px', maxWidth: '640px', margin: '8px auto 0' }}>
            Secure multi-tenant isolation, capacity-aware faculty matching, and cryptographic auditability.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          <div style={{ background: '#ffffff', border: '1px solid var(--empiria-border)', borderRadius: '18px', padding: '28px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Cpu size={22} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--empiria-text)', marginBottom: '8px' }}>
              Hungarian Mentor Allocation
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--empiria-text-muted)', lineHeight: 1.6, margin: 0 }}>
              Algorithmic linear sum assignment optimizes student-to-mentor matching based on competency needs, faculty workload quotas, and expertise.
            </p>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--empiria-border)', borderRadius: '18px', padding: '28px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <BarChart2 size={22} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--empiria-text)', marginBottom: '8px' }}>
              Academic Review Priority Queue
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--empiria-text-muted)', lineHeight: 1.6, margin: 0 }}>
              Explainable risk scoring integrates attendance rates, assessment backlogs, and diagnostic deficits to triage early interventions without bias.
            </p>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--empiria-border)', borderRadius: '18px', padding: '28px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <ShieldCheck size={22} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--empiria-text)', marginBottom: '8px' }}>
              Cryptographic Audit Trails
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--empiria-text-muted)', lineHeight: 1.6, margin: 0 }}>
              Field-level AES-256-GCM encryption for confidential advisor notes and tamper-evident SHA-256 hashing ensure strict GDPR/FERPA compliance.
            </p>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--empiria-border)', borderRadius: '18px', padding: '28px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <GraduationCap size={22} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--empiria-text)', marginBottom: '8px' }}>
              Student 360 Dossier
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--empiria-text-muted)', lineHeight: 1.6, margin: 0 }}>
              Unified holistic portfolio aggregating formal coursework, continuous capability progress, peer skill badges, and co-curricular achievements.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', color: '#ffffff', padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '14px', fontFamily: 'var(--font-heading)' }}>
            Ready to Transform Capability Outcomes at Your Institution?
          </h2>
          <p style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.6, marginBottom: '32px' }}>
            Empiria provides turnkey implementation, LMS roster synchronization, and deterministic accreditation for universities and higher education systems.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={onNavigateLogin}
              style={{
                background: '#ffffff',
                color: '#2563eb',
                border: 'none',
                padding: '13px 28px',
                borderRadius: 'var(--radius-full)',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              }}
            >
              Access Workspace <ArrowRight size={16} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '6px' }} />
            </button>
            <button
              onClick={() => setModalOpen(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                padding: '13px 26px',
                borderRadius: 'var(--radius-full)',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Request Institutional Partnership
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '48px 24px 36px', marginTop: 'auto' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '32px', marginBottom: '36px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Compass size={16} />
                </div>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', fontFamily: 'var(--font-heading)' }}>
                  EMPIRIA
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '360px', lineHeight: 1.6, margin: 0 }}>
                Continuous capability development and academic intelligence platform. Closed-loop deterministic mastery tracking for universities.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
              <div>
                <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
                  Platform
                </h5>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <li><a href="#how-it-works" style={{ color: '#94a3b8', textDecoration: 'none' }}>How It Works</a></li>
                  <li><a href="#workflow-stages" style={{ color: '#94a3b8', textDecoration: 'none' }}>6-Stage Lifecycle</a></li>
                  <li><a href="#competencies-catalog" style={{ color: '#94a3b8', textDecoration: 'none' }}>Competency Matrix</a></li>
                  <li><button onClick={onNavigateLogin} style={{ background: 'none', border: 'none', color: '#94a3b8', padding: 0, cursor: 'pointer', fontSize: '13px' }}>Sign In</button></li>
                </ul>
              </div>

              <div>
                <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
                  Institutional
                </h5>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <li><button onClick={() => onNavigate && onNavigate('/about')} style={{ background: 'none', border: 'none', color: '#94a3b8', padding: 0, cursor: 'pointer', fontSize: '13px' }}>About Empiria</button></li>
                  <li><button onClick={() => onNavigate && onNavigate('/features')} style={{ background: 'none', border: 'none', color: '#94a3b8', padding: 0, cursor: 'pointer', fontSize: '13px' }}>Enterprise Features</button></li>
                  <li><button onClick={() => onNavigate && onNavigate('/privacy')} style={{ background: 'none', border: 'none', color: '#94a3b8', padding: 0, cursor: 'pointer', fontSize: '13px' }}>Privacy & Security</button></li>
                  <li><button onClick={() => onNavigate && onNavigate('/terms')} style={{ background: 'none', border: 'none', color: '#94a3b8', padding: 0, cursor: 'pointer', fontSize: '13px' }}>Terms of Service</button></li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '12px' }}>
            <span>&copy; {new Date().getFullYear()} EMPIRIA. Continuous Capability & Academic Intelligence. All rights reserved.</span>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span>Deterministic Engine v2.4</span>
              <span>AES-256-GCM Secured</span>
              <span>SOC2 & FERPA Aligned</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Institutional Partnership Inquiry Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '520px',
              width: '100%',
              padding: '36px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
            }}
          >
            <button
              onClick={() => {
                setModalOpen(false)
                setSubmitSuccess(false)
                setErrorMsg(null)
              }}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
              }}
            >
              <X size={16} />
            </button>

            {submitSuccess ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#ecfdf5',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                  }}
                >
                  <CheckCircle2 size={32} />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--empiria-text)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
                  Partnership Inquiry Received
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--empiria-text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
                  Thank you, <strong>{contactName}</strong>. Our institutional implementation team will contact you at <strong>{contactEmail}</strong> to review deployment quotas and academic framework integration.
                </p>
                <button
                  onClick={() => {
                    setModalOpen(false)
                    setSubmitSuccess(false)
                  }}
                  className="btn btn-primary"
                  style={{ borderRadius: 'var(--radius-full)', padding: '10px 24px' }}
                >
                  Close
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ background: '#eff6ff', color: '#2563eb', padding: '8px', borderRadius: '10px' }}>
                    <Building size={20} />
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--empiria-text)', margin: 0, fontFamily: 'var(--font-heading)' }}>
                    Request Institutional Partnership
                  </h3>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--empiria-text-muted)', marginBottom: '20px' }}>
                  Partner with Empiria to deploy continuous capability pathways across your university faculties, student cohorts, and mentor networks.
                </p>

                {errorMsg && (
                  <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '12px', marginBottom: '16px' }}>
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleRequestSubmit}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text)', marginBottom: '5px' }}>
                      Institution / University Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Stanford University School of Engineering"
                      value={instName}
                      onChange={(e) => setInstName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--empiria-border)',
                        background: '#f8fafc',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text)', marginBottom: '5px' }}>
                        Representative Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dr. Arthur Vance"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: '1px solid var(--empiria-border)',
                          background: '#f8fafc',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text)', marginBottom: '5px' }}>
                        Institutional Email
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="vance@university.edu"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: '1px solid var(--empiria-border)',
                          background: '#f8fafc',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text)', marginBottom: '5px' }}>
                      Estimated Student Cohort Size
                    </label>
                    <select
                      value={studentCapacity}
                      onChange={(e) => setStudentCapacity(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--empiria-border)',
                        background: '#f8fafc',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    >
                      <option value="250">Pilot Cohort (100 - 250 students)</option>
                      <option value="500">Department Tier (250 - 500 students)</option>
                      <option value="2000">Faculty Tier (500 - 2,000 students)</option>
                      <option value="5000">Institution-Wide (2,000+ students)</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text)', marginBottom: '5px' }}>
                      Academic Focus & Requirements
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Computer Science curriculum gap analysis, Hungarian mentor allocation for 40 faculty members..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--empiria-border)',
                        background: '#f8fafc',
                        fontSize: '13px',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '14px',
                      fontWeight: 700,
                    }}
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={16} className="spin" />
                        Submitting Application...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Submit Partnership Application
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
