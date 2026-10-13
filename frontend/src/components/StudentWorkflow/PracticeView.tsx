import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import type { DevelopmentPlan, PlanTask } from '../../types'
import { PlayCircle, CheckCircle2, Send, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react'

interface PracticeViewProps {
  initialTaskId?: string
  onProceedToVerify: () => void
}

export const PracticeView: React.FC<PracticeViewProps> = ({ initialTaskId, onProceedToVerify }) => {
  const [plan, setPlan] = useState<DevelopmentPlan | null>(null)
  const [selectedTask, setSelectedTask] = useState<PlanTask | null>(null)
  const [submissionText, setSubmissionText] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    loadPlan()
  }, [])

  const loadPlan = async () => {
    try {
      setLoading(true)
      const data = await api.getMyDevelopmentPlan()
      setPlan(data)
      if (data.tasks.length > 0) {
        if (initialTaskId) {
          const match = data.tasks.find((t) => t.id === initialTaskId)
          setSelectedTask(match || data.tasks[0])
          setSubmissionText(match?.submission_text || '')
        } else {
          // default to first non-completed task or first task
          const pending = data.tasks.find((t) => t.status !== 'completed')
          const chosen = pending || data.tasks[0]
          setSelectedTask(chosen)
          setSubmissionText(chosen.submission_text || '')
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTask = (task: PlanTask) => {
    setSelectedTask(task)
    setSubmissionText(task.submission_text || '')
    setError(null)
    setSuccessMsg(null)
  }

  const handleStartTask = async () => {
    if (!selectedTask) return
    try {
      setActionLoading(true)
      setError(null)
      const updated = await api.startPlanTask(selectedTask.id)
      setSelectedTask(updated)
      setSuccessMsg('Activity started! Task is now marked In Progress.')
      await loadPlan()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmitWork = async () => {
    if (!selectedTask || !submissionText.trim()) {
      setError('Please provide submission notes or evidence description.')
      return
    }
    try {
      setActionLoading(true)
      setError(null)
      const updated = await api.submitPlanTaskWork(selectedTask.id, submissionText)
      setSelectedTask(updated)
      setSuccessMsg('Practice work submitted successfully!')
      await loadPlan()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCompleteTask = async () => {
    if (!selectedTask) return
    try {
      setActionLoading(true)
      setError(null)
      const updated = await api.completePlanTask(selectedTask.id)
      setSelectedTask(updated)
      setSuccessMsg('Activity marked Completed!')
      await loadPlan()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
        <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px auto', color: 'var(--primary-600)' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading practice workspace...</p>
      </div>
    )
  }

  if (!plan || plan.tasks.length === 0) {
    return (
      <div className="card">
        <div className="callout callout-warning">
          <AlertCircle size={18} />
          <div>No tasks available in your development plan. Please complete an initial diagnostic assessment.</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <PlayCircle size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            Stage 4: Guided Deliberate Practice & Evidence Submission
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Focus on targeted activities to build muscle memory and mastery. Submit your work reflections, code, or documentation as persistent evidence before scheduling follow-up verification.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Stage 4: Practise — Capability Practice Workspace</h2>
            <p className="card-subtitle">
              Execute targeted exercises, document completed problem sets, and log evidence.
            </p>
          </div>
          <span className="badge badge-info">Persistent Task Workspace</span>
        </div>

        {error && (
          <div className="callout callout-warning">
            <AlertCircle size={18} />
            <div>{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="callout callout-success">
            <CheckCircle2 size={18} />
            <div>{successMsg}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) 2fr', gap: '20px' }}>
          {/* Task Selector Sidebar */}
          <div style={{ borderRight: '1px solid var(--empiria-border)', paddingRight: '16px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--empiria-text-secondary)', marginBottom: '12px' }}>
              Your Practice Tasks
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {plan.tasks.map((task) => {
                const isSelected = selectedTask?.id === task.id
                return (
                  <div
                    key={task.id}
                    onClick={() => handleSelectTask(task)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid var(--empiria-primary)' : '1px solid var(--empiria-border)',
                      backgroundColor: isSelected ? 'var(--empiria-primary-subtle)' : 'var(--empiria-surface)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--empiria-text-secondary)' }}>
                        Priority {task.priority}
                      </span>
                      <span
                        className={`badge ${
                          task.status === 'completed'
                            ? 'badge-met'
                            : task.status === 'in_progress'
                            ? 'badge-info'
                            : 'badge-neutral'
                        }`}
                        style={{ fontSize: '9px', padding: '1px 5px' }}
                      >
                        {task.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--empiria-text-primary)' }}>
                      {task.activity?.title}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Task Execution Area */}
          {selectedTask && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)', margin: 0 }}>
                    {selectedTask.activity?.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--empiria-text-secondary)', marginTop: '4px' }}>
                    {selectedTask.activity?.description}
                  </p>
                </div>
                <span
                  className={`badge ${
                    selectedTask.status === 'completed'
                      ? 'badge-met'
                      : selectedTask.status === 'in_progress'
                      ? 'badge-info'
                      : 'badge-neutral'
                  }`}
                >
                  Status: {selectedTask.status}
                </span>
              </div>

              {/* Completion Criteria Box */}
              <div style={{ background: 'var(--empiria-surface-muted)', padding: '14px', borderRadius: '8px', border: '1px solid var(--empiria-border)', marginBottom: '16px' }}>
                <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--empiria-text-secondary)' }}>
                  Completion Criteria:
                </strong>
                <p style={{ fontSize: '13px', color: 'var(--empiria-text-primary)', marginTop: '4px', margin: 0 }}>
                  {selectedTask.activity?.completion_criteria}
                </p>
              </div>

              {/* Action Buttons based on status */}
              <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                {selectedTask.status === 'pending' && (
                  <button className="btn btn-primary" onClick={handleStartTask} disabled={actionLoading}>
                    <PlayCircle size={14} /> Start This Activity
                  </button>
                )}
                {selectedTask.status === 'in_progress' && (
                  <span className="badge badge-info" style={{ padding: '6px 12px' }}>
                    Activity Currently In Progress
                  </span>
                )}
                {selectedTask.status === 'submitted' && (
                  <span className="badge badge-met" style={{ padding: '6px 12px' }}>
                    Work Submitted
                  </span>
                )}
                {selectedTask.status === 'completed' && (
                  <span className="badge badge-met" style={{ padding: '6px 12px' }}>
                    <CheckCircle2 size={12} style={{ marginRight: 4 }} /> Activity Completed
                  </span>
                )}
              </div>

              {/* Submission Workspace Form */}
              <div className="form-group">
                <label className="form-label">
                  Practice Artefact & Evidence Documentation
                </label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Describe the completed exercises, queries authored, execution plans analyzed, or repository links demonstrating completion..."
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  disabled={selectedTask.status === 'completed'}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginBottom: '24px' }}>
                {selectedTask.status !== 'completed' && (
                  <>
                    <button
                      className="btn btn-secondary"
                      onClick={handleSubmitWork}
                      disabled={actionLoading || !submissionText.trim()}
                    >
                      <Send size={14} /> Save & Submit Evidence
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={handleCompleteTask}
                      disabled={actionLoading}
                    >
                      <CheckCircle2 size={14} /> Mark Completed
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '28px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onProceedToVerify}>
            Proceed to Follow-up Verification (Stage 5) <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
