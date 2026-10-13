import React from 'react'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

interface AccessDeniedProps {
  requiredRole?: string
  currentRole: string
  onNavigateHome: () => void
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  requiredRole,
  currentRole,
  onNavigateHome,
}) => {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          background: 'var(--empiria-surface)',
          border: '1px solid var(--empiria-border)',
          borderRadius: '24px',
          padding: '40px 36px',
          textAlign: 'center',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
          }}
        >
          <ShieldAlert size={28} />
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--empiria-text-main)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
          Access Denied (403)
        </h2>

        <p style={{ fontSize: '13px', color: 'var(--empiria-text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
          You do not have the required permissions to access this portal or resource.
          {requiredRole && (
            <span>
              {' '}This workspace requires <strong>{requiredRole.replace('_', ' ')}</strong> privileges.
            </span>
          )}
        </p>

        <div
          style={{
            background: 'var(--empiria-surface-muted)',
            border: '1px solid var(--empiria-border)',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '12px',
            color: 'var(--empiria-text-main)',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: 'var(--empiria-text-tertiary)' }}>Current Active Role:</span>
          <span style={{ color: '#2563eb', fontWeight: 700, textTransform: 'uppercase', background: '#eff6ff', padding: '4px 10px', borderRadius: '9999px', fontSize: '11px' }}>
            {currentRole.replace('_', ' ')}
          </span>
        </div>

        <button
          onClick={onNavigateHome}
          className="btn-primary"
          style={{
            padding: '12px 24px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ArrowLeft size={16} /> Return to My Workspace
        </button>
      </div>
    </div>
  )
}
