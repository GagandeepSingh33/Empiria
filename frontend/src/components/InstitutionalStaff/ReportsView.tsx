import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import type { InstitutionalReport } from '../../types'
import { ShieldAlert, RefreshCw, AlertCircle } from 'lucide-react'

export const ReportsView: React.FC = () => {
  const [report, setReport] = useState<InstitutionalReport | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReport()
  }, [])

  const loadReport = async () => {
    try {
      setLoading(true)
      const data = await api.getInstitutionalReport()
      setReport(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
        <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px auto', color: 'var(--empiria-primary)' }} />
        <p style={{ color: 'var(--text-muted)' }}>Aggregating institutional capability intelligence...</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="card">
        <div className="callout callout-warning">
          <AlertCircle size={18} />
          <div>{error || 'Unable to aggregate institutional report.'}</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <ShieldAlert size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            Institutional Capability Intelligence & Analytics
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Executive-level intelligence synthesizing student cohort progress, mastery distribution, identified capability gaps, and active support interventions.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title" style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>Institutional Intelligence & Capability Reporting</h2>
            <p className="card-subtitle">
              Aggregate capability development analytics for {report.institution_name}.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadReport}>
            <RefreshCw size={12} /> Refresh Metrics
          </button>
        </div>

        {/* Small-cohort privacy safeguard notice */}
        {report.privacy_threshold_applied && (
          <div className="callout callout-warning">
            <ShieldAlert size={18} />
            <div>
              <strong>Small-Cohort Privacy Suppression Active:</strong> Aggregated reporting enforces a minimum
              student threshold. Cell values with fewer students than the institutional privacy threshold are suppressed
              to prevent student re-identification.
            </div>
          </div>
        )}

        {/* Top KPI Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div style={{ background: 'var(--empiria-surface-muted)', padding: '18px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Total Students
            </span>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
              {report.student_count}
            </div>
          </div>

          <div style={{ background: 'var(--empiria-surface-muted)', padding: '18px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Active Cohorts
            </span>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
              {report.cohort_count}
            </div>
          </div>

          <div style={{ background: 'var(--empiria-surface-muted)', padding: '18px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Baseline Diagnostics
            </span>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--empiria-primary)', marginTop: '4px' }}>
              {report.baseline_completed_count}
            </div>
          </div>

          <div style={{ background: 'var(--empiria-surface-muted)', padding: '18px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Follow-up Verifications
            </span>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--empiria-secondary)', marginTop: '4px' }}>
              {report.follow_up_completed_count}
            </div>
          </div>
        </div>

        {/* Competency Progression Averages Table */}
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: 'var(--text-main)' }}>
          Institutional Competency Outcome Trajectory (Data Analyst Core)
        </h3>

        <div className="data-table-container" style={{ marginBottom: '24px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Competency</th>
                <th>Baseline Mean</th>
                <th>Follow-up Mean</th>
                <th>Mean Delta (Gain)</th>
                <th>Sample Size</th>
              </tr>
            </thead>
            <tbody>
              {report.competency_averages.map((ca) => (
                <tr key={ca.competency_key}>
                  <td style={{ fontWeight: 600 }}>{ca.competency_name}</td>
                  <td>{ca.baseline_average.toFixed(1)}%</td>
                  <td style={{ fontWeight: 600 }}>{ca.follow_up_average.toFixed(1)}%</td>
                  <td>
                    <span
                      style={{
                        fontWeight: 700,
                        color: ca.mean_delta > 0 ? 'var(--status-met)' : 'var(--text-muted)',
                      }}
                    >
                      {ca.mean_delta > 0 ? `+${ca.mean_delta.toFixed(1)}%` : `${ca.mean_delta.toFixed(1)}%`}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{ca.students_measured} students</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Reporting Limitations & Safeguards */}
        <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px' }}>
            Platform Reporting Governance & Limitations:
          </h4>
          <ul style={{ paddingLeft: '20px', fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
            {report.limitations_and_safeguards.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
