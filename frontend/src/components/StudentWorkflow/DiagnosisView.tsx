import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import type { DiagnosisResponse } from '../../types'
import { ArrowRight, RefreshCw, Info, Sparkles } from 'lucide-react'

interface DiagnosisViewProps {
  studentId: string
  onProceedToPlan: () => void
  onProceedToMeasure?: () => void
}

export const DiagnosisView: React.FC<DiagnosisViewProps> = ({ studentId, onProceedToPlan, onProceedToMeasure }) => {
  const [diagnosis, setDiagnosis] = useState<DiagnosisResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDiagnosis()
  }, [studentId])

  const loadDiagnosis = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getStudentDiagnosis(studentId)
      setDiagnosis(data)
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
        <p style={{ color: 'var(--text-muted)' }}>Evaluating deterministic competency diagnosis...</p>
      </div>
    )
  }

  if (error || !diagnosis) {
    return (
      <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--empiria-surface-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: 'var(--empiria-accent)',
            }}
          >
            <Info size={24} />
          </div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 600, color: 'var(--empiria-text-primary)', marginBottom: '8px' }}>
            Baseline Assessment Required for Diagnosis
          </h3>
          <p style={{ color: 'var(--empiria-text-secondary)', fontSize: '14px', lineHeight: 1.5, marginBottom: '24px' }}>
            The deterministic diagnosis engine evaluates demonstrated competency levels against institutional framework thresholds based on verified assessment evidence. Complete Stage 1 (Measure) to generate your competency report.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {onProceedToMeasure && (
              <button className="btn btn-primary" onClick={onProceedToMeasure}>
                Take Diagnostic Assessment (Stage 1) <ArrowRight size={14} style={{ marginLeft: '4px' }} />
              </button>
            )}
            <button className="btn btn-secondary" onClick={loadDiagnosis}>
              <RefreshCw size={14} style={{ marginRight: '6px' }} /> Re-evaluate Findings
            </button>
          </div>
          {error && (
            <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--badge-fail-text)', opacity: 0.8 }}>
              Engine response: {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Aggregate stats
  const totalCompetencies = diagnosis.findings.length
  const gapsCount = diagnosis.findings.filter((f) => f.finding_type === 'gap').length
  const metCount = diagnosis.findings.filter((f) => f.finding_type === 'target_met').length

  return (
    <div>
      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <Sparkles size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            Stage 2: Deterministic Capability Diagnosis
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Empiria evaluates your demonstrated mastery against institutional benchmark thresholds using a 100% deterministic, audit-verifiable engine. Gaps identify targeted capabilities for your tailored development plan.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Stage 2: Diagnose — Deterministic Competency Findings</h2>
            <p className="card-subtitle">
              Transparent, versioned diagnosis derived deterministically from verified assessment evidence.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="badge badge-neutral">Engine: {diagnosis.rule_version}</span>
            <button className="btn btn-secondary btn-sm" onClick={loadDiagnosis} title="Re-evaluate Diagnosis">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>

        {/* High-level status bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div style={{ background: 'var(--empiria-surface-muted)', padding: '16px', borderRadius: '8px', border: '1px solid var(--empiria-border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Evaluated</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--empiria-text-primary)', marginTop: '4px' }}>{totalCompetencies} Competencies</div>
          </div>
          <div style={{ background: 'var(--badge-fail-bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--badge-fail-border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--badge-fail-text)', textTransform: 'uppercase', fontWeight: 600 }}>Identified Gaps</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--badge-fail-text)', marginTop: '4px' }}>{gapsCount} Below Target</div>
          </div>
          <div style={{ background: 'var(--badge-pass-bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--badge-pass-border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--badge-pass-text)', textTransform: 'uppercase', fontWeight: 600 }}>Targets Met</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--badge-pass-text)', marginTop: '4px' }}>{metCount} Satisfied</div>
          </div>
        </div>

        {/* 7 Competency Cards */}
        <div className="competency-grid">
          {diagnosis.findings.map((f) => {
            const isGap = f.finding_type === 'gap'
            const det = diagnosis.determinations.find((d) => d.competency_id === f.competency_id)

            return (
              <div
                key={f.competency_id}
                className={`competency-card ${isGap ? 'gap-state' : 'target-met-state'}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)' }}>
                      {f.competency_name}
                    </h3>
                    <span style={{ fontSize: '11px', color: 'var(--empiria-text-secondary)', textTransform: 'uppercase' }}>
                      Key: {f.competency_key}
                    </span>
                  </div>
                  <span className={`badge ${isGap ? 'badge-gap' : 'badge-met'}`}>
                    {isGap ? 'Competency Gap' : 'Target Met'}
                  </span>
                </div>

                {/* Level Meter */}
                <div className="level-meter-container">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>
                      Demonstrated: <strong>Level {f.current_level}</strong> ({det?.level_name || 'Novice'})
                    </span>
                    <span style={{ color: 'var(--empiria-text-secondary)' }}>
                      Target: <strong>Level {f.target_level}</strong>
                    </span>
                  </div>
                  <div className="meter-track">
                    <div
                      className={`meter-fill ${isGap ? 'gap' : 'met'}`}
                      style={{ width: `${Math.min(100, (f.current_level / Math.max(1, f.target_level)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Evidence Sufficiency Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--empiria-text-secondary)' }}>
                  <span>Evidence Quality:</span>
                  <span className={`badge ${det?.evidence_sufficiency === 'sufficient' ? 'badge-met' : 'badge-neutral'}`} style={{ fontSize: '10px' }}>
                    {det?.evidence_sufficiency || 'unverified'}
                  </span>
                </div>

                {/* Explanation */}
                <div style={{ background: 'var(--empiria-surface-muted)', border: '1px solid var(--empiria-border)', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', color: 'var(--empiria-text-secondary)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--empiria-text-primary)' }}>Diagnostic Finding:</strong> {f.detailed_explanation}
                </div>

                {/* Action */}
                <div style={{ fontSize: '12px', color: 'var(--empiria-primary)', fontWeight: 500 }}>
                  <strong>Action:</strong> {f.recommended_action}
                </div>

                {/* Mandatory Limitation */}
                <div style={{ fontSize: '11px', color: 'var(--empiria-text-secondary)', fontStyle: 'italic', borderTop: '1px dashed var(--empiria-border)', paddingTop: '8px' }}>
                  <Info size={11} style={{ display: 'inline', marginRight: 4 }} />
                  {f.mandatory_limitations}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onProceedToPlan}>
            View Linked Development Plan (Stage 3) <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
