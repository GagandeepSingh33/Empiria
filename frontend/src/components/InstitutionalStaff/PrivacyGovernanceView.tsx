import { useState, useEffect } from 'react'
import { api } from '../../api'
import {
  ShieldCheck,
  Lock,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  RefreshCw,
  Database,
  Hash,
} from 'lucide-react'

interface PrivacyGovernanceViewProps {
  isStudentView?: boolean
}

export function PrivacyGovernanceView({ isStudentView = false }: PrivacyGovernanceViewProps) {
  const [consents, setConsents] = useState<any[]>([])
  const [auditEvents, setAuditEvents] = useState<any[]>([])
  const [chainVerification, setChainVerification] = useState<any | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [verifyingChain, setVerifyingChain] = useState<boolean>(false)
  const [exporting, setExporting] = useState<boolean>(false)
  const [lastExport, setLastExport] = useState<any | null>(null)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [isStudentView])

  const loadData = async () => {
    try {
      setLoading(true)
      setStatusMsg(null)
      if (isStudentView) {
        const cData = await api.getConsents()
        setConsents(cData || [])
        setAuditEvents([])
      } else {
        const [cData, aData] = await Promise.all([
          api.getConsents(),
          api.getAuditEvents(25),
        ])
        setConsents(cData || [])
        setAuditEvents(aData || [])
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load governance data.' })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyChain = async () => {
    try {
      setVerifyingChain(true)
      setStatusMsg(null)
      const res = await api.verifyAuditChain()
      setChainVerification(res)
      if (res.verified) {
        setStatusMsg({ type: 'success', text: `Audit chain verified intact! ${res.total_events_verified} consecutive cryptographic blocks confirmed.` })
      } else {
        setStatusMsg({ type: 'error', text: `Audit chain integrity failure: ${res.error}` })
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to verify audit chain.' })
    } finally {
      setVerifyingChain(false)
    }
  }

  const handleGrantConsent = async (purpose: string) => {
    try {
      await api.grantConsent(purpose)
      setStatusMsg({ type: 'success', text: `Consent granted for ${purpose}.` })
      const updated = await api.getConsents()
      setConsents(updated || [])
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to grant consent.' })
    }
  }

  const handleWithdrawConsent = async (consentId: string) => {
    try {
      await api.withdrawConsent(consentId)
      setStatusMsg({ type: 'success', text: 'Consent revoked successfully.' })
      const updated = await api.getConsents()
      setConsents(updated || [])
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to withdraw consent.' })
    }
  }

  const handleRequestExport = async () => {
    try {
      setExporting(true)
      setStatusMsg(null)
      const res = await api.requestDataExport()
      setLastExport(res)
      setStatusMsg({ type: 'success', text: `Data export package generated (Request ID: ${res.request_id}).` })
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to request data export.' })
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
        <RefreshCw size={28} className="spin" style={{ color: 'var(--primary-600)', marginBottom: '12px' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading Privacy & Governance Records...</p>
      </div>
    )
  }

  return (
    <div className="section-container" style={{ padding: '0 0 40px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>
          <ShieldCheck size={24} color="var(--empiria-primary)" />
          {isStudentView ? 'Personal Privacy, Consent & Data Rights' : 'Privacy, Consent & Cryptographic Audit Governance'}
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
          {isStudentView
            ? 'Manage your learning consent preferences, download your verified academic records, and inspect cryptographic data protections.'
            : 'Enforce institutional consent policies, execute personal data export rights, and verify cryptographic SHA-256 audit log tamper-evidence.'}
        </p>
      </div>

      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <ShieldCheck size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            {isStudentView ? 'Cryptographic Privacy & Data Subject Rights' : 'Enterprise Privacy Governance & Audit Ledger'}
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            {isStudentView
              ? 'Your student records, peer reviews, and notes are protected with field-level AES-256-GCM encryption. You retain full control over consent preferences and portable GDPR/FERPA data export.'
              : 'Institutional compliance suite featuring field-level AES-256-GCM encryption for mentor notes and cryptographic SHA-256 tamper-evident chaining for all administrative events.'}
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px',
            fontWeight: 500,
            background: statusMsg.type === 'success' ? 'var(--empiria-success-subtle)' : 'var(--empiria-danger-subtle)',
            color: statusMsg.type === 'success' ? 'var(--empiria-success)' : 'var(--empiria-danger)',
            border: `1px solid ${statusMsg.type === 'success' ? 'var(--empiria-success)' : 'var(--empiria-danger)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {statusMsg.text}
        </div>
      )}

      {/* Top Cards: Architecture & Cryptography Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* AES-256-GCM Security Summary */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Lock size={18} color="var(--empiria-primary)" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
              AES-256-GCM Field-Level Encryption
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 14px 0' }}>
            {isStudentView
              ? 'Your private reflections, mentor inquiries, and sensitive notes are encrypted before storage using military-grade authenticated AES-256-GCM with per-entry nonces.'
              : 'Confidential student notes and unstructured advisor communications are encrypted before database persistence using authenticated AES-256-GCM with a random 12-byte nonce and 16-byte authentication tag.'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
            <span style={{ background: 'var(--bg-surface-alt)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600, color: 'var(--text-main)' }}>
              Ciphertext Format: <code style={{ color: 'var(--empiria-primary)' }}>v1:base64(nonce+tag+ct)</code>
            </span>
            <span style={{ background: 'var(--empiria-success-subtle)', color: 'var(--empiria-success)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
              Zero Nonce Reuse
            </span>
          </div>
        </div>

        {/* SHA-256 Audit Hash Chain (Staff/Admin) OR Student Rights Guarantee (Student) */}
        {!isStudentView ? (
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Hash size={18} color="var(--empiria-primary)" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
                Tamper-Evident SHA-256 Hash Chain
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 14px 0' }}>
              Every auditable event links cryptographically to the preceding event through canonical JSON serialization and SHA-256 hash chaining (<code style={{ fontSize: '11px' }}>H_i = SHA256(H_i-1 + payload_i)</code>).
            </p>
            <button
              onClick={handleVerifyChain}
              disabled={verifyingChain}
              style={{
                background: 'var(--empiria-primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: verifyingChain ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {verifyingChain ? <RefreshCw size={14} className="spin" /> : <ShieldCheck size={14} />}
              Verify Chain Integrity Now
            </button>
          </div>
        ) : (
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <ShieldCheck size={18} color="var(--empiria-secondary)" />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
                Student Privacy Guarantee
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 14px 0' }}>
              Under the Empiria Inviolate Charter, risk scores, attrition probabilities, and deficit rankings are strictly shielded from student views. Your dashboard focuses exclusively on mastery growth and actionable learning steps.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
              <span style={{ background: 'var(--empiria-secondary-subtle)', color: 'var(--empiria-secondary)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                Deficit Labels Banned
              </span>
              <span style={{ background: 'var(--status-information-bg)', color: 'var(--status-information)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                GDPR / FERPA Compliant
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Audit Chain Verification Results */}
      {chainVerification && (
        <div
          style={{
            background: chainVerification.verified ? 'var(--empiria-success-subtle)' : 'var(--empiria-danger-subtle)',
            border: `1px solid ${chainVerification.verified ? 'var(--empiria-success)' : 'var(--empiria-danger)'}`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            {chainVerification.verified ? (
              <CheckCircle2 size={22} color="var(--empiria-success)" />
            ) : (
              <AlertCircle size={22} color="var(--empiria-danger)" />
            )}
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: chainVerification.verified ? 'var(--empiria-success)' : 'var(--empiria-danger)' }}>
                {chainVerification.verified ? 'Cryptographic Chain Integrity Confirmed' : 'Tamper-Evidence Check Failed'}
              </h4>
              <div style={{ fontSize: '12px', color: chainVerification.verified ? 'var(--empiria-success)' : 'var(--empiria-danger)' }}>
                Status: {chainVerification.status} • Total Events Verified: {chainVerification.total_events_verified}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            <div style={{ background: 'var(--empiria-surface)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--empiria-border)' }}>
              <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px', fontFamily: 'var(--font-sans)' }}>Genesis Block Hash</div>
              <div style={{ wordBreak: 'break-all', color: 'var(--text-main)' }}>{chainVerification.genesis_hash || '0'.repeat(64)}</div>
            </div>
            <div style={{ background: 'var(--empiria-surface)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--empiria-border)' }}>
              <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px', fontFamily: 'var(--font-sans)' }}>Latest Chain Head Hash</div>
              <div style={{ wordBreak: 'break-all', color: 'var(--text-main)' }}>{chainVerification.latest_hash || 'N/A'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Consent Records & Data Export Rights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Institutional Consent Management */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="var(--empiria-primary)" />
              Consent Records
            </h3>
            <button
              onClick={() => handleGrantConsent('academic_analytics_modeling')}
              style={{
                background: 'var(--bg-surface-alt)',
                border: '1px solid var(--border-subtle)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Grant Default
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {consents.length > 0 ? (
              consents.map((c: any) => (
                <div
                  key={c.id}
                  style={{
                    background: 'var(--bg-surface-alt)',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {c.consent_purpose}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Policy: {c.policy_version} • Granted: {new Date(c.collected_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    {c.status === 'active' ? (
                      <button
                        onClick={() => handleWithdrawConsent(c.id)}
                        style={{
                          background: 'var(--empiria-danger-subtle)',
                          color: 'var(--empiria-danger)',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Withdraw
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Revoked</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                No active consent records found.
              </div>
            )}
          </div>
        </div>

        {/* Data Subject Export Requests (GDPR / FERPA) */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={18} color="var(--empiria-primary)" />
            Personal Data Portability & Export
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
            Under institutional privacy governance, users can request an authenticated export package containing their academic records, verified competencies, goals, and messaging history. Internal risk scores are strictly excluded from student exports.
          </p>

          <button
            onClick={handleRequestExport}
            disabled={exporting}
            style={{
              background: 'var(--empiria-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: exporting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {exporting ? <RefreshCw size={14} className="spin" /> : <Download size={14} />}
            Generate Verified Export Package
          </button>

          {lastExport && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--empiria-success-subtle)', borderRadius: '6px', border: '1px solid var(--empiria-success)' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--empiria-success)' }}>Export Ready!</div>
              <div style={{ fontSize: '11px', color: 'var(--empiria-success)', marginTop: '2px' }}>
                Request: <code>{lastExport.request_id}</code>
              </div>
              <pre style={{ marginTop: '8px', fontSize: '11px', background: 'var(--empiria-surface)', padding: '8px', borderRadius: '4px', overflowX: 'auto', maxHeight: '120px' }}>
                {JSON.stringify(lastExport.export_data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Audit Trail Log (Institution Staff & Admin Only) */}
      {!isStudentView && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} color="var(--empiria-primary)" />
              Cryptographic Audit Ledger ({auditEvents.length} Recent Events)
            </h3>
            <button
              onClick={loadData}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--empiria-primary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-alt)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Action Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Actor</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Target Resource</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Timestamp</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Current Hash</th>
                </tr>
              </thead>
              <tbody>
                {auditEvents.length > 0 ? (
                  auditEvents.map((evt: any) => (
                    <tr key={evt.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--primary-700)' }}>
                        {evt.action}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {evt.actor_id ? `${evt.actor_id.substring(0, 8)}...` : 'system'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>
                          {evt.resource_type}: <code>{evt.resource_id ? evt.resource_id.substring(0, 8) : 'N/A'}</code>
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        {new Date(evt.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#64748b' }}>
                        {evt.current_hash ? (
                          <span title={evt.current_hash}>
                            {evt.current_hash.substring(0, 16)}...
                          </span>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>legacy</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No audit records logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
