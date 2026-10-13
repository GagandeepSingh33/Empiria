import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import type { AssessmentForm, AssessmentResult } from '../../types'
import { CheckCircle2, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react'

interface AssessmentTakerProps {
  onAssessmentCompleted: () => void
}

export const AssessmentTaker: React.FC<AssessmentTakerProps> = ({ onAssessmentCompleted }) => {
  const [forms, setForms] = useState<AssessmentForm[]>([])
  const [selectedFormId, setSelectedFormId] = useState<string>('')
  const [activeFormDetail, setActiveFormDetail] = useState<AssessmentForm | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadForms()
  }, [])

  const loadForms = async () => {
    try {
      setLoading(true)
      const data = await api.getAssessmentForms()
      setForms(data)
      if (data.length > 0) {
        setSelectedFormId(data[0].id)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const startAttempt = async () => {
    if (!selectedFormId) return
    try {
      setLoading(true)
      setError(null)
      setResult(null)
      const formDetail = await api.getAssessmentFormDetail(selectedFormId)
      setActiveFormDetail(formDetail)

      const att = await api.startAssessmentAttempt(selectedFormId)
      setAttemptId(att.id)
      setAnswers({})
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectOption = (itemId: string, optionKey: string) => {
    setAnswers((prev) => ({ ...prev, [itemId]: optionKey }))
  }

  const handleSubmitAttempt = async () => {
    if (!attemptId || !activeFormDetail) return
    const totalItems = activeFormDetail.items.length
    const answeredCount = Object.keys(answers).length

    if (answeredCount < totalItems) {
      setError(`Please answer all ${totalItems} questions before submitting. (${answeredCount}/${totalItems} answered)`)
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      const res = await api.submitAssessmentAttempt(attemptId, answers)
      setResult(res)
      setAttemptId(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Stage 1: Measure — Competency Assessment</h2>
            <p className="card-subtitle">
              Complete standardized objective assessments targeting core Data Analyst capabilities.
            </p>
          </div>
          <span className="badge badge-info">P0 Standardized Diagnostic</span>
        </div>

        {error && (
          <div className="callout callout-warning">
            <AlertCircle size={18} />
            <div>{error}</div>
          </div>
        )}

        {/* Form Selector & Launcher */}
        {!attemptId && !result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {forms.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setSelectedFormId(f.id)}
                  style={{
                    border: selectedFormId === f.id ? '2px solid var(--empiria-primary)' : '1px solid var(--empiria-border)',
                    borderRadius: '8px',
                    padding: '16px',
                    background: selectedFormId === f.id ? 'var(--empiria-primary-subtle)' : 'var(--empiria-surface)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)' }}>{f.title}</span>
                    <span className="badge badge-neutral" style={{ fontSize: '10px' }}>{f.code}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', margin: 0 }}>
                    Type: <strong style={{ textTransform: 'capitalize' }}>{f.assessment_type.replace('_', ' ')}</strong> Assessment
                  </p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '8px' }}>
              <button className="btn btn-primary" onClick={startAttempt} disabled={loading || !selectedFormId}>
                {loading ? <RefreshCw size={14} className="spin" /> : <ArrowRight size={14} />}
                Start Assessment Attempt
              </button>
            </div>
          </div>
        )}

        {/* Active Attempt Delivery */}
        {attemptId && activeFormDetail && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--empiria-border)' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)', margin: 0 }}>{activeFormDetail.title}</h3>
                <span style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)' }}>
                  Questions answered: {Object.keys(answers).length} of {activeFormDetail.items.length}
                </span>
              </div>
              <span className="badge badge-info">In Progress</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {activeFormDetail.items.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    border: '1px solid var(--empiria-border)',
                    borderRadius: '8px',
                    padding: '18px',
                    backgroundColor: answers[item.id] ? 'var(--empiria-surface-muted)' : 'var(--empiria-surface)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--empiria-primary)' }}>
                      Question {idx + 1} ({item.code})
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                      Target: {item.competency_name || 'Core Competency'}
                    </span>
                  </div>

                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--empiria-text-primary)', marginBottom: '14px', lineHeight: 1.6 }}>
                    {item.prompt}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {item.options.map((opt) => {
                      const isSelected = answers[item.id] === opt.option_key
                      return (
                        <label
                          key={opt.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 14px',
                            borderRadius: '6px',
                            border: isSelected ? '1px solid var(--empiria-primary)' : '1px solid var(--empiria-border)',
                            backgroundColor: isSelected ? 'var(--empiria-primary-subtle)' : 'var(--empiria-surface)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: 'var(--empiria-text-primary)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="radio"
                            name={`item-${item.id}`}
                            checked={isSelected}
                            onChange={() => handleSelectOption(item.id, opt.option_key)}
                            style={{ accentColor: 'var(--empiria-primary)' }}
                          />
                          <span>
                            <strong>{opt.option_key}.</strong> {opt.option_text || opt.text_content}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                className="btn btn-primary"
                onClick={handleSubmitAttempt}
                disabled={submitting || Object.keys(answers).length < activeFormDetail.items.length}
              >
                {submitting ? 'Submitting & Evaluating...' : 'Submit Assessment Answers'}
              </button>
            </div>
          </div>
        )}

        {/* Results Feedback Summary */}
        {result && (
          <div>
            <div className="callout callout-success">
              <CheckCircle2 size={20} />
              <div>
                <strong>Assessment Attempt Evaluated & Verified!</strong>
                <div>
                  Your overall score: <strong>{result.percentage.toFixed(1)}%</strong> ({result.total_score} / {result.max_possible_score} points).
                  Evidence records have been persisted to the deterministic diagnosis engine.
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Competency Performance Breakdown
            </h4>

            <div className="data-table-container" style={{ marginBottom: '20px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Competency</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Benchmark Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.competencies.map((comp) => {
                    const isPassed = comp.percentage >= 70
                    return (
                      <tr key={comp.competency_id}>
                        <td style={{ fontWeight: 600 }}>{comp.competency_name}</td>
                        <td>{comp.score.toFixed(1)} / {comp.max_score.toFixed(1)}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: isPassed ? 'var(--status-met)' : 'var(--status-gap)' }}>
                            {comp.percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${isPassed ? 'badge-met' : 'badge-gap'}`}>
                            {isPassed ? 'Proficient' : 'Opportunity Area'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setResult(null)}>
                Take Another Assessment
              </button>
              <button className="btn btn-primary" onClick={onAssessmentCompleted}>
                Proceed to Diagnosis (Stage 2) <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
