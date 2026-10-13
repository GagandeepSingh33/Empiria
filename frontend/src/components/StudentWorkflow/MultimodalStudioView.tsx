import React, { useState } from 'react'
import { api } from '../../api'
import {
  Mic,
  Video,
  Code2,
  Play,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Activity,
  Layers,
} from 'lucide-react'

export const MultimodalStudioView: React.FC = () => {
  const [modality, setModality] = useState<'code_ast' | 'audio_vocal' | 'video_motion'>('code_ast')
  const [goalDescription, setGoalDescription] = useState<string>('Refactor SQL query to use window functions and analyze execution plan')
  const [startingLevel, setStartingLevel] = useState<string>('intermediate')

  // Studio Session State
  const [session, setSession] = useState<any | null>(null)
  const [starting, setStarting] = useState<boolean>(false)
  const [submittingAttempt, setSubmittingAttempt] = useState<boolean>(false)
  const [assessmentResult, setAssessmentResult] = useState<any | null>(null)
  const [completing, setCompleting] = useState<boolean>(false)
  const [completed, setCompleted] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Modality-specific inputs
  const [codeSource, setCodeSource] = useState<string>(
`def compute_cohort_rankings(scores):
    # Sort students and assign sequential dense ranks
    sorted_scores = sorted(scores, key=lambda x: x['score'], reverse=True)
    for rank, item in enumerate(sorted_scores, start=1):
        item['cohort_rank'] = rank
    return sorted_scores`
  )
  const [audioFreq, setAudioFreq] = useState<number>(440.0)
  const [jointAngle, setJointAngle] = useState<number>(90.0)

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setStarting(true)
      setErrorMsg(null)
      setAssessmentResult(null)
      setCompleted(false)
      const s = await api.startStudioSession({
        modality,
        goal_description: goalDescription,
        starting_level: startingLevel,
      })
      setSession(s)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize Multimodal Studio session.')
    } finally {
      setStarting(false)
    }
  }

  const handleSubmitAttempt = async () => {
    if (!session) return
    try {
      setSubmittingAttempt(true)
      setErrorMsg(null)

      let payload: any = {}
      if (modality === 'code_ast') {
        payload = { source_code: codeSource }
      } else if (modality === 'audio_vocal') {
        payload = {
          target_frequency_hz: 440.0,
          detected_frequencies_hz: [audioFreq, audioFreq * 1.02, audioFreq * 0.99],
          background_noise_ratio: 0.05,
        }
      } else if (modality === 'video_motion') {
        payload = {
          exercise_type: 'lateral_lunge',
          joint_angles: { knee_angle: jointAngle, hip_angle: 85.0 },
          camera_visibility_score: 0.95,
        }
      }

      const result = await api.submitAttemptTelemetry(session.id, payload)
      setAssessmentResult(result)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to analyze multimodal attempt.')
    } finally {
      setSubmittingAttempt(false)
    }
  }

  const handleCompleteSession = async () => {
    if (!session) return
    try {
      setCompleting(true)
      await api.completeStudioSession(session.id)
      setCompleted(true)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to finalize studio session.')
    } finally {
      setCompleting(false)
    }
  }

  const steps = [
    { num: 1, label: 'Goal Definition' },
    { num: 2, label: 'Demonstration' },
    { num: 3, label: 'Student Attempt' },
    { num: 4, label: 'Rubric Analysis' },
    { num: 5, label: 'Adaptive Feedback' },
    { num: 6, label: 'Verification' },
  ]

  const currentStepNum = completed ? 6 : assessmentResult ? 5 : session ? 3 : 1

  return (
    <div className="section-container" style={{ padding: '0 0 40px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-flex', padding: '8px', background: 'var(--empiria-primary-subtle)', borderRadius: '8px', color: 'var(--empiria-primary)' }}>
              <Activity size={22} />
            </span>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)' }}>
              Multimodal AI Learning Studio
            </h2>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: 'var(--empiria-text-secondary)' }}>
            Interactive 6-step mastery loop across voice pitch, motion biomechanics, and code syntax trees. Transient telemetry, zero emotion profiling.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: 'var(--badge-pass-bg)', color: 'var(--badge-pass-text)', border: '1px solid var(--badge-pass-border)', padding: '6px 12px', borderRadius: '999px', fontWeight: 600 }}>
          <ShieldCheck size={14} /> Inviolate Media Privacy Protected
        </div>
      </div>

      {/* Educational Explainer Banner */}
      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <Activity size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#2563eb', background: '#dbeafe', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
              Interactive Mastery Lab
            </span>
            <div className="explainer-title" style={{ margin: 0 }}>
              What is the Multimodal AI Studio?
            </div>
          </div>
          <div className="explainer-text">
            A real-time practice environment where you receive automated rubric feedback across speech tone, code structure, and demonstration accuracy — with strict zero-storage media privacy protections.
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="status-banner status-error" style={{ marginBottom: '20px' }}>
          {errorMsg}
        </div>
      )}

      {/* 6-Step Loop Progress Indicator */}
      <div
        style={{
          background: 'var(--empiria-surface)',
          border: '1px solid var(--empiria-border)',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', textTransform: 'uppercase', marginBottom: '14px' }}>
          The Interactive 6-Step Mastery Loop
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
          {steps.map((st) => {
            const isDone = currentStepNum > st.num
            const isCurrent = currentStepNum === st.num

            return (
              <div
                key={st.num}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: isCurrent ? 'var(--empiria-primary)' : isDone ? 'var(--badge-pass-border)' : 'var(--empiria-border)',
                  background: isCurrent ? 'var(--empiria-primary-subtle)' : isDone ? 'var(--badge-pass-bg)' : 'var(--empiria-surface-muted)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: isCurrent ? 'var(--empiria-primary)' : isDone ? 'var(--badge-pass-text)' : 'var(--empiria-text-secondary)' }}>
                  Step {st.num}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-primary)', marginTop: '2px' }}>
                  {st.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {!session ? (
        /* Setup / Initiation Form */
        <div className="card" style={{ padding: '24px', maxWidth: '720px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)', marginBottom: '16px' }}>
            Configure Multimodal Studio Session
          </h3>

          <form onSubmit={handleStartSession}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '8px' }}>Select Practice Modality</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div
                  onClick={() => {
                    setModality('code_ast')
                    setGoalDescription('Refactor SQL query to use window functions and analyze execution plan')
                  }}
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: modality === 'code_ast' ? 'var(--empiria-primary)' : 'var(--empiria-border)',
                    background: modality === 'code_ast' ? 'var(--empiria-primary-subtle)' : 'var(--empiria-surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <Code2 size={20} color="var(--empiria-primary)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>Code & AST</div>
                    <div style={{ fontSize: '11px', color: 'var(--empiria-text-secondary)' }}>Syntax trees & logic</div>
                  </div>
                </div>

                <div
                  onClick={() => {
                    setModality('audio_vocal')
                    setGoalDescription('Practice diaphragm breath support and concert A 440Hz intonation')
                  }}
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: modality === 'audio_vocal' ? 'var(--empiria-primary)' : 'var(--empiria-border)',
                    background: modality === 'audio_vocal' ? 'var(--empiria-primary-subtle)' : 'var(--empiria-surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <Mic size={20} color="var(--empiria-primary)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>Voice & Audio</div>
                    <div style={{ fontSize: '11px', color: 'var(--empiria-text-secondary)' }}>Pitch & resonance</div>
                  </div>
                </div>

                <div
                  onClick={() => {
                    setModality('video_motion')
                    setGoalDescription('Analyze lateral footwork mechanics and knee joint angle')
                  }}
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: modality === 'video_motion' ? 'var(--empiria-primary)' : 'var(--empiria-border)',
                    background: modality === 'video_motion' ? 'var(--empiria-primary-subtle)' : 'var(--empiria-surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <Video size={20} color="var(--empiria-primary)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>Video & Motion</div>
                    <div style={{ fontSize: '11px', color: 'var(--empiria-text-secondary)' }}>Joint biomechanics</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>Session Learning Objective</label>
              <input
                type="text"
                className="form-control"
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>Starting Demonstrated Level</label>
              <select
                className="form-control"
                value={startingLevel}
                onChange={(e) => setStartingLevel(e.target.value)}
              >
                <option value="beginner">Beginner (Foundational)</option>
                <option value="intermediate">Intermediate (Developing)</option>
                <option value="proficient">Proficient (Target Mastery)</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} disabled={starting}>
              <Play size={16} /> {starting ? 'Initializing Multimodal Model...' : 'Start Studio Interactive Loop'}
            </button>
          </form>
        </div>
      ) : (
        /* Active Studio Workspace */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {/* Left: Input & Demonstration */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--empiria-border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                Step 3: Student Attempt Telemetry
              </h3>
              <span className="badge badge-info" style={{ textTransform: 'uppercase' }}>
                {modality.replace('_', ' ')}
              </span>
            </div>

            {modality === 'code_ast' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '6px' }}>Source Code Editor</label>
                <textarea
                  className="form-control"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', minHeight: '220px', lineHeight: 1.5 }}
                  value={codeSource}
                  onChange={(e) => setCodeSource(e.target.value)}
                />
              </div>
            )}

            {modality === 'audio_vocal' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '6px' }}>Simulated Audio Frequency Input (Hz)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                  <input
                    type="range"
                    min={200}
                    max={800}
                    value={audioFreq}
                    onChange={(e) => setAudioFreq(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontWeight: 700, fontSize: '16px', minWidth: '70px', fontFamily: 'var(--font-mono)' }}>{audioFreq} Hz</span>
                </div>
                <div style={{ padding: '12px', background: 'var(--empiria-surface-muted)', borderRadius: '8px', fontSize: '12px', color: 'var(--empiria-text-secondary)' }}>
                  Target: <strong>440.0 Hz (A4)</strong> • Deviation: {Math.abs(audioFreq - 440).toFixed(1)} Hz
                </div>
              </div>
            )}

            {modality === 'video_motion' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '6px' }}>Simulated Knee Joint Angle (Degrees)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                  <input
                    type="range"
                    min={45}
                    max={150}
                    value={jointAngle}
                    onChange={(e) => setJointAngle(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontWeight: 700, fontSize: '16px', minWidth: '70px', fontFamily: 'var(--font-mono)' }}>{jointAngle}°</span>
                </div>
                <div style={{ padding: '12px', background: 'var(--empiria-surface-muted)', borderRadius: '8px', fontSize: '12px', color: 'var(--empiria-text-secondary)' }}>
                  Target Biomechanical Angle: <strong>90°</strong> • Measured Variance: {Math.abs(jointAngle - 90)}°
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                className="btn btn-primary"
                onClick={handleSubmitAttempt}
                disabled={submittingAttempt || completed}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Sparkles size={16} /> {submittingAttempt ? 'Evaluating Attempt...' : 'Submit Attempt for AI Evaluation'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setSession(null)}
                title="Restart Session"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          {/* Right: Rubric Assessment & Adaptive Next Step */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--empiria-border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                Step 4 & 5: Rubric & Adaptation
              </h3>
              {assessmentResult && (
                <span className="badge badge-met">
                  Confidence: {((assessmentResult.confidence_metric || 0.95) * 100).toFixed(0)}%
                </span>
              )}
            </div>

            {!assessmentResult ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--empiria-text-secondary)', fontSize: '13px' }}>
                <Layers size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                <p>Submit your attempt on the left to trigger deterministic AST and sensory rubric assessment.</p>
              </div>
            ) : (
              <div>
                {/* Rubric Scores */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Demonstrated Rubric Scores
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {Object.entries(assessmentResult.rubric_scores || {}).map(([crit, sc]: [string, any]) => (
                      <div key={crit} style={{ padding: '8px 10px', background: 'var(--empiria-surface-muted)', borderRadius: '6px', border: '1px solid var(--empiria-border)', fontSize: '12px' }}>
                        <span style={{ color: 'var(--empiria-text-secondary)', textTransform: 'capitalize' }}>{crit.replace('_', ' ')}:</span>{' '}
                        <strong style={{ color: 'var(--empiria-text-primary)' }}>{typeof sc === 'number' ? sc.toFixed(1) : sc} / 5.0</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feedback */}
                <div style={{ padding: '14px', background: 'var(--empiria-primary-subtle)', borderRadius: '8px', border: '1px solid var(--empiria-border)', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--empiria-primary)', marginBottom: '4px' }}>
                    Adaptive Feedback Instruction
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--empiria-text-primary)', lineHeight: 1.5 }}>
                    {assessmentResult.feedback_instruction}
                  </p>
                </div>

                {/* Next Adapted Exercise */}
                {assessmentResult.next_exercise_prompt && (
                  <div style={{ padding: '12px', background: 'var(--empiria-surface-muted)', borderRadius: '8px', border: '1px solid var(--empiria-border)', marginBottom: '20px' }}>
                    <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--empiria-text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Step 6: Adapted Follow-Up Drill
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--empiria-text-primary)' }}>
                      {assessmentResult.next_exercise_prompt}
                    </p>
                  </div>
                )}

                {!completed ? (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={handleCompleteSession}
                    disabled={completing}
                  >
                    <CheckCircle2 size={16} /> {completing ? 'Verifying...' : 'Verify Improvement & Complete Loop'}
                  </button>
                ) : (
                  <div style={{ padding: '12px', background: 'var(--badge-pass-bg)', border: '1px solid var(--badge-pass-border)', borderRadius: '8px', color: 'var(--badge-pass-text)', textAlign: 'center', fontWeight: 600, fontSize: '13px' }}>
                    ✓ 6-Step Multimodal Mastery Loop Completed Successfully!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
