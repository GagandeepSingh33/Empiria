import React, { useState } from 'react'
import {
  LogIn,
  AlertCircle,
  ArrowLeft,
  ArrowRightLeft,
  Shield,
  UserCheck,
  GraduationCap,
  Compass,
  Building,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Sparkles,
} from 'lucide-react'

interface LoginPageProps {
  onLogin: (email: string, pass: string) => Promise<void>
  onNavigateHome: () => void
  submitting: boolean
  authError: string | null
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onNavigateHome,
  submitting,
  authError,
}) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [googleNotice, setGoogleNotice] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onLogin(email, password)
  }

  const handlePreFill = (eMail: string, pass: string) => {
    setEmail(eMail)
    setPassword(pass)
  }

  const handleGoogleClick = () => {
    setGoogleNotice(
      'Google Workspace Single Sign-On (SSO): Configuring OAuth 2.0 Client credentials (GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET). You can currently authenticate with any institutional apex.edu demo account below.'
    )
    setTimeout(() => {
      setGoogleNotice(null)
    }, 6000)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef2f6 100%)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Top Header Navigation */}
      <header
        style={{
          borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          padding: '14px 28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={onNavigateHome}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '8px',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <ArrowLeft size={16} /> Back to EMPIRIA Overview
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
            >
              <ArrowRightLeft size={16} />
            </div>
            <span
              style={{
                fontSize: '15px',
                color: 'var(--text-main)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                fontFamily: 'var(--font-display)',
              }}
            >
              EMPIRIA
            </span>
          </div>
        </div>
      </header>

      {/* Main Authentication Container */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          position: 'relative',
        }}
      >
        {/* Subtle Ambient Decorative Glows */}
        <div
          style={{
            position: 'absolute',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0) 70%)',
            top: '10%',
            left: '20%',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0) 70%)',
            bottom: '10%',
            right: '20%',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: '480px', width: '100%', position: 'relative', zIndex: 1 }}>
          {/* Top Headline */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#eff6ff',
                color: '#2563eb',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                marginBottom: '12px',
                border: '1px solid #dbeafe',
              }}
            >
              <Sparkles size={12} />
              <span>ACADEMIC INTELLIGENCE SUITE</span>
            </div>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 800,
                color: 'var(--text-main)',
                letterSpacing: '-0.03em',
                margin: '0 0 6px 0',
                fontFamily: 'var(--font-display)',
              }}
            >
              Sign In to Your Workspace
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
              Access continuous capability tracking, diagnostics, and mentorship.
            </p>
          </div>

          {/* Login Card */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              borderRadius: '24px',
              padding: '34px',
              boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.07), 0 0 1px 1px rgba(0, 0, 0, 0.02)',
            }}
          >
            {authError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '20px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{authError}</span>
              </div>
            )}

            {googleNotice && (
              <div
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1d4ed8',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  lineHeight: 1.5,
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Sparkles size={13} /> Google Sign-In Integration Ready
                </div>
                {googleNotice}
              </div>
            )}

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleClick}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '14px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#1e293b',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#94a3b8'
                e.currentTarget.style.background = '#f8fafc'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1'
                e.currentTarget.style.background = '#ffffff'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}
            >
              {/* Official Google 4-Color Icon */}
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Clean Divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '22px 0',
                color: 'var(--text-muted)',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              <span style={{ padding: '0 12px' }}>or institutional email</span>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Institutional Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                    }}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="username@apex.edu"
                    className="form-input"
                    style={{
                      paddingLeft: '40px',
                      height: '44px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      width: '100%',
                    }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>
                    Password
                  </label>
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--empiria-primary)',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Forgot Password?
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                    }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="form-input"
                    style={{
                      paddingLeft: '40px',
                      paddingRight: '40px',
                      height: '44px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      width: '100%',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  padding: '13px',
                  fontSize: '14px',
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <LogIn size={16} />
                <span>{submitting ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              </button>
            </form>

            {/* Instant Demo Roster Chip Selectors */}
            <div style={{ marginTop: '26px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <span
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Shield size={12} color="#2563eb" /> 1-Click Role Sandbox
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Select to fill</span>
              </div>

              <button
                type="button"
                onClick={() => handlePreFill('gagandeep1102005@gmail.com', 'VoidSpire2026!')}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)',
                  border: '1px solid #bfdbfe',
                  borderRadius: '11px',
                  padding: '9px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 3px rgba(37,99,235,0.06)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6'
                  e.currentTarget.style.boxShadow = '0 3px 8px rgba(37,99,235,0.12)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#bfdbfe'
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(37,99,235,0.06)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={14} color="#2563eb" /> VoidSpire (Super Admin)
                  </div>
                  <div style={{ color: '#475569', fontSize: '11px', marginTop: '1px' }}>
                    gagandeep1102005@gmail.com • Platform Super Admin & Executive
                  </div>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 700, background: '#2563eb', color: '#ffffff', padding: '2px 8px', borderRadius: '20px' }}>
                  SUPER ADMIN
                </span>
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handlePreFill('student@apex.edu', 'StudentPass123!')}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2563eb'
                    e.currentTarget.style.background = '#eff6ff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.background = '#f8fafc'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '12px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <GraduationCap size={13} color="#2563eb" /> Student Aarav
                  </div>
                  <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
                    CSE Year 3 Mentee
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handlePreFill('mentor@apex.edu', 'MentorPass123!')}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#059669'
                    e.currentTarget.style.background = '#ecfdf5'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.background = '#f8fafc'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '12px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Compass size={13} color="#059669" /> Dr. Verma (Mentor)
                  </div>
                  <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
                    Senior Faculty Advisor
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handlePreFill('faculty@apex.edu', 'FacultyPass123!')}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#0284c7'
                    e.currentTarget.style.background = '#f0f9ff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.background = '#f8fafc'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '12px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <UserCheck size={13} color="#0284c7" /> Prof. Sunita Rao
                  </div>
                  <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
                    Faculty Assessor
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handlePreFill('admin@apex.edu', 'AdminPass123!')}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#7c3aed'
                    e.currentTarget.style.background = '#f5f3ff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.background = '#f8fafc'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '12px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Building size={13} color="#7c3aed" /> Eleanor Vance
                  </div>
                  <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
                    Institution Admin
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Footer Security Badges */}
          <div
            style={{
              marginTop: '20px',
              textAlign: 'center',
              fontSize: '12px',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            <span>FERPA Compliant</span>
            <span>·</span>
            <span>256-bit TLS Encrypted</span>
            <span>·</span>
            <span>Continuous Audit Log</span>
          </div>
        </div>
      </div>
    </div>
  )
}
