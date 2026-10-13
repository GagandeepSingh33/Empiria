import React, { useState, useEffect } from 'react'
import {
  Settings,
  RefreshCw,
  Building,
  Save,
  ChevronRight,
  Sliders,
} from 'lucide-react'
import { api } from '../../api'

export const InstitutionSettingsView: React.FC = () => {
  const [institution, setInstitution] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [minCohortThreshold, setMinCohortThreshold] = useState('5')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getInstitution()
      setInstitution(data)
      setName(data.name || '')
      if (data.settings) {
        setDisplayName(data.settings.display_name || data.name || '')
        setMinCohortThreshold(String(data.settings.min_cohort_threshold || 5))
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load institution settings.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      await api.updateInstitution({
        name,
        min_cohort_threshold: parseInt(minCohortThreshold, 10) || 5,
      })
      setSuccess('Institution settings successfully updated and saved.')
      loadSettings()
    } catch (err: any) {
      setError(err.message || 'Failed to update settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>
            <span>Institution Administration</span>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--empiria-primary)', fontWeight: 600 }}>Settings & Profile</span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>
            <Settings size={24} style={{ color: 'var(--empiria-primary)' }} />
            Institution Settings & Profile Configuration
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Configure institutional profile, branding metadata, and privacy aggregation thresholds.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={loadSettings} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <Settings size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            Institutional Tenant Settings & Privacy Thresholds
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Manage university identity, display branding, and k-anonymity privacy thresholds (minimum cohort sizes) to prevent student re-identification in aggregated reports.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', background: 'var(--empiria-danger-subtle)', border: '1px solid var(--empiria-danger)', borderRadius: '10px', color: 'var(--empiria-danger)', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '14px 18px', background: 'var(--empiria-success-subtle)', border: '1px solid var(--empiria-success)', borderRadius: '10px', color: 'var(--empiria-success)', marginBottom: '20px' }}>
          {success}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px auto', color: 'var(--empiria-primary)' }} />
          Loading settings...
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={18} style={{ color: 'var(--empiria-primary)' }} />
              Institutional Identity
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '13px' }}>Official Legal Name</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', marginTop: '6px' }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '13px' }}>Display Name / Branding</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', marginTop: '6px' }}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="EMPIRIA University"
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '13px' }}>Institutional Slug / Identifier</label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', marginTop: '6px', opacity: 0.7 }}
                  value={institution?.slug || ''}
                  disabled
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>System-bound identifier; cannot be changed.</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} style={{ color: 'var(--empiria-primary)' }} />
              Governance & Privacy Controls
            </h3>

            <div style={{ maxWidth: '400px', marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '13px' }}>Minimum Cohort Privacy Threshold (k-anonymity)</label>
              <input
                type="number"
                min="3"
                max="50"
                className="input"
                style={{ width: '100%', marginTop: '6px' }}
                value={minCohortThreshold}
                onChange={(e) => setMinCohortThreshold(e.target.value)}
                required
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Reporting and analytics metrics are masked if cohort size falls below this count.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
