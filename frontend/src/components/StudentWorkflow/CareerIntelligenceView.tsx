import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import {
  Compass,
  Target,
  ShieldCheck,
  Sparkles,
  X,
  FileCheck,
  RefreshCw,
  Rocket,
  Award,
  Layers,
  CheckCircle2,
  Clock,
  Download,
  Copy,
  Check,
  Users,
  Briefcase,
  Search,
  Share2,
  Printer,
  ChevronRight,
} from 'lucide-react'

type TabType = 'pathways' | 'startups' | 'taxonomy' | 'passport'

export const CareerIntelligenceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('pathways')
  const [occupations, setOccupations] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [selectedOccupationId, setSelectedOccupationId] = useState<string>('')
  const [selectedSector, setSelectedSector] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [gapAnalysis, setGapAnalysis] = useState<any | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [analyzing, setAnalyzing] = useState<boolean>(false)
  const [passport, setPassport] = useState<any | null>(null)
  const [exportingPassport, setExportingPassport] = useState<boolean>(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copiedHash, setCopiedHash] = useState<boolean>(false)
  const [copiedLink, setCopiedLink] = useState<boolean>(false)

  // Declare Goal Modal
  const [showDeclareModal, setShowDeclareModal] = useState<boolean>(false)
  const [goalPriority, setGoalPriority] = useState<string>('primary')
  const [targetGradDate, setTargetGradDate] = useState<string>('2027-06-30')
  const [declaring, setDeclaring] = useState<boolean>(false)

  // VD Council Official Website Link state
  const [vdCouncilUrl, setVdCouncilUrl] = useState<string>(() => {
    return localStorage.getItem('empiria_vd_council_url') || 'https://vd-council.vercel.app/'
  })
  const [showVdUrlModal, setShowVdUrlModal] = useState<boolean>(false)
  const [tempVdUrl, setTempVdUrl] = useState<string>(() => {
    return localStorage.getItem('empiria_vd_council_url') || 'https://vd-council.vercel.app/'
  })

  const handleSaveVdUrl = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanUrl = tempVdUrl.trim() || 'https://vd-council.vercel.app/'
    setVdCouncilUrl(cleanUrl)
    localStorage.setItem('empiria_vd_council_url', cleanUrl)
    setShowVdUrlModal(false)
    setStatusMsg({ type: 'success', text: `VD Council official website URL updated to: ${cleanUrl}` })
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [occList, userGoals] = await Promise.all([
        api.listCareerOccupations().catch(() => []),
        api.getStudentCareerGoals().catch(() => []),
      ])
      setOccupations(occList || [])
      setGoals(userGoals || [])

      const activeOccId = userGoals && userGoals.length > 0
        ? userGoals[0].occupation_id
        : (occList && occList.length > 0 ? occList[0].id : '')

      if (activeOccId) {
        setSelectedOccupationId(activeOccId)
        await loadGapAnalysis(activeOccId)
      }

      // Pre-fetch passport in background for instant availability
      api.exportSkillPassport().then((p) => setPassport(p)).catch(() => {})
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load Career Intelligence.' })
    } finally {
      setLoading(false)
    }
  }

  const loadGapAnalysis = async (occId: string) => {
    try {
      setAnalyzing(true)
      const data = await api.getCareerGapAnalysis({ occupation_id: occId })
      setGapAnalysis(data)
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to calculate gap analysis.' })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleOccupationChange = async (newId: string) => {
    setSelectedOccupationId(newId)
    await loadGapAnalysis(newId)
  }

  const handleSelectStartupTrack = async (code: string) => {
    const startupOcc = occupations.find((o) => o.code === code)
    if (startupOcc) {
      setSelectedOccupationId(startupOcc.id)
      await loadGapAnalysis(startupOcc.id)
      setActiveTab('pathways')
      setStatusMsg({ type: 'success', text: `Aligned active pathway with ${startupOcc.title}!` })
    }
  }

  const handleDeclareGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOccupationId) return
    try {
      setDeclaring(true)
      await api.declareCareerGoal({
        occupation_id: selectedOccupationId,
        priority: goalPriority,
        target_graduation_date: targetGradDate || undefined,
      })
      setStatusMsg({ type: 'success', text: 'Target career goal updated and aligned with academic roadmap!' })
      setShowDeclareModal(false)
      const userGoals = await api.getStudentCareerGoals().catch(() => [])
      setGoals(userGoals || [])
      await loadGapAnalysis(selectedOccupationId)
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update goal.' })
    } finally {
      setDeclaring(false)
    }
  }

  const handleExportPassport = async () => {
    try {
      setExportingPassport(true)
      const p = await api.exportSkillPassport()
      setPassport(p)
      setActiveTab('passport')
      setStatusMsg({ type: 'success', text: 'Tamper-Evident Cryptographic Skill Passport generated!' })
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to export Skill Passport.' })
    } finally {
      setExportingPassport(false)
    }
  }

  const copyToClipboard = (text: string, type: 'hash' | 'link') => {
    navigator.clipboard.writeText(text)
    if (type === 'hash') {
      setCopiedHash(true)
      setTimeout(() => setCopiedHash(false), 2000)
    } else {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const downloadPassportJson = () => {
    if (!passport) return
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(passport, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `${passport.passport_id || 'skill-passport'}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  const activeOccupation = occupations.find((o) => o.id === selectedOccupationId)
  const readinessPct = gapAnalysis ? Math.round(gapAnalysis.readiness_percentage ?? 78) : 0

  // Resilient skills list: checks API skills, skill_evaluations, or active occupation default required_skills
  const displaySkills: any[] =
    (gapAnalysis?.skills && gapAnalysis.skills.length > 0)
      ? gapAnalysis.skills
      : (gapAnalysis?.skill_evaluations && gapAnalysis.skill_evaluations.length > 0)
      ? gapAnalysis.skill_evaluations
      : (activeOccupation?.required_skills && activeOccupation.required_skills.length > 0)
      ? activeOccupation.required_skills
      : []

  // Check if current active occupation is a startup/venture track
  const isStartupTrack =
    activeOccupation?.industry_sector?.toLowerCase().includes('startup') ||
    activeOccupation?.industry_sector?.toLowerCase().includes('venture') ||
    activeOccupation?.code === 'ESCO-1120.3' ||
    activeOccupation?.code === 'ESCO-2511.4' ||
    activeOccupation?.code === 'ESCO-2421.2'

  // Filter occupations
  const filteredOccupations = occupations.filter((occ) => {
    const matchesSector =
      selectedSector === 'all'
        ? true
        : selectedSector === 'startups'
        ? occ.industry_sector?.toLowerCase().includes('startup') || occ.industry_sector?.toLowerCase().includes('venture')
        : occ.industry_sector?.toLowerCase().includes(selectedSector.toLowerCase())
    const matchesSearch =
      searchQuery === ''
        ? true
        : occ.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          occ.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          occ.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSector && matchesSearch
  })

  // Sectors list
  const sectors = [
    { id: 'all', label: 'All Pathways' },
    { id: 'startups', label: '🚀 Startups & Ventures' },
    { id: 'artificial intelligence', label: '🤖 AI & Deep Tech' },
    { id: 'data science', label: '📊 Data Science' },
    { id: 'cloud', label: '☁️ Cloud & Infra' },
    { id: 'cybersecurity', label: '🛡️ Cybersecurity' },
    { id: 'software engineering', label: '💻 Software Eng' },
  ]

  return (
    <div className="section-container" style={{ padding: '0 0 50px 0' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                padding: '9px',
                background: 'var(--empiria-primary-subtle)',
                borderRadius: '10px',
                color: 'var(--empiria-primary)',
              }}
            >
              <Compass size={24} />
            </span>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--empiria-text-primary)',
                }}
              >
                Career Intelligence & Skill Passport
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--empiria-text-secondary)' }}>
                Industry taxonomy alignment (ESCO & O*NET), Venture Pathways, and Cryptographic Credentialing.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={handleExportPassport}
            disabled={exportingPassport}
            style={{ borderRadius: '10px', fontWeight: 600 }}
          >
            <FileCheck size={16} style={{ marginRight: '6px', color: 'var(--empiria-primary)' }} />
            {exportingPassport ? 'Signing Cryptographic Seal...' : 'View / Export Skill Passport'}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowDeclareModal(true)}
            style={{ borderRadius: '10px', fontWeight: 600 }}
          >
            <Target size={16} style={{ marginRight: '6px' }} />
            Set Target Career
          </button>
        </div>
      </div>

      {/* Tab Navigation Navigation Bar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          background: 'var(--empiria-surface)',
          padding: '6px',
          borderRadius: '14px',
          border: '1px solid var(--empiria-border)',
          marginBottom: '24px',
          overflowX: 'auto',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <button
          onClick={() => setActiveTab('pathways')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            background: activeTab === 'pathways' ? 'var(--empiria-primary)' : 'transparent',
            color: activeTab === 'pathways' ? '#ffffff' : 'var(--empiria-text-secondary)',
          }}
        >
          <Briefcase size={16} />
          Occupational Pathways & WSGI
        </button>

        <button
          onClick={() => setActiveTab('startups')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            background: activeTab === 'startups' ? 'var(--empiria-primary)' : 'transparent',
            color: activeTab === 'startups' ? '#ffffff' : 'var(--empiria-text-secondary)',
          }}
        >
          <Rocket size={16} />
          Startup & Venture Track
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '999px',
              background: activeTab === 'startups' ? 'rgba(255,255,255,0.25)' : '#dbeafe',
              color: activeTab === 'startups' ? '#ffffff' : '#2563eb',
              fontWeight: 700,
            }}
          >
            Founder Hub
          </span>
        </button>

        <button
          onClick={() => setActiveTab('taxonomy')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            background: activeTab === 'taxonomy' ? 'var(--empiria-primary)' : 'transparent',
            color: activeTab === 'taxonomy' ? '#ffffff' : 'var(--empiria-text-secondary)',
          }}
        >
          <Layers size={16} />
          Taxonomy Requirements & ABET Matrix
        </button>

        <button
          onClick={() => setActiveTab('passport')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            background: activeTab === 'passport' ? 'var(--empiria-primary)' : 'transparent',
            color: activeTab === 'passport' ? '#ffffff' : 'var(--empiria-text-secondary)',
          }}
        >
          <ShieldCheck size={16} />
          Verifiable Skill Passport
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '999px',
              background: activeTab === 'passport' ? 'rgba(255,255,255,0.25)' : '#ecfdf5',
              color: activeTab === 'passport' ? '#ffffff' : '#10b981',
              fontWeight: 700,
            }}
          >
            SHA-256
          </span>
        </button>
      </div>

      {statusMsg && (
        <div className={`status-banner status-${statusMsg.type}`} style={{ marginBottom: '20px' }}>
          {statusMsg.text}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--empiria-surface)', borderRadius: '16px', border: '1px solid var(--empiria-border)' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 14px auto', color: 'var(--empiria-primary)' }} />
          <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 600 }}>Aligning Career Intelligence...</h4>
          <p style={{ color: 'var(--empiria-text-secondary)', fontSize: '13px', margin: 0 }}>
            Syncing verified course assessments with ESCO / O*NET occupational taxonomies and venture rubrics.
          </p>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* TAB 1: OCCUPATIONAL PATHWAYS & WSGI                                       */}
          {/* ========================================================================= */}
          {activeTab === 'pathways' && (
            <div>
              {/* Sector Filters & Search */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {sectors.map((sec) => (
                    <button
                      key={sec.id}
                      onClick={() => setSelectedSector(sec.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: selectedSector === sec.id ? '1px solid var(--empiria-primary)' : '1px solid var(--empiria-border)',
                        background: selectedSector === sec.id ? 'var(--empiria-primary-subtle)' : 'var(--empiria-surface)',
                        color: selectedSector === sec.id ? 'var(--empiria-primary)' : 'var(--empiria-text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {sec.label}
                    </button>
                  ))}
                </div>

                <div style={{ position: 'relative', width: '240px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--empiria-text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search careers, skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="form-control"
                    style={{ paddingLeft: '34px', fontSize: '13px', height: '38px', borderRadius: '10px' }}
                  />
                </div>
              </div>

              {/* Active Target Occupation Card */}
              <div
                style={{
                  background: 'var(--empiria-surface)',
                  border: '1px solid var(--empiria-border)',
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '24px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                  <div style={{ flex: 1, minWidth: '300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--empiria-primary)', textTransform: 'uppercase', letterSpacing: '0.6px', background: 'var(--empiria-primary-subtle)', padding: '3px 8px', borderRadius: '6px' }}>
                        Selected Career Trajectory
                      </span>
                      {analyzing && <RefreshCw size={12} className="spin" color="var(--empiria-primary)" />}
                      {goals.length > 0 && (
                        <span className="badge badge-info" style={{ fontSize: '11px' }}>
                          {goals.length} Declared Goal{goals.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <select
                        className="form-control"
                        style={{ fontSize: '16px', fontWeight: 700, minWidth: '320px', padding: '8px 14px', height: '42px', borderRadius: '10px' }}
                        value={selectedOccupationId}
                        onChange={(e) => handleOccupationChange(e.target.value)}
                      >
                        {filteredOccupations.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.title} ({o.taxonomy} • {o.code})
                          </option>
                        ))}
                      </select>
                      <span className="badge badge-met" style={{ fontSize: '12px', padding: '6px 12px' }}>
                        {activeOccupation?.industry_sector || 'Technology & Data Science'}
                      </span>
                    </div>

                    <p style={{ margin: '14px 0 0 0', fontSize: '13.5px', color: 'var(--empiria-text-secondary)', lineHeight: 1.55 }}>
                      {activeOccupation?.description ||
                        'Translates verified academic competencies into industry-standard role requirements and market readiness milestones.'}
                    </p>
                  </div>

                  {/* Weighted Readiness Score Meter */}
                  <div
                    style={{
                      background: 'var(--empiria-surface-muted)',
                      border: '1px solid var(--empiria-border)',
                      borderRadius: '14px',
                      padding: '20px 24px',
                      minWidth: '240px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--empiria-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Weighted Career Readiness (WSGI)
                    </div>
                    <div
                      style={{
                        fontSize: '38px',
                        fontWeight: 800,
                        color: readinessPct >= 70 ? 'var(--badge-pass-text)' : 'var(--badge-warn-text)',
                        marginTop: '6px',
                        fontFamily: 'var(--font-heading)',
                      }}
                    >
                      {readinessPct}%
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', marginTop: '4px' }}>
                      Weighted Skill Gap Index: <strong>{gapAnalysis?.wsgi_score ?? '22.0'}%</strong>
                    </div>
                    <div style={{ marginTop: '10px', height: '6px', background: 'var(--empiria-border)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${readinessPct}%`,
                          background: readinessPct >= 70 ? '#10b981' : '#f59e0b',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid: Skill Requirements & Gap Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '22px', marginBottom: '24px' }}>
                {/* Required Competencies */}
                <div style={{ background: 'var(--empiria-surface)', border: '1px solid var(--empiria-border)', borderRadius: '16px', padding: '22px', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                        Taxonomy Skill Weightings & Targets
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--empiria-text-secondary)' }}>
                        Mapped to {activeOccupation?.taxonomy || 'ESCO'} Standard Competency Hierarchy
                      </p>
                    </div>
                    <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                      {gapAnalysis?.skills?.length || 4} Core Requirements
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {displaySkills.length > 0 ? (
                      displaySkills.map((item: any, idx: number) => {
                        const currentLvl = item.current_level ?? 2.5
                        const targetLvl = item.target_level ?? 4.0
                        const pct = Math.min(100, Math.round((currentLvl / targetLvl) * 100))
                        const isMet = currentLvl >= targetLvl

                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '12px 14px',
                              background: 'var(--empiria-surface-muted)',
                              borderRadius: '10px',
                              border: '1px solid var(--empiria-border)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--empiria-text-primary)' }}>{item.name}</span>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '3px 8px',
                                  borderRadius: '999px',
                                  background: isMet ? '#ecfdf5' : '#fffbeb',
                                  color: isMet ? '#047857' : '#b45309',
                                  border: isMet ? '1px solid #a7f3d0' : '1px solid #fde68a',
                                }}
                              >
                                {isMet ? 'Requirement Met' : `Gap: -${(targetLvl - currentLvl).toFixed(1)} Lvl`}
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--empiria-text-secondary)', marginBottom: '6px' }}>
                              <span>
                                Demonstrated: <strong>Level {currentLvl}</strong> / 5.0
                              </span>
                              <span>
                                Target: <strong>Level {targetLvl}</strong> (Weight: {((item.weight ?? 1.0) * 100).toFixed(0)}%)
                              </span>
                            </div>

                            <div style={{ height: '6px', background: 'var(--empiria-border)', borderRadius: '999px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${pct}%`,
                                  background: isMet ? '#10b981' : '#f59e0b',
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </div>
                          </div>
                        )
                      })
                    ) : analyzing ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--empiria-text-secondary)', fontSize: '13px' }}>
                        <RefreshCw size={16} className="spin" style={{ margin: '0 auto 8px auto', color: 'var(--empiria-primary)' }} />
                        Aligning taxonomy skill requirements...
                      </div>
                    ) : (
                      <p style={{ color: 'var(--empiria-text-secondary)', fontSize: '13px', margin: 0 }}>
                        No specific skill weightings configured for this occupation.
                      </p>
                    )}
                  </div>
                </div>

                {/* Prioritized Action Recommendations */}
                <div style={{ background: 'var(--empiria-surface)', border: '1px solid var(--empiria-border)', borderRadius: '16px', padding: '22px', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                        Curated Development Accelerators
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--empiria-text-secondary)' }}>
                        AI-optimized actions to close competency deficits
                      </p>
                    </div>
                    <Sparkles size={18} color="var(--empiria-primary)" />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid var(--empiria-border)', background: 'var(--empiria-surface-muted)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--empiria-text-primary)' }}>
                          1. Stage 4 Practice: SQL Window Functions & Architecture
                        </div>
                        <span className="badge badge-info" style={{ fontSize: '10px' }}>+12% Readiness</span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', margin: '0 0 8px 0', lineHeight: 1.45 }}>
                        Completing interactive exercises on multi-tenant partition indexing will close the remaining 0.5 gap in database architecture.
                      </p>
                      <a href="/student/capability" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--empiria-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Open Capability Development <ChevronRight size={14} />
                      </a>
                    </div>

                    <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid var(--empiria-border)', background: 'var(--empiria-surface-muted)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--empiria-text-primary)' }}>
                          2. Multimodal AI Studio: Code Architecture Review
                        </div>
                        <span className="badge badge-info" style={{ fontSize: '10px' }}>+8% Readiness</span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', margin: '0 0 8px 0', lineHeight: 1.45 }}>
                        Submit a Python refactoring attempt in the Multimodal AI Studio for automated AST evaluation and complexity reduction feedback.
                      </p>
                      <a href="/student/studio" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--empiria-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Open Multimodal Studio <ChevronRight size={14} />
                      </a>
                    </div>

                    <div style={{ padding: '14px', borderRadius: '10px', border: '1px solid var(--empiria-border)', background: 'var(--empiria-surface-muted)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--empiria-text-primary)' }}>
                          3. Peer Skill Swap: Schedule a Technical Walkthrough
                        </div>
                        <span className="badge badge-info" style={{ fontSize: '10px' }}>+6% Readiness</span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', margin: '0 0 8px 0', lineHeight: 1.45 }}>
                        Connect with a peer in your cohort to practice explaining system trade-offs and communicating technical findings in a simulated interview.
                      </p>
                      <a href="/student/skill-swap" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--empiria-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Launch Peer Skill Swap <ChevronRight size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: STARTUP & VENTURE TRACK (ENTREPRENEURSHIP)                         */}
          {/* ========================================================================= */}
          {activeTab === 'startups' && (
            <div>
              {/* Startup Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a8a 100%)',
                  borderRadius: '16px',
                  padding: '28px',
                  color: '#ffffff',
                  marginBottom: '24px',
                  boxShadow: '0 10px 25px -5px rgba(30, 27, 75, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 1 }}>
                  <div style={{ maxWidth: '640px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
                      <Rocket size={14} />
                      Apex Center for Innovation & Entrepreneurship (ACIE)
                    </div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
                      Student Founder & Venture Track
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#c7d2fe', lineHeight: 1.6 }}>
                      Translate academic engineering and software rigor into defensible technology startups. Track your MVP validation, customer discovery milestones, unit economics, and investor pitch readiness with institutional endorsement.
                    </p>
                  </div>

                  <div
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '14px',
                      padding: '18px 22px',
                      textAlign: 'center',
                      minWidth: '200px',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#93c5fd' }}>
                      Venture Readiness Score
                    </div>
                    <div style={{ fontSize: '36px', fontWeight: 800, color: '#38bdf8', marginTop: '4px', fontFamily: 'var(--font-heading)' }}>
                      84.5%
                    </div>
                    <div style={{ fontSize: '11px', color: '#e0e7ff', marginTop: '2px' }}>
                      Tier-1 Incubator Qualified
                    </div>
                  </div>
                </div>
              </div>

              {/* VD Council Official Gateway Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                  border: '2px solid #10b981',
                  borderRadius: '16px',
                  padding: '24px 28px',
                  marginBottom: '24px',
                  boxShadow: '0 4px 20px -2px rgba(16, 185, 129, 0.12)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '20px',
                }}
              >
                <div style={{ flex: 1, minWidth: '320px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span
                      style={{
                        background: '#dcfce7',
                        color: '#15803d',
                        fontWeight: 800,
                        fontSize: '11px',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        letterSpacing: '0.6px',
                        textTransform: 'uppercase',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      Official Incubation Partner
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>• Direct Student Founder Gateway</span>
                  </div>
                  <h4
                    style={{
                      margin: '0 0 6px 0',
                      fontSize: '19px',
                      fontWeight: 800,
                      color: '#0f172a',
                      fontFamily: 'var(--font-heading)',
                    }}
                  >
                    VD Council — Official Venture Development Council
                  </h4>
                  <p style={{ margin: 0, fontSize: '13.5px', color: '#475569', lineHeight: 1.55 }}>
                    Empiria’s designated venture incubation partner. Connect your working prototype for seed grant evaluation, angel investor demo days, and pre-incubation advisory councils.
                  </p>
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
                    <span>Registered Website Link:</span>
                    <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', color: '#0f172a', fontWeight: 600 }}>
                      {vdCouncilUrl}
                    </code>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setTempVdUrl(vdCouncilUrl)
                      setShowVdUrlModal(true)
                    }}
                    style={{ borderRadius: '10px', fontSize: '12px', fontWeight: 600 }}
                  >
                    Configure Official Link
                  </button>
                  <a
                    href={vdCouncilUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      background: '#10b981',
                      borderColor: '#10b981',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.28)',
                    }}
                  >
                    <Rocket size={16} />
                    Launch VD Council Website ↗
                  </a>
                </div>
              </div>

              {/* Startup Roles Quick Select */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: 'var(--empiria-text-primary)' }}>
                  Select Specialized Venture Track
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div
                    onClick={() => handleSelectStartupTrack('ESCO-1120.3')}
                    style={{
                      background: 'var(--empiria-surface)',
                      border: '1px solid var(--empiria-border)',
                      borderRadius: '14px',
                      padding: '18px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--empiria-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--empiria-border)')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '22px' }}>🚀</span>
                      <span className="badge badge-met" style={{ fontSize: '10px' }}>ESCO-1120.3</span>
                    </div>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: 'var(--empiria-text-primary)' }}>
                      Tech Startup Founder & Co-Founder
                    </h5>
                    <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--empiria-text-secondary)', lineHeight: 1.45 }}>
                      Full-stack MVP prototyping, customer discovery, unit economics modeling, and seed pitch deck defense.
                    </p>
                    <button className="btn btn-secondary btn-sm" style={{ width: '100%', fontSize: '12px' }}>
                      Align with This Pathway
                    </button>
                  </div>

                  <div
                    onClick={() => handleSelectStartupTrack('ESCO-2511.4')}
                    style={{
                      background: 'var(--empiria-surface)',
                      border: '1px solid var(--empiria-border)',
                      borderRadius: '14px',
                      padding: '18px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--empiria-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--empiria-border)')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '22px' }}>🤖</span>
                      <span className="badge badge-met" style={{ fontSize: '10px' }}>ESCO-2511.4</span>
                    </div>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: 'var(--empiria-text-primary)' }}>
                      AI Systems & Deep Tech Entrepreneur
                    </h5>
                    <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--empiria-text-secondary)', lineHeight: 1.45 }}>
                      Autonomous agentic pipelines, RAG architecture, patentable defensibility, and enterprise SaaS commercialization.
                    </p>
                    <button className="btn btn-secondary btn-sm" style={{ width: '100%', fontSize: '12px' }}>
                      Align with This Pathway
                    </button>
                  </div>

                  <div
                    onClick={() => handleSelectStartupTrack('ESCO-2421.2')}
                    style={{
                      background: 'var(--empiria-surface)',
                      border: '1px solid var(--empiria-border)',
                      borderRadius: '14px',
                      padding: '18px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--empiria-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--empiria-border)')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '22px' }}>📈</span>
                      <span className="badge badge-met" style={{ fontSize: '10px' }}>ESCO-2421.2</span>
                    </div>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: 'var(--empiria-text-primary)' }}>
                      Product Strategy & Venture Growth Lead
                    </h5>
                    <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--empiria-text-secondary)', lineHeight: 1.45 }}>
                      Cohort retention analytics, PRD roadmapping, agile sprint cadence, and go-to-market funnel optimization.
                    </p>
                    <button className="btn btn-secondary btn-sm" style={{ width: '100%', fontSize: '12px' }}>
                      Align with This Pathway
                    </button>
                  </div>
                </div>
              </div>

              {/* Venture Milestones Roadmap */}
              <div
                style={{
                  background: 'var(--empiria-surface)',
                  border: '1px solid var(--empiria-border)',
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '24px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                      Venture Creation & Incubation Lifecycle
                    </h4>
                    <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--empiria-text-secondary)' }}>
                      Verified developmental phases recognized by university incubators and accelerator partners.
                    </p>
                  </div>
                  <span className="badge badge-met">Phase 3 of 5 In Progress</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--empiria-surface-muted)', border: '1px solid var(--empiria-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <CheckCircle2 size={16} color="#10b981" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>PHASE 1: VALIDATED</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--empiria-text-primary)' }}>Customer Discovery</div>
                    <div style={{ fontSize: '11px', color: 'var(--empiria-text-secondary)', marginTop: '4px' }}>
                      18 problem interviews logged with cohort peers & faculty.
                    </div>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--empiria-surface-muted)', border: '1px solid var(--empiria-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <CheckCircle2 size={16} color="#10b981" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>PHASE 2: VALIDATED</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--empiria-text-primary)' }}>MVP Prototyping</div>
                    <div style={{ fontSize: '11px', color: 'var(--empiria-text-secondary)', marginTop: '4px' }}>
                      Working web app prototype deployed and peer-tested in Skill Swap.
                    </div>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Clock size={16} color="#2563eb" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>PHASE 3: ACTIVE</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--empiria-text-primary)' }}>Unit Economics & Pitch</div>
                    <div style={{ fontSize: '11px', color: 'var(--empiria-text-secondary)', marginTop: '4px' }}>
                      Cap table, CAC/LTV model, and technical defense before Innovation Council.
                    </div>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--empiria-surface-muted)', border: '1px solid var(--empiria-border)', opacity: 0.7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Clock size={16} color="#94a3b8" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>PHASE 4: UPCOMING</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--empiria-text-primary)' }}>Seed Accelerator Review</div>
                    <div style={{ fontSize: '11px', color: 'var(--empiria-text-secondary)', marginTop: '4px' }}>
                      Application to university venture seed grants ($15k non-dilutive).
                    </div>
                  </div>
                </div>
              </div>

              {/* Startup Advisory & Multimodal Pitch Sandbox CTA */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                <div style={{ background: 'var(--empiria-surface)', border: '1px solid var(--empiria-border)', borderRadius: '14px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <Users size={18} color="var(--empiria-primary)" />
                    <h5 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Entrepreneurship & Venture Mentors</h5>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--empiria-text-secondary)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                    Connect directly with faculty advisors who specialize in startup building, IP licensing, and venture finance.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--empiria-surface-muted)', borderRadius: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '999px', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
                      RV
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>Dr. Rajesh Verma</div>
                      <div style={{ fontSize: '11px', color: 'var(--empiria-text-secondary)' }}>Senior Venture Advisor • Apex Innovation Center</div>
                    </div>
                    <a href="/student/mentors" className="btn btn-secondary btn-sm" style={{ fontSize: '11px' }}>
                      Message
                    </a>
                  </div>
                </div>

                <div style={{ background: 'var(--empiria-surface)', border: '1px solid var(--empiria-border)', borderRadius: '14px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <Sparkles size={18} color="var(--empiria-primary)" />
                    <h5 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Multimodal AI Pitch Simulator</h5>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--empiria-text-secondary)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                    Rehearse your venture pitch deck before the Multimodal AI Studio to receive instant feedback on clarity, cadence, and technical defense.
                  </p>
                  <a href="/student/studio" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    <Rocket size={14} /> Open AI Pitch Sandbox
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: TAXONOMY REQUIREMENTS & ABET MATRIX                                */}
          {/* ========================================================================= */}
          {activeTab === 'taxonomy' && (
            <div>
              {/* Educational Taxonomy Banner */}
              <div className="explainer-banner" style={{ marginBottom: '24px' }}>
                <div className="explainer-icon-box">
                  <Layers size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#2563eb', background: '#dbeafe', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                      Accreditation Standards
                    </span>
                    <div className="explainer-title" style={{ margin: 0 }}>
                      Academic Taxonomy & Outcome Governance
                    </div>
                  </div>
                  <div className="explainer-text">
                    Empiria aligns all coursework, lab evaluations, and peer demonstrations against international academic standards: <strong>Bloom’s Revised Cognitive Taxonomy</strong> (Stages 1–6) and <strong>ABET / NBA Program Outcomes (PO1–PO12)</strong>.
                  </div>
                </div>
              </div>

              {/* Bloom's Cognitive Progression Levels */}
              <div
                style={{
                  background: 'var(--empiria-surface)',
                  border: '1px solid var(--empiria-border)',
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '24px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                      Bloom's Revised Cognitive Taxonomy Progression
                    </h4>
                    <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--empiria-text-secondary)' }}>
                      Six progressive developmental stages from factual recall to novel synthesis and venture creation.
                    </p>
                  </div>
                  <span className="badge badge-met">Cognitive Maturity: Level 5 (Evaluating & Creating)</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  {[
                    { level: 1, name: '1. Remember', desc: 'Syntax recall, API signatures, definitions', pct: 95, color: '#10b981' },
                    { level: 2, name: '2. Understand', desc: 'Algorithm complexity, data flow diagrams', pct: 92, color: '#10b981' },
                    { level: 3, name: '3. Apply', desc: 'Implementing CRUD, SQL queries, UI components', pct: 88, color: '#10b981' },
                    { level: 4, name: '4. Analyze', desc: 'Profiling bottlenecks, memory leaks, threat models', pct: 82, color: '#10b981' },
                    { level: 5, name: '5. Evaluate', desc: 'Architecture trade-offs, Zero-Trust security review', pct: 78, color: '#2563eb' },
                    { level: 6, name: '6. Create', desc: 'Venture MVPs, novel microservice architectures', pct: 85, color: '#8b5cf6' },
                  ].map((stage) => (
                    <div
                      key={stage.level}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        background: 'var(--empiria-surface-muted)',
                        border: '1px solid var(--empiria-border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--empiria-text-primary)' }}>{stage.name}</span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: stage.color }}>{stage.pct}%</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--empiria-text-secondary)', marginBottom: '8px', minHeight: '32px' }}>
                        {stage.desc}
                      </div>
                      <div style={{ height: '5px', background: 'var(--empiria-border)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${stage.pct}%`, background: stage.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ABET & NBA Program Outcomes Grid */}
              <div
                style={{
                  background: 'var(--empiria-surface)',
                  border: '1px solid var(--empiria-border)',
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '24px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                      ABET (1–7) & NBA Graduate Outcomes Matrix (PO1–PO12)
                    </h4>
                    <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--empiria-text-secondary)' }}>
                      Accreditation outcomes mapped to student assessments and verified evidence portfolios.
                    </p>
                  </div>
                  <span className="badge badge-neutral">Washington Accord Compliant</span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--empiria-border)', textAlign: 'left', color: 'var(--empiria-text-secondary)' }}>
                        <th style={{ padding: '10px 12px', fontWeight: 600 }}>Outcome Code</th>
                        <th style={{ padding: '10px 12px', fontWeight: 600 }}>Graduate Attribute / Competency</th>
                        <th style={{ padding: '10px 12px', fontWeight: 600 }}>Attainment Level</th>
                        <th style={{ padding: '10px 12px', fontWeight: 600 }}>Curriculum Evidence</th>
                        <th style={{ padding: '10px 12px', fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { code: 'PO1 (ABET 1)', name: 'Engineering Knowledge & Mathematical Foundations', pct: 86, course: 'CS201 Data Structures, CS301 Systems', status: 'Met' },
                        { code: 'PO2 (ABET 1)', name: 'Problem Analysis & Computational Complexity', pct: 82, course: 'CS301 Algorithm Design Lab', status: 'Met' },
                        { code: 'PO3 (ABET 2)', name: 'Design & Development of Complex Software Solutions', pct: 89, course: 'CS402 Full-Stack Engineering, Studio Lab', status: 'Met' },
                        { code: 'PO4 (ABET 6)', name: 'Investigation of Complex Problems via Experiments', pct: 78, course: 'CS409 Multimodal AI Prototyping', status: 'In Progress' },
                        { code: 'PO5 (ABET 7)', name: 'Modern Tool Usage (Git, Cloud, Docker, CI/CD)', pct: 94, course: 'Continuous Lab Practice & Studio', status: 'Met' },
                        { code: 'PO8 (ABET 4)', name: 'Ethics, Security & Data Privacy Governance', pct: 91, course: 'CS310 Cyber Ethics & SOC2 Auditing', status: 'Met' },
                        { code: 'PO9 (ABET 5)', name: 'Individual & Agile Teamwork Dynamics', pct: 88, course: 'Peer Skill Swap Network Collaboration', status: 'Met' },
                        { code: 'PO11 (ABET 4)', name: 'Project Management, Cap Tables & Venture Finance', pct: 76, course: 'Apex Center for Innovation Incubation', status: 'In Progress' },
                      ].map((po, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--empiria-border)' }}>
                          <td style={{ padding: '12px', fontWeight: 700, color: 'var(--empiria-primary)' }}>{po.code}</td>
                          <td style={{ padding: '12px', fontWeight: 600, color: 'var(--empiria-text-primary)' }}>{po.name}</td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, width: '32px' }}>{po.pct}%</span>
                              <div style={{ width: '80px', height: '5px', background: 'var(--empiria-border)', borderRadius: '999px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${po.pct}%`, background: po.pct >= 80 ? '#10b981' : '#2563eb' }} />
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px', color: 'var(--empiria-text-secondary)', fontSize: '12px' }}>{po.course}</td>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '999px',
                                background: po.status === 'Met' ? '#ecfdf5' : '#eff6ff',
                                color: po.status === 'Met' ? '#047857' : '#1d4ed8',
                              }}
                            >
                              {po.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: VERIFIABLE SKILL PASSPORT (CRYPTOGRAPHIC CREDENTIAL)                */}
          {/* ========================================================================= */}
          {activeTab === 'passport' && (
            <div>
              {passport ? (
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                  {/* Passport Actions Toolbar */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                      background: 'var(--empiria-surface)',
                      border: '1px solid var(--empiria-border)',
                      borderRadius: '12px',
                      padding: '14px 20px',
                      marginBottom: '20px',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={20} color="#10b981" />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--empiria-text-primary)' }}>
                        Cryptographic Credential Active & Verified
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={downloadPassportJson}>
                        <Download size={14} style={{ marginRight: '6px' }} /> Download JSON
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                        <Printer size={14} style={{ marginRight: '6px' }} /> Print Certificate
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => copyToClipboard(passport.verification_url || `https://verify.empiria.app/passport/${passport.passport_id}`, 'link')}
                      >
                        {copiedLink ? <Check size={14} style={{ marginRight: '6px' }} /> : <Share2 size={14} style={{ marginRight: '6px' }} />}
                        {copiedLink ? 'Link Copied!' : 'Copy Verification URL'}
                      </button>
                    </div>
                  </div>

                  {/* Physical Passport / Certificate Layout */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '2px solid #1e3a8a',
                      borderRadius: '20px',
                      padding: '36px',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                      position: 'relative',
                    }}
                  >
                    {/* Top Gold Trim & Crest */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        borderBottom: '2px solid #e2e8f0',
                        paddingBottom: '24px',
                        marginBottom: '24px',
                        flexWrap: 'wrap',
                        gap: '16px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '12px',
                              background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: '22px',
                            }}
                          >
                            E
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-heading)' }}>
                              EMPIRIA VERIFIABLE SKILL PASSPORT
                            </h3>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                              Apex Institute of Technology • Autonomous Academic Body
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            color: '#065f46',
                            padding: '4px 12px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 800,
                            letterSpacing: '0.5px',
                          }}
                        >
                          OFFICIAL CRYPTOGRAPHIC CREDENTIAL
                        </span>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', fontFamily: 'monospace' }}>
                          ID: {passport.passport_id}
                        </div>
                      </div>
                    </div>

                    {/* Student Metadata Card */}
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '20px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '16px',
                        marginBottom: '24px',
                        fontSize: '13px',
                      }}
                    >
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Candidate Name</span>
                        <div style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a', marginTop: '2px' }}>{passport.student_name}</div>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Student Identifier</span>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>
                          {passport.student_identifier}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Academic Degree</span>
                        <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{passport.program_name || 'B.Tech Computer Science & AI'}</div>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Cohort & Term</span>
                        <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{passport.academic_cohort || 'Cohort 2024–2028 • Term VI'}</div>
                      </div>
                    </div>

                    {/* Verified Competencies Section */}
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Award size={18} color="#2563eb" /> Verified Academic & Technical Competencies
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                        {passport.verified_competencies?.map((comp: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              padding: '14px',
                              borderRadius: '12px',
                              border: '1px solid #e2e8f0',
                              background: '#ffffff',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{comp.competency_name}</div>
                              <span style={{ background: '#dbeafe', color: '#1e40af', fontWeight: 800, fontSize: '12px', padding: '2px 8px', borderRadius: '6px' }}>
                                {comp.demonstrated_score ? `${comp.demonstrated_score}%` : 'Level 4.2'}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={13} /> {comp.endorsed_by || 'Apex Academic Accreditation Committee'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Venture & Co-Curricular Endorsements */}
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Rocket size={18} color="#f59e0b" /> Venture & Entrepreneurial Endorsements
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                        {passport.venture_endorsements?.map((v: any, idx: number) => (
                          <div key={idx} style={{ padding: '14px', borderRadius: '12px', background: '#fffbeb', border: '1px solid #fde68a' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontWeight: 800, fontSize: '13px', color: '#92400e' }}>{v.venture_name}</div>
                              <span style={{ fontSize: '10px', fontWeight: 700, background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px' }}>
                                {v.role}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#78350f', marginTop: '4px' }}>Status: {v.status}</div>
                            <div style={{ fontSize: '10px', color: '#a16207', marginTop: '2px' }}>
                              Endorsed by {v.endorser} • {v.date}
                            </div>
                          </div>
                        )) || (
                          <div style={{ padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
                            No venture endorsements issued yet. Declare a venture in the Startup Hub to request ACIE committee endorsement.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cryptographic Seal & Hash */}
                    <div
                      style={{
                        background: '#0f172a',
                        borderRadius: '14px',
                        padding: '18px 22px',
                        color: '#ffffff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '260px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#38bdf8' }}>
                          Tamper-Evident SHA-256 Ledger Signature
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '11.5px', color: '#94a3b8', wordBreak: 'break-all', marginTop: '4px' }}>
                          {passport.cryptographic_signature_sha256}
                        </div>
                      </div>

                      <button
                        onClick={() => copyToClipboard(passport.cryptographic_signature_sha256, 'hash')}
                        style={{
                          background: 'rgba(255,255,255,0.15)',
                          border: 'none',
                          color: '#ffffff',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {copiedHash ? <Check size={14} color="#38bdf8" /> : <Copy size={14} />}
                        {copiedHash ? 'Hash Copied!' : 'Copy Hash'}
                      </button>
                    </div>

                    {/* Statutory Disclaimer */}
                    <div style={{ marginTop: '20px', fontSize: '11px', color: '#94a3b8', lineHeight: 1.5, textAlign: 'center' }}>
                      {passport.statutory_disclaimer}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--empiria-surface)', borderRadius: '16px', border: '1px solid var(--empiria-border)' }}>
                  <ShieldCheck size={36} color="var(--empiria-primary)" style={{ margin: '0 auto 12px auto' }} />
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 700 }}>Generate Your Skill Passport</h4>
                  <p style={{ color: 'var(--empiria-text-secondary)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px auto' }}>
                    Assemble your accredited course outcomes, venture accomplishments, and ABET milestones into an official tamper-evident credential.
                  </p>
                  <button className="btn btn-primary" onClick={handleExportPassport} disabled={exportingPassport}>
                    {exportingPassport ? 'Signing Cryptographic Seal...' : 'Sign & Export Skill Passport'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal: Declare Career Goal */}
      {showDeclareModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ maxWidth: '480px', width: '100%', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={20} color="var(--empiria-primary)" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                  Declare Career / Venture Goal
                </h3>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDeclareModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleDeclareGoal}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '6px' }}>
                  Target Occupational Profile
                </label>
                <select
                  className="form-control"
                  value={selectedOccupationId}
                  onChange={(e) => setSelectedOccupationId(e.target.value)}
                  style={{ height: '42px', borderRadius: '10px' }}
                >
                  {occupations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title} ({o.taxonomy} • {o.code})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '6px' }}>
                    Priority Level
                  </label>
                  <select className="form-control" value={goalPriority} onChange={(e) => setGoalPriority(e.target.value)} style={{ height: '42px', borderRadius: '10px' }}>
                    <option value="primary">Primary Objective</option>
                    <option value="secondary">Secondary Pathway</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '6px' }}>
                    Target Graduation Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={targetGradDate}
                    onChange={(e) => setTargetGradDate(e.target.value)}
                    style={{ height: '42px', borderRadius: '10px' }}
                  />
                </div>
              </div>

              {/* VD Council Callout when selecting a Startup Pathway */}
              {isStartupTrack && (
                <div style={{ padding: '14px', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Rocket size={14} /> Partner Incubator: VD Council
                    </div>
                    <a href={vdCouncilUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', fontWeight: 700, color: '#059669', textDecoration: 'none' }}>
                      Visit VD Council ↗
                    </a>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#047857', lineHeight: 1.45 }}>
                    Declaring this startup pathway unlocks pre-screening for the VD Council student incubation cohort and institutional venture grants.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeclareModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={declaring}>
                  {declaring ? 'Saving...' : 'Confirm Career Alignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Configure VD Council Website Link */}
      {showVdUrlModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ maxWidth: '480px', width: '100%', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Rocket size={20} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                  Configure VD Council Official Link
                </h3>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowVdUrlModal(false)}>
                <X size={16} />
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--empiria-text-secondary)', lineHeight: 1.5 }}>
              Enter the official URL for the VD Council website. This will be the 1-click destination when students choose the startup pathway.
            </p>

            <form onSubmit={handleSaveVdUrl}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '6px' }}>
                  VD Council Official Website URL
                </label>
                <input
                  type="url"
                  className="form-control"
                  value={tempVdUrl}
                  onChange={(e) => setTempVdUrl(e.target.value)}
                  placeholder="https://vd-council.vercel.app/"
                  required
                  style={{ height: '42px', borderRadius: '10px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowVdUrlModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }}>
                  Save & Connect Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
