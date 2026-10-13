import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import {
  Compass,
  Trophy,
  Dumbbell,
  Music,
  Gamepad2,
  Code2,
  Plus,
  Calendar,
  Clock,
  RefreshCw,
  X,
  Shield,
} from 'lucide-react'

export const CoCurricularPathwaysView: React.FC = () => {
  const [activities, setActivities] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<'pursuits' | 'catalogue' | 'sessions'>('pursuits')
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Enroll Modal
  const [showEnrollModal, setShowEnrollModal] = useState<boolean>(false)
  const [selectedActivityId, setSelectedActivityId] = useState<string>('')
  const [aspirationLevel, setAspirationLevel] = useState<string>('competitive')
  const [weeklyHours, setWeeklyHours] = useState<number>(5.0)
  const [enrolling, setEnrolling] = useState<boolean>(false)

  // Log Practice Session Modal
  const [showPracticeModal, setShowPracticeModal] = useState<boolean>(false)
  const [practiceEnrollmentId, setPracticeEnrollmentId] = useState<string>('')
  const [sessionType, setSessionType] = useState<string>('independent')
  const [durationMinutes, setDurationMinutes] = useState<number>(60)
  const [focusTechnique, setFocusTechnique] = useState<string>('')
  const [practiceNotes, setPracticeNotes] = useState<string>('')
  const [selfScore, setSelfScore] = useState<number>(8.0)
  const [loggingPractice, setLoggingPractice] = useState<boolean>(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      setLoading(true)
      const [acts, enrs, sess] = await Promise.all([
        api.listCoCurricularActivities().catch(() => []),
        api.listCoCurricularEnrollments().catch(() => []),
        api.listPracticeSessions().catch(() => []),
      ])
      setActivities(acts || [])
      setEnrollments(enrs || [])
      setSessions(sess || [])
      if (acts && acts.length > 0 && !selectedActivityId) {
        setSelectedActivityId(acts[0].id)
      }
      if (enrs && enrs.length > 0 && !practiceEnrollmentId) {
        setPracticeEnrollmentId(enrs[0].id)
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load Co-Curricular data.' })
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedActivityId) return
    try {
      setEnrolling(true)
      await api.enrollInCoCurricularActivity({
        activity_id: selectedActivityId,
        aspiration_level: aspirationLevel,
        weekly_hours_target: weeklyHours,
      })
      setStatusMsg({ type: 'success', text: 'Enrolled in co-curricular talent pathway!' })
      setShowEnrollModal(false)
      await loadAll()
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to enroll in activity.' })
    } finally {
      setEnrolling(false)
    }
  }

  const handleLogPractice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!practiceEnrollmentId || !focusTechnique.trim()) return
    try {
      setLoggingPractice(true)
      await api.logPracticeSession({
        enrollment_id: practiceEnrollmentId,
        session_type: sessionType,
        duration_minutes: durationMinutes,
        focus_technique: focusTechnique.trim(),
        notes: practiceNotes.trim() || undefined,
        self_evaluation_score: selfScore,
      })
      setStatusMsg({ type: 'success', text: 'Practice session logged in talent evidence ledger!' })
      setShowPracticeModal(false)
      setFocusTechnique('')
      setPracticeNotes('')
      await loadAll()
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to log practice session.' })
    } finally {
      setLoggingPractice(false)
    }
  }

  const getCategoryIcon = (cat: string) => {
    if (cat?.includes('sports') || cat?.includes('racquet')) return <Dumbbell size={18} color="var(--empiria-primary)" />
    if (cat?.includes('music') || cat?.includes('vocal')) return <Music size={18} color="var(--empiria-primary)" />
    if (cat?.includes('esports') || cat?.includes('gaming')) return <Gamepad2 size={18} color="var(--empiria-primary)" />
    return <Code2 size={18} color="var(--empiria-primary)" />
  }

  return (
    <div className="section-container" style={{ padding: '0 0 40px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-flex', padding: '8px', background: 'var(--empiria-primary-subtle)', borderRadius: '8px', color: 'var(--empiria-primary)' }}>
              <Trophy size={22} />
            </span>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)' }}>
              Co-Curricular & Talent Pathways
            </h2>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: 'var(--empiria-text-secondary)' }}>
            The Two-Pathway Architecture: Formal academic degrees running in parallel with creative, athletic, and esports pursuits without composite dilution.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {enrollments.length > 0 && (
            <button className="btn btn-secondary" onClick={() => setShowPracticeModal(true)}>
              <Clock size={16} style={{ marginRight: '6px' }} /> Log Practice Session
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowEnrollModal(true)}>
            <Plus size={16} style={{ marginRight: '6px' }} /> Join Activity Pathway
          </button>
        </div>
      </div>

      {/* Educational Explainer Banner */}
      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <Trophy size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#2563eb', background: '#dbeafe', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
              Dual-Track Talent Architecture
            </span>
            <div className="explainer-title" style={{ margin: 0 }}>
              What are Co-Curricular Pathways?
            </div>
          </div>
          <div className="explainer-text">
            Empiria tracks your athletic, artistic, and esports accomplishments in dedicated talent tracks that run alongside your degree — ensuring holistic recognition without diluting core academic rigor.
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className={`status-banner status-${statusMsg.type}`} style={{ marginBottom: '20px' }}>
          {statusMsg.text}
        </div>
      )}

      {/* Two-Pathway Architectural Guarantee Banner */}
      <div
        style={{
          background: 'var(--empiria-surface)',
          border: '1px solid var(--empiria-border)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield size={20} color="var(--badge-pass-text)" />
          <div style={{ fontSize: '13px', color: 'var(--empiria-text-primary)' }}>
            <strong>Pathway Decoupling Inviolate Guarantee:</strong> Co-curricular hours and scores never conflate or downgrade formal accredited academic transcripts.
          </div>
        </div>
        <span className="badge badge-met">Independent Telemetry</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--empiria-border)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('pursuits')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'pursuits' ? '2px solid var(--empiria-primary)' : '2px solid transparent',
            color: activeTab === 'pursuits' ? 'var(--empiria-primary)' : 'var(--empiria-text-secondary)',
            fontWeight: activeTab === 'pursuits' ? 600 : 500,
            padding: '10px 18px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Trophy size={16} /> My Enrolled Pursuits ({enrollments.length})
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'sessions' ? '2px solid var(--empiria-primary)' : '2px solid transparent',
            color: activeTab === 'sessions' ? 'var(--empiria-primary)' : 'var(--empiria-text-secondary)',
            fontWeight: activeTab === 'sessions' ? 600 : 500,
            padding: '10px 18px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Calendar size={16} /> Practice Session Log ({sessions.length})
        </button>

        <button
          onClick={() => setActiveTab('catalogue')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'catalogue' ? '2px solid var(--empiria-primary)' : '2px solid transparent',
            color: activeTab === 'catalogue' ? 'var(--empiria-primary)' : 'var(--empiria-text-secondary)',
            fontWeight: activeTab === 'catalogue' ? 600 : 500,
            padding: '10px 18px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Compass size={16} /> Activity Catalogue ({activities.length})
        </button>
      </div>

      {/* Tab 1: Enrolled Pursuits */}
      {activeTab === 'pursuits' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <RefreshCw size={24} className="spin" style={{ color: 'var(--empiria-primary)', margin: '0 auto 12px auto' }} />
              <p style={{ color: 'var(--empiria-text-secondary)', fontSize: '13px' }}>Loading Talent Pursuits...</p>
            </div>
          ) : enrollments.length === 0 ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <Trophy size={40} style={{ color: 'var(--empiria-accent)', margin: '0 auto 12px auto', opacity: 0.6 }} />
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', margin: '0 0 6px 0' }}>No Active Co-Curricular Pursuits</h3>
              <p style={{ color: 'var(--empiria-text-secondary)', fontSize: '14px', maxWidth: '460px', margin: '0 auto 20px auto' }}>
                EMPIRIA lets you pursue athletics, vocal music, or competitive esports alongside your degree with dedicated mentorship and practice logs.
              </p>
              <button className="btn btn-primary" onClick={() => setShowEnrollModal(true)}>
                <Plus size={15} style={{ marginRight: '6px' }} /> Join First Activity Pathway
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {enrollments.map((enr) => (
                <div
                  key={enr.id}
                  style={{
                    background: 'var(--empiria-surface)',
                    border: '1px solid var(--empiria-border)',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ display: 'inline-flex', padding: '6px', background: 'var(--empiria-surface-muted)', borderRadius: '6px' }}>
                        {getCategoryIcon(enr.activity_category)}
                      </span>
                      <span className="badge badge-met" style={{ textTransform: 'capitalize' }}>
                        {enr.aspiration_level}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--empiria-text-primary)', margin: '0 0 6px 0', fontFamily: 'var(--font-heading)' }}>
                      {enr.activity_name || 'Athletic / Talent Pathway'}
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', marginBottom: '16px' }}>
                      Proficiency: <strong style={{ textTransform: 'capitalize', color: 'var(--empiria-text-primary)' }}>{enr.current_proficiency_level || 'Developing'}</strong>
                    </div>

                    <div style={{ padding: '12px', background: 'var(--empiria-surface-muted)', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--empiria-text-secondary)' }}>Weekly Target:</span>
                      <strong>{enr.weekly_hours_target} hrs / week</strong>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--empiria-border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--empiria-text-secondary)' }}>Status: Active Pursuit</span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setPracticeEnrollmentId(enr.id)
                        setShowPracticeModal(true)
                      }}
                    >
                      Log Practice
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Practice Sessions Log */}
      {activeTab === 'sessions' && (
        <div style={{ background: 'var(--empiria-surface)', border: '1px solid var(--empiria-border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--empiria-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--empiria-text-primary)', fontFamily: 'var(--font-heading)' }}>
              Logged Practice Drills & Verification Telemetry
            </h3>
            <span className="badge badge-neutral">{sessions.length} sessions</span>
          </div>

          {sessions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--empiria-text-secondary)', fontSize: '14px' }}>
              No practice sessions recorded yet. Log your first drill to record verifiable evidence.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--empiria-surface-muted)', borderBottom: '1px solid var(--empiria-border)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Focus Technique</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Duration</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Self Evaluation</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Notes</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--empiria-border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--empiria-text-primary)' }}>{s.focus_technique}</td>
                      <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{s.session_type?.replace('_', ' ')}</td>
                      <td style={{ padding: '12px 16px' }}>{s.duration_minutes} mins</td>
                      <td style={{ padding: '12px 16px' }}>
                        {s.self_evaluation_score ? (
                          <span style={{ fontWeight: 600, color: 'var(--empiria-accent)' }}>{s.self_evaluation_score.toFixed(1)} / 10</span>
                        ) : 'N/A'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--empiria-text-secondary)' }}>{s.notes || '—'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--empiria-text-secondary)', fontSize: '12px' }}>
                        {new Date(s.session_date || s.created_at || Date.now()).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Activity Catalogue */}
      {activeTab === 'catalogue' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '20px' }}>
          {activities.map((act) => (
            <div
              key={act.id}
              style={{
                background: 'var(--empiria-surface)',
                border: '1px solid var(--empiria-border)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  {getCategoryIcon(act.category)}
                  <span style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', textTransform: 'capitalize' }}>
                    {act.category?.replace('_', ' ')}
                  </span>
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--empiria-text-primary)', margin: '0 0 8px 0', fontFamily: 'var(--font-heading)' }}>
                  {act.name}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--empiria-text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                  {act.description || 'Structured co-curricular pursuit with rubric-based progression milestones.'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--empiria-border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--empiria-text-secondary)' }}>Modalities: Video / Camera</span>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setSelectedActivityId(act.id)
                    setShowEnrollModal(true)
                  }}
                >
                  Join Pathway
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Enroll in Activity */}
      {showEnrollModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                Enroll in Co-Curricular Activity
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowEnrollModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEnroll}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>Select Activity</label>
                <select
                  className="form-control"
                  value={selectedActivityId}
                  onChange={(e) => setSelectedActivityId(e.target.value)}
                >
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.category})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>Aspiration Level</label>
                  <select
                    className="form-control"
                    value={aspirationLevel}
                    onChange={(e) => setAspirationLevel(e.target.value)}
                  >
                    <option value="recreational">Recreational</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="competitive">Competitive</option>
                    <option value="professional">Professional</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>Target Weekly Hours</label>
                  <input
                    type="number"
                    className="form-control"
                    min={1}
                    max={30}
                    step={0.5}
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEnrollModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={enrolling}>
                  {enrolling ? 'Enrolling...' : 'Confirm Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log Practice */}
      {showPracticeModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                Log Practice Drill Session
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPracticeModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleLogPractice}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>Activity Pursuit</label>
                <select
                  className="form-control"
                  value={practiceEnrollmentId}
                  onChange={(e) => setPracticeEnrollmentId(e.target.value)}
                >
                  {enrollments.map((en) => (
                    <option key={en.id} value={en.id}>
                      {en.activity_name || 'Activity'} ({en.aspiration_level})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>Session Type</label>
                  <select
                    className="form-control"
                    value={sessionType}
                    onChange={(e) => setSessionType(e.target.value)}
                  >
                    <option value="independent">Independent</option>
                    <option value="ai_guided">AI-Guided Studio</option>
                    <option value="peer_skill_swap">Peer Swap</option>
                    <option value="mentor_coached">Mentor Coached</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>Duration (Mins)</label>
                  <input
                    type="number"
                    className="form-control"
                    min={15}
                    max={240}
                    step={15}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>Focus Technique / Drill Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Forehand topspin cross-court drills & recovery footwork"
                  value={focusTechnique}
                  onChange={(e) => setFocusTechnique(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>Self-Evaluation Score: {selfScore} / 10</label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={selfScore}
                  onChange={(e) => setSelfScore(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>Reflections & Qualitative Notes</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Observations on rhythm, biomechanical fatigue, or areas to adjust next time..."
                  value={practiceNotes}
                  onChange={(e) => setPracticeNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPracticeModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loggingPractice}>
                  {loggingPractice ? 'Logging...' : 'Save Practice Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
