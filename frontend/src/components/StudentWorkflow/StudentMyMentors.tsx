import React, { useState, useEffect } from 'react'
import {
  Compass,
  Code2,
  Mail,
  Calendar,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  Send,
  X,
  CheckCircle2,
  UserCheck,
} from 'lucide-react'
import { api } from '../../api'
import type { MyMentorsResponse, MyMentorItem } from '../../types'

interface StudentMyMentorsProps {
  onOpenConversation?: (conversationId?: string) => void
}

export const StudentMyMentors: React.FC<StudentMyMentorsProps> = ({ onOpenConversation }) => {
  const [data, setData] = useState<MyMentorsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Message modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState<MyMentorItem | null>(null)
  const [queryKind, setQueryKind] = useState<'primary_mentoring' | 'subject_mentoring'>('primary_mentoring')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  useEffect(() => {
    loadMentors()
  }, [])

  const loadMentors = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.getMyMentors()
      setData(res)
    } catch (err: any) {
      setError(err.message || 'Failed to load mentor assignments')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCompose = (mentor: MyMentorItem, defaultKind: 'primary_mentoring' | 'subject_mentoring', defaultSubject = '') => {
    setSelectedRecipient(mentor)
    setQueryKind(defaultKind)
    setSubject(defaultSubject)
    setMessage('')
    setSendSuccess(false)
    setSendError(null)
    setModalOpen(true)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRecipient) return

    try {
      setSending(true)
      setSendError(null)
      const created = await api.createConversation({
        recipient_membership_id: selectedRecipient.membership_id,
        conversation_kind: queryKind,
        subject,
        message_body: message,
        subject_scope: selectedRecipient.subject_scope,
      })
      setSendSuccess(true)
      setTimeout(() => {
        setModalOpen(false)
        if (onOpenConversation) {
          onOpenConversation(created.id)
        }
      }, 1000)
    } catch (err: any) {
      setSendError(err.message || 'Failed to send query')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
        <RefreshCw size={24} className="spin" style={{ color: 'var(--primary-600)', marginRight: '10px' }} />
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Loading your assigned mentors...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '24px', borderLeft: '4px solid var(--status-gap)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--status-gap)', marginBottom: '8px' }}>
          <AlertCircle size={20} />
          <h4 style={{ fontWeight: 600 }}>Error Loading Mentors</h4>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>{error}</p>
        <button className="btn btn-secondary btn-sm" onClick={loadMentors}>
          <RefreshCw size={14} /> Try Again
        </button>
      </div>
    )
  }

  const primary = data?.primary_mentor
  const subjects = data?.subject_mentors || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header Banner */}
      <div className="explainer-banner">
        <div className="explainer-icon-box">
          <Compass size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            My Mentorship Guidance Network
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Personalized guidance structure pairing you with a designated Primary Mentor and domain Subject Specialists for office-hour advisory, goal alignment, and direct messaging.
          </p>
        </div>
      </div>

      {/* SECTION 1: PRIMARY MENTOR */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--primary-700)' }}>
            Primary Strategic Guidance
          </span>
          <span className="badge badge-info" style={{ fontSize: '10px' }}>Single Active Advisor</span>
        </div>

        {primary ? (
          <div
            className="card"
            style={{
              padding: '24px',
              border: '1px solid var(--empiria-border)',
              borderLeft: '4px solid var(--empiria-primary)',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--empiria-primary-subtle)',
                    color: 'var(--empiria-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '18px',
                    border: '1px solid var(--empiria-border)',
                  }}
                >
                  {primary.name?.[0] || 'M'}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)', margin: 0 }}>
                      {primary.name}
                    </h3>
                    <span className="badge badge-success" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <UserCheck size={12} /> Active Primary Mentor
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '6px', fontSize: '13px', color: 'var(--empiria-text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Mail size={14} /> {primary.email}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={14} /> Assigned on {new Date(primary.assigned_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <button
                  className="btn btn-primary"
                  onClick={() =>
                    handleOpenCompose(
                      primary,
                      'primary_mentoring',
                      `Strategic Milestone Query - ${primary.name}`
                    )
                  }
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <MessageSquare size={15} /> Send Direct Message
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="card"
            style={{
              padding: '32px',
              textAlign: 'center',
              border: '1px dashed var(--empiria-border)',
              background: 'var(--empiria-surface-muted)',
            }}
          >
            <Compass size={36} color="var(--empiria-text-secondary)" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)', marginBottom: '4px' }}>
              No Primary Mentor Assigned
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--empiria-text-secondary)', maxWidth: '440px', margin: '0 auto' }}>
              Your Institution Admin has not yet designated a Primary Mentor for your profile. Your primary mentor will coordinate your overall portfolio and milestone reviews once assigned.
            </p>
          </div>
        )}
      </div>

      {/* SECTION 2: SUBJECT MENTORS */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--empiria-primary)' }}>
              Subject & Competency Mentors
            </span>
            <span className="badge badge-info" style={{ fontSize: '10px' }}>
              {subjects.length} Assigned
            </span>
          </div>
        </div>

        {subjects.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {subjects.map((sm) => (
              <div
                key={sm.assignment_id}
                className="card"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'rgba(115, 123, 90, 0.15)',
                          color: 'var(--empiria-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '15px',
                          border: '1px solid var(--empiria-border)',
                        }}
                      >
                        {sm.name?.[0] || 'S'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)' }}>
                          {sm.name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)' }}>
                          {sm.email}
                        </div>
                      </div>
                    </div>

                    <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                      <Code2 size={12} /> {sm.subject_scope || 'Specialist'}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px' }}>
                    Assigned: {new Date(sm.assigned_at).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      handleOpenCompose(
                        sm,
                        'subject_mentoring',
                        `Question regarding ${sm.subject_scope || 'Subject Competency'}`
                      )
                    }
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <MessageSquare size={13} /> Ask Subject Query
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="card"
            style={{
              padding: '32px',
              textAlign: 'center',
              border: '1px dashed var(--border-subtle)',
              background: 'var(--bg-surface-alt)',
            }}
          >
            <Code2 size={36} color="var(--text-dim)" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
              No Subject Mentors Currently Assigned
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto' }}>
              As you progress through target competencies like SQL, Python, and Statistics, your institution can assign specialized mentors for technical code reviews and subject assistance.
            </p>
          </div>
        )}
      </div>

      {/* Query Compose Modal */}
      {modalOpen && selectedRecipient && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Send Query to {selectedRecipient.name}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {selectedRecipient.email}
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {sendSuccess ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle2 size={44} color="var(--empiria-primary)" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Query Sent Successfully
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  A persistent conversation thread has been opened.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage}>
                {sendError && (
                  <div className="callout callout-warning" style={{ marginBottom: '16px' }}>
                    <AlertCircle size={16} />
                    <span>{sendError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Question on SQL Window Functions or Project Plan"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Message Details</label>
                  <textarea
                    rows={4}
                    required
                    className="form-input"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Explain your question, roadblock, or request for guidance..."
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={sending}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Send size={14} /> {sending ? 'Sending...' : 'Send Query'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
