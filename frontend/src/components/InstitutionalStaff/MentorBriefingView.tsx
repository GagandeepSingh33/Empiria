import { useState, useEffect } from 'react'
import { api } from '../../api'
import {
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Clock,
  Info,
  BookOpen,
} from 'lucide-react'

export function MentorBriefingView() {
  const [briefings, setBriefings] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [sessionRef, setSessionRef] = useState<string>('Bi-Weekly Advisory Check-In')
  const [currentBriefing, setCurrentBriefing] = useState<any | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [generating, setGenerating] = useState<boolean>(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [briefingFilter, setBriefingFilter] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [bData, sList, eData] = await Promise.all([
        api.getMentorBriefings(),
        api.listStudents().catch(() => []),
        api.getEnrollments().catch(() => []),
      ])
      setBriefings(bData || [])
      if (bData && bData.length > 0) {
        const detail = await api.getMentorBriefingDetail(bData[0].id)
        setCurrentBriefing(detail)
      }

      // Extract unique students from student directory and enrollments
      const studentMap = new Map()
      sList?.forEach((s: any) => {
        studentMap.set(s.id, { id: s.id, name: `${s.first_name} ${s.last_name}`, code: s.student_identifier })
      })
      eData?.forEach((e: any) => {
        if (e.student_id && !studentMap.has(e.student_id)) {
          studentMap.set(e.student_id, { id: e.student_id, name: e.student_name, code: e.student_identifier })
        }
      })
      const uniqueStudents = Array.from(studentMap.values())
      setStudents(uniqueStudents)
      if (uniqueStudents.length > 0) {
        setSelectedStudentId(uniqueStudents[0].id)
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load briefings.' })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!selectedStudentId) return
    try {
      setGenerating(true)
      setStatusMsg(null)
      const b = await api.generateMentorBriefing({
        student_id: selectedStudentId,
        session_reference: sessionRef,
      })
      setStatusMsg({ type: 'success', text: 'Pre-session briefing compiled successfully!' })
      setCurrentBriefing(b)
      const updatedList = await api.getMentorBriefings()
      setBriefings(updatedList || [])
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to generate briefing.' })
    } finally {
      setGenerating(false)
    }
  }

  const handleSelectBriefing = async (id: string) => {
    try {
      const detail = await api.getMentorBriefingDetail(id)
      setCurrentBriefing(detail)
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to fetch briefing detail.' })
    }
  }

  const content = currentBriefing?.briefing_content

  return (
    <div className="section-container">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>
          <Sparkles size={24} color="var(--empiria-primary)" />
          AI-Generated Pre-Session Mentor Briefings
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
          Automated pre-session summaries synthesizing verified attendance trends, competency diagnostics, and goals into structured discussion agendas and open exploratory questions.
        </p>
      </div>

      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <Sparkles size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            Evidence-Based Pre-Session Mentor Briefings
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Synthesize student capability records, attendance trends, and pending assessments into an actionable meeting agenda with curated exploratory coaching questions.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div className={`status-banner status-${statusMsg.type}`} style={{ marginBottom: '20px' }}>
          {statusMsg.text}
        </div>
      )}

      {/* Generator Form */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Student Mentee</label>
            <select
              className="form-control"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Session Focus</label>
            <input
              type="text"
              className="form-control"
              value={sessionRef}
              onChange={(e) => setSessionRef(e.target.value)}
              placeholder="e.g. Midterm Progress & SQL Project"
            />
          </div>

          <div>
            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={generating || !selectedStudentId}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Sparkles size={16} /> Compile Briefing
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>
        {/* Past Briefings List */}
        <div className="card" style={{ padding: '16px', height: 'fit-content' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Past Session Briefings</h4>
            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>{briefings.length} total</span>
          </div>

          {students.length > 1 && (
            <div style={{ marginBottom: '12px' }}>
              <select
                className="form-control"
                style={{ fontSize: '12px', padding: '4px 8px' }}
                value={briefingFilter}
                onChange={(e) => setBriefingFilter(e.target.value)}
              >
                <option value="all">All Students ({briefings.length})</option>
                {students.map((s) => {
                  const cnt = briefings.filter((b) => b.student_id === s.id).length
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} ({cnt})
                    </option>
                  )
                })}
              </select>
            </div>
          )}

          {(() => {
            const visible = briefingFilter === 'all'
              ? briefings
              : briefings.filter((b) => b.student_id === briefingFilter)

            if (visible.length === 0) {
              return (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {briefingFilter === 'all' ? 'No briefings generated yet.' : 'No briefings for this student.'}
                </p>
              )
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px', overflowY: 'auto' }}>
                {visible.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => handleSelectBriefing(b.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: currentBriefing?.id === b.id ? 'var(--empiria-primary)' : 'var(--empiria-border)',
                      background: currentBriefing?.id === b.id ? 'var(--empiria-primary-subtle)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--empiria-text-primary)' }}>{b.student_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--empiria-text-secondary)', marginTop: '2px' }}>
                      {b.session_reference || 'Advisory Session'} • {new Date(b.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>

        {/* Briefing Sheet */}
        <div className="card" style={{ padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading briefing...</div>
          ) : !content ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <BookOpen size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <p>Select a mentee above and compile a structured briefing.</p>
            </div>
          ) : (
            <div>
              {/* Mentee Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{content.student_name}</h3>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Identifier: {content.student_identifier} | Standing: {content.academic_standing}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Method: {currentBriefing.generation_method}</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--empiria-primary)' }}>{currentBriefing.provider_model}</div>
                </div>
              </div>

              {/* Verified Facts */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} color="var(--empiria-primary)" /> Verified Academic Facts & Attendance
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.6 }}>
                  {content.verified_facts?.map((fact: string, idx: number) => (
                    <li key={idx}>{fact}</li>
                  ))}
                </ul>
              </div>

              {/* Suggested Agenda */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} color="var(--empiria-primary)" /> Suggested Discussion Agenda
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {content.suggested_agenda?.map((seg: any, idx: number) => (
                    <div key={idx} style={{ padding: '10px 14px', background: 'var(--empiria-surface-muted)', borderRadius: '6px', borderLeft: '3px solid var(--empiria-primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '13px' }}>
                        <span>{seg.segment}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{seg.duration_minutes} mins</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{seg.focus}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Questions to Explore */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HelpCircle size={16} color="var(--empiria-warning)" /> Questions to Explore & Clarify
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {content.questions_to_explore?.map((q: string, idx: number) => (
                    <div key={idx} style={{ padding: '8px 12px', background: 'var(--empiria-warning-subtle)', borderRadius: '6px', fontSize: '13px', borderLeft: '3px solid var(--empiria-warning)' }}>
                      {q}
                    </div>
                  ))}
                </div>
              </div>

              {/* Advisory Notice */}
              <div style={{ padding: '12px 16px', background: 'var(--empiria-primary-subtle)', borderRadius: '6px', fontSize: '12px', color: 'var(--empiria-primary)', display: 'flex', gap: '10px' }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>{content.disclaimer}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
