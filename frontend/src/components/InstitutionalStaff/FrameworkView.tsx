import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import type { Framework } from '../../types'
import { Layers, AlertCircle, RefreshCw } from 'lucide-react'

export const FrameworkView: React.FC = () => {
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFrameworks()
  }, [])

  const loadFrameworks = async () => {
    try {
      setLoading(true)
      const data = await api.getFrameworks()
      setFrameworks(data)
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
        <p style={{ color: 'var(--text-muted)' }}>Loading published competency frameworks...</p>
      </div>
    )
  }

  if (error || frameworks.length === 0) {
    return (
      <div className="card">
        <div className="callout callout-warning">
          <AlertCircle size={18} />
          <div>{error || 'No competency frameworks found.'}</div>
        </div>
      </div>
    )
  }

  const fw = frameworks[0]
  const currentVer = fw.current_version

  return (
    <div>
      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <Layers size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            Authoritative Competency Framework Governance
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Manage immutable, versioned skill taxonomy definitions, proficiency thresholds, and evidence criteria that underpin the deterministic diagnosis and practice loop.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title" style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>Competency Framework Configuration</h2>
            <p className="card-subtitle">
              Configurable, versioned capability framework definitions and proficiency criteria.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="badge badge-info">Framework: {fw.key}</span>
            <span className="badge badge-met">Version: {currentVer.version_number}.0 (published)</span>
          </div>
        </div>

        <div className="callout callout-info" style={{ marginBottom: '24px' }}>
          <Layers size={18} />
          <div>
            <strong>Versioned Governance:</strong> Published competency definitions referenced by historical student
            diagnoses cannot be silently rewritten. All criteria and thresholds are data-driven and configurable.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {currentVer.competencies.map((comp, idx) => (
            <div
              key={comp.id}
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '20px',
                background: 'var(--empiria-surface)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-neutral">Competency {idx + 1}</span>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>{comp.name}</h3>
                </div>
                <span className="badge badge-met">Target: Level {comp.target_level}</span>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
                {comp.description}
              </p>

              {/* Levels grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                {comp.levels.map((lvl) => (
                  <div
                    key={lvl.level_number}
                    style={{
                      background: 'var(--empiria-surface-muted)',
                      border: '1px solid var(--empiria-border)',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--empiria-primary)' }}>Level {lvl.level_number}: {lvl.name}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>≥ {lvl.target_score}%</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', lineHeight: 1.4 }}>{lvl.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
