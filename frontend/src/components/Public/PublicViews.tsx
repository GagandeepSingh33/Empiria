import React, { useState } from 'react'
import { api } from '../../api'
import {
  ArrowLeft,
  Mail,
  Lock,
  CheckCircle,
  AlertCircle,
  Send,
  Shield,
  Key,
  UserCheck,
  Compass,
  Sparkles,
  BarChart3,
  RefreshCw,
} from 'lucide-react'

interface PublicPageProps {
  onNavigate: (path: string) => void
}

// ---------------------------------------------------------------------------
// 1. Forgot Password Page (/forgot-password)
// ---------------------------------------------------------------------------
export const ForgotPasswordView: React.FC<PublicPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg(null)
    try {
      await api.requestCredentialRecovery(email.trim().toLowerCase())
      setSubmitted(true)
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to process password reset request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--empiria-background)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid var(--empiria-border)', background: 'var(--empiria-surface)', padding: '16px 24px', boxShadow: 'var(--empiria-shadow-xs)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => onNavigate('/login')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--empiria-text-muted)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ArrowLeft size={16} /> Back to Sign In
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'var(--empiria-primary)', color: '#fff', fontWeight: 800, fontSize: '11px', padding: '4px 8px', borderRadius: '4px', fontFamily: 'var(--font-heading)' }}>
              EMPIRIA
            </div>
            <span style={{ fontSize: '12px', color: 'var(--empiria-text-main)', fontWeight: 600 }}>Account Security</span>
          </div>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
        <div style={{ maxWidth: '440px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '999px',
                background: 'var(--empiria-primary-light)',
                color: 'var(--empiria-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <Key size={24} />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--empiria-text-main)', letterSpacing: '-0.3px', fontFamily: 'var(--font-heading)' }}>
              Reset Your Password
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--empiria-text-muted)', marginTop: '6px' }}>
              Enter your registered institution email to receive a secure recovery token.
            </p>
          </div>

          <div
            style={{
              background: 'var(--empiria-surface)',
              border: '1px solid var(--empiria-border)',
              borderRadius: '24px',
              padding: '36px',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            {errorMsg && (
              <div
                style={{
                  background: 'rgba(185, 28, 28, 0.08)',
                  border: '1px solid rgba(185, 28, 28, 0.25)',
                  color: 'var(--empiria-danger)',
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '20px',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {submitted ? (
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '999px',
                    background: 'rgba(115, 123, 90, 0.15)',
                    color: 'var(--empiria-accent-olive)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                  }}
                >
                  <CheckCircle size={24} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--empiria-text-main)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
                  Recovery Instructions Sent
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--empiria-text-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
                  If an account exists for <strong>{email}</strong>, a single-use password recovery link has been generated. For security, account existence is never disclosed.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => onNavigate(`/reset-password?email=${encodeURIComponent(email)}`)}
                    style={{
                      background: 'var(--empiria-primary)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '9999px',
                      padding: '12px 20px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Enter Recovery Token
                  </button>
                  <button
                    onClick={() => onNavigate('/login')}
                    style={{
                      background: 'transparent',
                      color: 'var(--empiria-text-muted)',
                      border: '1px solid var(--empiria-border)',
                      borderRadius: '9999px',
                      padding: '8px 16px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Return to Sign In
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-main)', marginBottom: '6px' }}>
                    Institutional Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--empiria-text-tertiary)' }} />
                    <input
                      type="email"
                      required
                      placeholder="student@institution.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        background: 'var(--empiria-surface-muted)',
                        border: '1px solid var(--empiria-border)',
                        borderRadius: '12px',
                        color: 'var(--empiria-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    background: 'var(--empiria-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '12px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: 'var(--empiria-shadow-xs)',
                  }}
                >
                  {submitting ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
                  <span>{submitting ? 'Generating Recovery Token...' : 'Request Password Reset'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 2. Reset Password Page (/reset-password)
// ---------------------------------------------------------------------------
export const ResetPasswordView: React.FC<PublicPageProps> = ({ onNavigate }) => {
  const urlParams = new URLSearchParams(window.location.search)
  const initialToken = urlParams.get('token') || ''

  const [token, setToken] = useState(initialToken)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.')
      return
    }

    setSubmitting(true)
    setErrorMsg(null)
    try {
      await api.confirmCredentialRecovery(token.trim(), newPassword)
      setSuccess(true)
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired recovery token.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--empiria-background)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid var(--empiria-border)', background: 'var(--empiria-surface)', padding: '16px 24px', boxShadow: 'var(--empiria-shadow-xs)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => onNavigate('/login')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--empiria-text-muted)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ArrowLeft size={16} /> Back to Sign In
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'var(--empiria-primary)', color: '#fff', fontWeight: 800, fontSize: '11px', padding: '4px 8px', borderRadius: '4px', fontFamily: 'var(--font-heading)' }}>
              EMPIRIA
            </div>
            <span style={{ fontSize: '12px', color: 'var(--empiria-text-main)', fontWeight: 600 }}>Set New Password</span>
          </div>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
        <div style={{ maxWidth: '440px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--empiria-text-main)', letterSpacing: '-0.3px', fontFamily: 'var(--font-heading)' }}>
              Create New Password
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--empiria-text-muted)', marginTop: '6px' }}>
              Enter your one-time verification token and choose a secure new password.
            </p>
          </div>

          <div
            style={{
              background: 'var(--empiria-surface)',
              border: '1px solid var(--empiria-border)',
              borderRadius: '24px',
              padding: '36px',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            {errorMsg && (
              <div
                style={{
                  background: 'rgba(185, 28, 28, 0.08)',
                  border: '1px solid rgba(185, 28, 28, 0.25)',
                  color: 'var(--empiria-danger)',
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '20px',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {success ? (
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '999px',
                    background: 'rgba(115, 123, 90, 0.15)',
                    color: 'var(--empiria-accent-olive)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                  }}
                >
                  <CheckCircle size={24} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--empiria-text-main)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
                  Password Reset Successful
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--empiria-text-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
                  Your password has been securely updated and previous sessions have been invalidated. You can now sign in with your new credentials.
                </p>
                <button
                  onClick={() => onNavigate('/login')}
                  style={{
                    width: '100%',
                    background: 'var(--empiria-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '12px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Sign In with New Password
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-main)', marginBottom: '6px' }}>
                    One-Time Recovery Token
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Key size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--empiria-text-tertiary)' }} />
                    <input
                      type="text"
                      required
                      placeholder="Paste recovery token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        background: 'var(--empiria-surface-muted)',
                        border: '1px solid var(--empiria-border)',
                        borderRadius: '12px',
                        color: 'var(--empiria-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-main)', marginBottom: '6px' }}>
                    New Password (min 8 chars)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--empiria-text-tertiary)' }} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        background: 'var(--empiria-surface-muted)',
                        border: '1px solid var(--empiria-border)',
                        borderRadius: '12px',
                        color: 'var(--empiria-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-main)', marginBottom: '6px' }}>
                    Confirm New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--empiria-text-tertiary)' }} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        background: 'var(--empiria-surface-muted)',
                        border: '1px solid var(--empiria-border)',
                        borderRadius: '12px',
                        color: 'var(--empiria-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    background: 'var(--empiria-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '12px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: 'var(--empiria-shadow-xs)',
                  }}
                >
                  {submitting ? <RefreshCw size={16} className="spin" /> : <Shield size={16} />}
                  <span>{submitting ? 'Updating Password...' : 'Reset & Invalidate Sessions'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 3. Accept Invitation Page (/accept-invitation)
// ---------------------------------------------------------------------------
export const AcceptInvitationView: React.FC<PublicPageProps> = ({ onNavigate }) => {
  const urlParams = new URLSearchParams(window.location.search)
  const initialToken = urlParams.get('token') || ''

  const [token, setToken] = useState(initialToken)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg(null)
    try {
      await api.acceptInvitation(token.trim(), firstName.trim(), lastName.trim(), password)
      setAccepted(true)
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid, expired, or already used invitation token.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--empiria-background)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid var(--empiria-border)', background: 'var(--empiria-surface)', padding: '16px 24px', boxShadow: 'var(--empiria-shadow-xs)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => onNavigate('/')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--empiria-text-muted)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ArrowLeft size={16} /> Platform Overview
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'var(--empiria-primary)', color: '#fff', fontWeight: 800, fontSize: '11px', padding: '4px 8px', borderRadius: '4px', fontFamily: 'var(--font-heading)' }}>
              EMPIRIA
            </div>
            <span style={{ fontSize: '12px', color: 'var(--empiria-text-main)', fontWeight: 600 }}>Member Onboarding</span>
          </div>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
        <div style={{ maxWidth: '460px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '999px',
                background: 'var(--empiria-primary-light)',
                color: 'var(--empiria-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <UserCheck size={24} />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--empiria-text-main)', letterSpacing: '-0.3px', fontFamily: 'var(--font-heading)' }}>
              Accept Institution Invitation
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--empiria-text-muted)', marginTop: '6px' }}>
              Activate your account and bind your institutional role.
            </p>
          </div>

          <div
            style={{
              background: 'var(--empiria-surface)',
              border: '1px solid var(--empiria-border)',
              borderRadius: '24px',
              padding: '36px',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            {errorMsg && (
              <div
                style={{
                  background: 'rgba(185, 28, 28, 0.08)',
                  border: '1px solid rgba(185, 28, 28, 0.25)',
                  color: 'var(--empiria-danger)',
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '20px',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {accepted ? (
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '999px',
                    background: 'rgba(115, 123, 90, 0.15)',
                    color: 'var(--empiria-accent-olive)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                  }}
                >
                  <CheckCircle size={24} />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--empiria-text-main)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
                  Account Successfully Activated!
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--empiria-text-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
                  Your institutional membership and roles have been verified. You may now sign in to your dedicated portal.
                </p>
                <button
                  onClick={() => onNavigate('/login')}
                  style={{
                    width: '100%',
                    background: 'var(--empiria-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '12px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Proceed to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-main)', marginBottom: '6px' }}>
                    Invitation Token
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Paste your invitation token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--empiria-surface-muted)',
                      border: '1px solid var(--empiria-border)',
                      borderRadius: '12px',
                      color: 'var(--empiria-text-main)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-main)', marginBottom: '6px' }}>
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'var(--empiria-surface-muted)',
                        border: '1px solid var(--empiria-border)',
                        borderRadius: '12px',
                        color: 'var(--empiria-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-main)', marginBottom: '6px' }}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'var(--empiria-surface-muted)',
                        border: '1px solid var(--empiria-border)',
                        borderRadius: '12px',
                        color: 'var(--empiria-text-main)',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-main)', marginBottom: '6px' }}>
                    Set Account Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--empiria-surface-muted)',
                      border: '1px solid var(--empiria-border)',
                      borderRadius: '12px',
                      color: 'var(--empiria-text-main)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    background: 'var(--empiria-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '12px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: 'var(--empiria-shadow-xs)',
                  }}
                >
                  {submitting ? <RefreshCw size={16} className="spin" /> : <UserCheck size={16} />}
                  <span>{submitting ? 'Activating Account...' : 'Accept Invitation & Activate'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 4. Public Content Pages (About, Features, Contact, Privacy, Terms)
// ---------------------------------------------------------------------------
export const PublicContentPageView: React.FC<PublicPageProps & { type: 'about' | 'features' | 'contact' | 'privacy' | 'terms' }> = ({
  onNavigate,
  type,
}) => {
  const getPageData = () => {
    switch (type) {
      case 'about':
        return {
          title: 'About EMPIRIA',
          subtitle: 'Institutional Student Capability Development & Academic Intelligence',
          content: (
            <div style={{ color: 'var(--empiria-text-main)', fontSize: '14px', lineHeight: 1.8 }}>
              <p style={{ marginBottom: '16px' }}>
                EMPIRIA was founded to solve a fundamental disconnection in higher education: the gap between academic transcript metrics and career-ready student competencies.
              </p>
              <p style={{ marginBottom: '16px' }}>
                Traditional student information systems treat grades and attendance as static historical records. EMPIRIA transforms these into proactive, continuous capability development pathways across Computer Science and Engineering competencies.
              </p>
              <h3 style={{ color: 'var(--empiria-text-main)', fontSize: '18px', fontWeight: 700, margin: '24px 0 12px 0', fontFamily: 'var(--font-heading)' }}>
                Core Platform Architecture
              </h3>
              <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li><strong>Domain A — Student Capability Development:</strong> The 6-stage lifecycle (Measure → Diagnose → Plan → Practise → Verify → Improve) for university CSE competencies.</li>
                <li><strong>Domain B — Academic Support Intelligence:</strong> Objective review priority queue, Hungarian mentor matching, evidence-based briefings, and intervention outcomes.</li>
                <li><strong>Tenant Isolation & Cryptographic Privacy:</strong> Field-level AES-256-GCM encryption for advisor notes and SHA-256 tamper-evident audit chaining.</li>
              </ul>
            </div>
          ),
        }

      case 'features':
        return {
          title: 'Platform Features & Capabilities',
          subtitle: 'End-to-End Capability Engineering & Institutional Orchestration',
          content: (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ background: 'var(--empiria-surface-muted)', border: '1px solid var(--empiria-border)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--empiria-shadow-sm)' }}>
                <Compass size={24} color="var(--empiria-primary)" style={{ marginBottom: '12px' }} />
                <h4 style={{ color: 'var(--empiria-text-main)', fontSize: '15px', fontWeight: 700, marginBottom: '6px', fontFamily: 'var(--font-heading)' }}>Deterministic Capability Loop</h4>
                <p style={{ color: 'var(--empiria-text-muted)', fontSize: '13px', lineHeight: 1.5 }}>
                  Measure baselines through diagnostic assessments, uncover exact skill gaps, generate tailored study plans, and objectively verify mastery.
                </p>
              </div>
              <div style={{ background: 'var(--empiria-surface-muted)', border: '1px solid var(--empiria-border)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--empiria-shadow-sm)' }}>
                <Sparkles size={24} color="var(--empiria-primary)" style={{ marginBottom: '12px' }} />
                <h4 style={{ color: 'var(--empiria-text-main)', fontSize: '15px', fontWeight: 700, marginBottom: '6px', fontFamily: 'var(--font-heading)' }}>Hungarian Mentor Allocation</h4>
                <p style={{ color: 'var(--empiria-text-muted)', fontSize: '13px', lineHeight: 1.5 }}>
                  Scipy-powered linear sum assignment pairs students with primary and subject mentors, respecting faculty capacity multipliers and expertise.
                </p>
              </div>
              <div style={{ background: 'var(--empiria-surface-muted)', border: '1px solid var(--empiria-border)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--empiria-shadow-sm)' }}>
                <BarChart3 size={24} color="var(--empiria-primary)" style={{ marginBottom: '12px' }} />
                <h4 style={{ color: 'var(--empiria-text-main)', fontSize: '15px', fontWeight: 700, marginBottom: '6px', fontFamily: 'var(--font-heading)' }}>Academic Review Priority Queue</h4>
                <p style={{ color: 'var(--empiria-text-muted)', fontSize: '13px', lineHeight: 1.5 }}>
                  Deterministic rules evaluate attendance, internal assessment failures, and credit backlogs to prioritize high-risk students without black-box bias.
                </p>
              </div>
              <div style={{ background: 'var(--empiria-surface-muted)', border: '1px solid var(--empiria-border)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--empiria-shadow-sm)' }}>
                <Shield size={24} color="var(--empiria-primary)" style={{ marginBottom: '12px' }} />
                <h4 style={{ color: 'var(--empiria-text-main)', fontSize: '15px', fontWeight: 700, marginBottom: '6px', fontFamily: 'var(--font-heading)' }}>Privacy & Cryptographic Auditing</h4>
                <p style={{ color: 'var(--empiria-text-muted)', fontSize: '13px', lineHeight: 1.5 }}>
                  Tamper-evident SHA-256 hash chains detect audit log manipulation. AES-256-GCM protects confidential mentor notes across institution boundaries.
                </p>
              </div>
            </div>
          ),
        }

      case 'contact':
        return {
          title: 'Institutional Inquiries & Support',
          subtitle: 'Deploy EMPIRIA at your University or Technical Institute',
          content: (
            <div style={{ color: 'var(--empiria-text-main)', fontSize: '14px', lineHeight: 1.8 }}>
              <p style={{ marginBottom: '20px' }}>
                For enterprise institution licensing, technical integration with existing Student Information Systems (SIS), or platform demonstrations, reach out to our team:
              </p>
              <div style={{ background: 'var(--empiria-surface-muted)', border: '1px solid var(--empiria-border)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--empiria-shadow-sm)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div><strong>Institutional Licensing:</strong> licensing@empiria.internal</div>
                <div><strong>Technical Operations:</strong> ops@empiria.internal</div>
                <div><strong>Data Protection Officer:</strong> privacy@empiria.internal</div>
              </div>
            </div>
          ),
        }

      case 'privacy':
        return {
          title: 'Institutional Privacy & Data Governance',
          subtitle: 'Guarantees on Student Data Protection, FERPA/GDPR Compliance, and Scope Limits',
          content: (
            <div style={{ color: 'var(--empiria-text-main)', fontSize: '14px', lineHeight: 1.8 }}>
              <h3 style={{ color: 'var(--empiria-text-main)', fontSize: '16px', fontWeight: 700, marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>1. Student Privacy Firewall</h3>
              <p style={{ marginBottom: '16px' }}>
                Students are strictly protected from internal risk scoring and private advisor notes. EMPIRIA enforces server-side role filters ensuring students only see constructive learning recommendations and authorized academic results.
              </p>
              <h3 style={{ color: 'var(--empiria-text-main)', fontSize: '16px', fontWeight: 700, marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>2. Institution Isolation</h3>
              <p style={{ marginBottom: '16px' }}>
                All academic records, assessment attempts, and messages are strictly scoped by tenant institution ID derived from verified session state. Cross-tenant access is rejected with HTTP 403 Forbidden.
              </p>
              <h3 style={{ color: 'var(--empiria-text-main)', fontSize: '16px', fontWeight: 700, marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>3. Cryptographic Tamper Evidence</h3>
              <p style={{ marginBottom: '16px' }}>
                Every consequential action generates a SHA-256 linked audit log entry. The integrity of the audit ledger is continuously verifiable via cryptographic chain checks.
              </p>
            </div>
          ),
        }

      case 'terms':
      default:
        return {
          title: 'Terms of Service',
          subtitle: 'Platform Usage Standards, Institutional Responsibilities, and Intellectual Property',
          content: (
            <div style={{ color: 'var(--empiria-text-main)', fontSize: '14px', lineHeight: 1.8 }}>
              <p style={{ marginBottom: '16px' }}>
                EMPIRIA is an institutional intelligence platform licensed exclusively to authorized educational institutions. Usage of this software requires an active institution licence and verified role credentials.
              </p>
              <p style={{ marginBottom: '16px' }}>
                Users are strictly prohibited from attempting unauthorized privilege escalation, cross-tenant record retrieval, or subverting assessment delivery controls. All administrative actions are recorded in permanent tamper-evident audit ledgers.
              </p>
            </div>
          ),
        }
    }
  }

  const { title, subtitle, content } = getPageData()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--empiria-background)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid var(--empiria-border)', background: 'var(--empiria-surface)', padding: '16px 24px', boxShadow: 'var(--empiria-shadow-xs)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => onNavigate('/')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--empiria-text-muted)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ArrowLeft size={16} /> Platform Overview
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => onNavigate('/login')}
              style={{
                background: 'var(--empiria-primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                padding: '8px 18px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: '960px', width: '100%', margin: '0 auto', padding: '48px 20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--empiria-text-main)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
          {title}
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--empiria-text-muted)', marginBottom: '32px' }}>
          {subtitle}
        </p>

        <div
          style={{
            background: 'var(--empiria-surface)',
            border: '1px solid var(--empiria-border)',
            borderRadius: '24px',
            padding: '36px',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          {content}
        </div>
      </main>
    </div>
  )
}
