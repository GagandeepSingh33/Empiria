import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import type { DevelopmentPlan } from '../../types'
import { BookOpen, ExternalLink, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react'

interface PlanViewProps {
  onProceedToPractice: (taskId?: string) => void
}

export const PlanView: React.FC<PlanViewProps> = ({ onProceedToPractice }) => {
  const [plan, setPlan] = useState<DevelopmentPlan | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPlan()
  }, [])

  const loadPlan = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getMyDevelopmentPlan()
      setPlan(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
        <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px auto', color: 'var(--primary-600)' }} />
        <p style={{ color: 'var(--text-muted)' }}>Generating development plan from diagnostic findings...</p>
      </div>
    )
  }

  if (error || !plan || plan.tasks.length === 0) {
    return (
      <div className="card">
        <div className="callout callout-warning">
          <AlertCircle size={18} />
          <div>
            {error || 'No active development plan found. Please take an assessment to generate your personalized plan.'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <BookOpen size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            Stage 3: Personalized Capability Development Plan
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Empiria transforms diagnostic findings into actionable learning tasks. Each task specifies required evidence, time commitment, and priority level to efficiently close your performance gaps.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Stage 3: Plan — Personal Development Plan</h2>
            <p className="card-subtitle">
              Prioritized capability development activities directly addressing your identified competency gaps.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="badge badge-info">Plan Version: {plan.version_number}.0</span>
            <span className="badge badge-met">{plan.status}</span>
          </div>
        </div>

        {/* Plan Overview Banner */}
        <div className="callout callout-info">
          <BookOpen size={18} />
          <div>
            <strong>Transparent Activity Linkage:</strong> Every recommended activity is traceable to an
            identified competency deficit from your latest diagnostic run. Practice work and submissions will
            build evidence toward verification.
          </div>
        </div>

        {/* Task List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {plan.tasks.map((task) => {
            const isCompleted = task.status === 'completed'
            const isInProgress = task.status === 'in_progress'
            const isSubmitted = task.status === 'submitted'

            return (
              <div
                key={task.id}
                style={{
                  border: '1px solid var(--empiria-border)',
                  borderRadius: '8px',
                  padding: '20px',
                  backgroundColor: isCompleted ? 'var(--empiria-surface-muted)' : 'var(--empiria-surface)',
                  borderLeft: isCompleted ? '4px solid var(--status-met)' : '4px solid var(--empiria-primary)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-neutral">Priority {task.priority}</span>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)', margin: 0 }}>
                      {task.activity?.title || 'Targeted Practice Activity'}
                    </h3>
                  </div>
                  <span
                    className={`badge ${
                      isCompleted ? 'badge-met' : isInProgress ? 'badge-info' : isSubmitted ? 'badge-met' : 'badge-neutral'
                    }`}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--empiria-text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                  {task.activity?.description}
                </p>

                {/* Rationale and criteria */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ background: 'var(--empiria-surface-muted)', border: '1px solid var(--empiria-border)', padding: '10px 14px', borderRadius: '6px', fontSize: '12px' }}>
                    <strong style={{ color: 'var(--empiria-text-primary)' }}>Recommendation Rationale:</strong>
                    <div style={{ color: 'var(--empiria-text-secondary)', marginTop: '2px' }}>{task.recommendation_rationale}</div>
                  </div>
                  <div style={{ background: 'var(--empiria-surface-muted)', border: '1px solid var(--empiria-border)', padding: '10px 14px', borderRadius: '6px', fontSize: '12px' }}>
                    <strong style={{ color: 'var(--empiria-text-primary)' }}>Completion Criteria:</strong>
                    <div style={{ color: 'var(--empiria-text-secondary)', marginTop: '2px' }}>{task.activity?.completion_criteria}</div>
                  </div>
                </div>

                {/* Resources */}
                {task.activity?.resources && task.activity.resources.length > 0 && (
                  <div style={{ marginBottom: '14px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', textTransform: 'uppercase' }}>
                      Learning Resources:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                      {task.activity.resources.map((res, rIdx) => (
                        <a
                          key={rIdx}
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            color: 'var(--empiria-primary)',
                            textDecoration: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: 'var(--empiria-primary-subtle)',
                            border: '1px solid var(--empiria-border)',
                          }}
                        >
                          <ExternalLink size={12} />
                          {res.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onProceedToPractice(task.id)}
                  >
                    {isCompleted ? 'Review Submission' : 'Open Practice Workspace'} <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => onProceedToPractice()}>
            Proceed to Practice Workspace (Stage 4) <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
