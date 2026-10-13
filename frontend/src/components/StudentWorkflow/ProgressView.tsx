import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import type { ProgressSummary } from '../../types'
import { TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, Minus, RefreshCw, MessageSquare } from 'lucide-react'

interface ProgressViewProps {
  studentId: string
  onRequestSupport: () => void
}

export const ProgressView: React.FC<ProgressViewProps> = ({ studentId, onRequestSupport }) => {
  const [progress, setProgress] = useState<ProgressSummary | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProgress()
  }, [studentId])

  const loadProgress = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getStudentProgress(studentId)
      setProgress(data)
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
        <p style={{ color: 'var(--text-muted)' }}>Computing qualified before-and-after progress comparisons...</p>
      </div>
    )
  }

  if (error || !progress) {
    return (
      <div className="card">
        <div className="callout callout-warning">
          <AlertTriangle size={18} />
          <div>{error || 'Unable to retrieve progress data.'}</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <TrendingUp size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            Stage 6: Longitudinal Capability Progression & Analytics
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Empiria tracks your measurable delta from baseline diagnostic to post-practice verification. See exactly where your skills improved, maintained, or require further coaching.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Stage 6: Improve — Verified Progress Comparison</h2>
            <p className="card-subtitle">
              Qualified longitudinal capability progression comparing standardized baseline with follow-up assessment.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={loadProgress}>
              <RefreshCw size={12} /> Recompute
            </button>
            <button className="btn btn-primary btn-sm" onClick={onRequestSupport}>
              <MessageSquare size={12} /> Request Advisor Review
            </button>
          </div>
        </div>

        {/* Narrative Box */}
        <div className="callout callout-info" style={{ marginBottom: '20px' }}>
          <TrendingUp size={20} />
          <div>
            <strong>Evaluation Narrative:</strong> {progress.overall_status_narrative}
          </div>
        </div>

        {/* Mandatory Limitations Safeguard Notice */}
        <div
          style={{
            background: 'var(--badge-warn-bg)',
            border: '1px solid var(--badge-warn-border)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            fontSize: '12px',
            color: 'var(--badge-warn-text)',
            lineHeight: 1.5,
          }}
        >
          <strong>Scientific Methodology & Non-Causal Safeguards:</strong>
          <ul style={{ paddingLeft: '20px', marginTop: '6px' }}>
            <li>
              EMPIRIA does <strong>not</strong> make causal claims that platform activities solely produced observed performance gains.
            </li>
            <li>
              Observed changes reflect before-and-after measurement under equivalent assessment conditions; external coursework,
              individual study, and testing factors remain potential contributors.
            </li>
            <li>Historical baseline measurements remain immutably preserved and are never rewritten.</li>
          </ul>
        </div>

        {!progress.has_follow_up ? (
          <div style={{ textAlign: 'center', padding: '36px', background: 'var(--empiria-surface-muted)', borderRadius: '8px', border: '1px dashed var(--empiria-border)' }}>
            <TrendingUp size={36} style={{ color: 'var(--empiria-text-secondary)', marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)', marginBottom: '6px' }}>
              Follow-up Assessment Required
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--empiria-text-secondary)', maxWidth: '480px', margin: '0 auto 16px auto' }}>
              You have established your baseline diagnostic. Complete your assigned practice activities in Stage 4, then take
              the Follow-up Assessment (DA-FOL-01) in Stage 5 to verify measurable skill development.
            </p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Competency</th>
                  <th>Baseline</th>
                  <th>Follow-up</th>
                  <th>Delta (Change)</th>
                  <th>Outcome Status</th>
                  <th>Comparability State</th>
                </tr>
              </thead>
              <tbody>
                {progress.comparisons.map((c) => {
                  const isPositive = c.score_delta > 0
                  const isNegative = c.score_delta < 0
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.competency_name}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--empiria-text-secondary)' }}>
                          {c.baseline_score.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--empiria-text-primary)' }}>
                          {c.follow_up_score.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 700,
                            color: isPositive ? 'var(--status-met)' : isNegative ? 'var(--status-gap)' : 'var(--text-muted)',
                          }}
                        >
                          {isPositive && <ArrowUpRight size={14} />}
                          {isNegative && <ArrowDownRight size={14} />}
                          {!isPositive && !isNegative && <Minus size={14} />}
                          {isPositive ? `+${c.score_delta.toFixed(1)}%` : `${c.score_delta.toFixed(1)}%`}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            c.outcome_status === 'improved'
                              ? 'badge-met'
                              : c.outcome_status === 'regressed'
                              ? 'badge-gap'
                              : 'badge-neutral'
                          }`}
                        >
                          {c.outcome_status}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ fontSize: '10px' }}>
                          {c.comparability_state.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
