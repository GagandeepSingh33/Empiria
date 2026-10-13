import React, { useState, useEffect } from 'react'
import {
  MessageSquare,
  Send,
  RefreshCw,
  AlertCircle,
  Plus,
  X,
  Check,
  RotateCcw,
} from 'lucide-react'
import { api } from '../../api'
import type {
  ConversationSummary,
  ConversationDetail,
  Account,
} from '../../types'

interface ConversationsViewProps {
  currentAccount: Account
  initialConversationId?: string
  activeRole: string
}

export const ConversationsView: React.FC<ConversationsViewProps> = ({
  initialConversationId,
  activeRole,
}) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId || null)
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Compose Modal State
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeRecipients, setComposeRecipients] = useState<{ membershipId: string; label: string; sub?: string; studentProfileId?: string }[]>([])
  const [selectedRecipientMembershipId, setSelectedRecipientMembershipId] = useState<string>('')
  const [selectedStudentProfileId, setSelectedStudentProfileId] = useState<string | undefined>(undefined)
  const [composeSubject, setComposeSubject] = useState('')
  const [composeMessage, setComposeMessage] = useState('')
  const [composeKind, setComposeKind] = useState<'primary_mentoring' | 'subject_mentoring' | 'assessment_query' | 'general'>('general')
  const [submittingCompose, setSubmittingCompose] = useState(false)

  useEffect(() => {
    loadConversations()
  }, [filterStatus])

  useEffect(() => {
    if (selectedId) {
      loadConversationThread(selectedId)
    } else {
      setActiveConversation(null)
    }
  }, [selectedId])

  const loadConversations = async () => {
    try {
      setLoadingList(true)
      setErrorMsg(null)
      const statusParam = filterStatus === 'all' ? undefined : filterStatus
      const list = await api.getConversations(statusParam)
      setConversations(list)

      if (!selectedId && list.length > 0) {
        setSelectedId(list[0].id)
      } else if (selectedId && !list.some((c) => c.id === selectedId)) {
        if (list.length > 0) {
          setSelectedId(list[0].id)
        } else {
          setActiveConversation(null)
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load conversations')
    } finally {
      setLoadingList(false)
    }
  }

  const loadConversationThread = async (id: string) => {
    try {
      setLoadingThread(true)
      const detail = await api.getConversation(id)
      setActiveConversation(detail)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load message thread')
    } finally {
      setLoadingThread(false)
    }
  }

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId || !replyText.trim()) return

    try {
      setSendingReply(true)
      const newMsg = await api.sendMessage(selectedId, replyText.trim())
      if (activeConversation) {
        setActiveConversation({
          ...activeConversation,
          messages: [...activeConversation.messages, newMsg],
          last_message_at: newMsg.created_at,
        })
      }
      setReplyText('')
      const updatedList = await api.getConversations(filterStatus === 'all' ? undefined : filterStatus)
      setConversations(updatedList)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send reply')
    } finally {
      setSendingReply(false)
    }
  }

  const handleToggleStatus = async (newStatus: 'open' | 'resolved') => {
    if (!selectedId) return
    try {
      await api.updateConversationStatus(selectedId, newStatus)
      if (activeConversation) {
        setActiveConversation({ ...activeConversation, status: newStatus })
      }
      const updatedList = await api.getConversations(filterStatus === 'all' ? undefined : filterStatus)
      setConversations(updatedList)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update conversation status')
    }
  }

  const handleOpenComposeModal = async () => {
    setComposeOpen(true)
    setComposeSubject('')
    setComposeMessage('')
    setSelectedRecipientMembershipId('')
    setSelectedStudentProfileId(undefined)

    try {
      if (activeRole === 'student') {
        setComposeKind('general')
        const myMentors = await api.getMyMentors()
        const options: { membershipId: string; label: string; sub?: string }[] = []
        if (myMentors.primary_mentor) {
          options.push({
            membershipId: myMentors.primary_mentor.membership_id,
            label: `${myMentors.primary_mentor.name} (Primary Mentor)`,
            sub: myMentors.primary_mentor.email,
          })
        }
        for (const sm of myMentors.subject_mentors) {
          options.push({
            membershipId: sm.membership_id,
            label: `${sm.name} (Subject: ${sm.subject_scope || 'Specialist'})`,
            sub: sm.email,
          })
        }
        setComposeRecipients(options)
        if (options.length > 0) {
          setSelectedRecipientMembershipId(options[0].membershipId)
        }
      } else {
        // Staff/Mentor sees students
        setComposeKind('general')
        const students = await api.listStudents()
        const options = students.map((s) => ({
          membershipId: s.id, // For students, student profile or membership lookup
          label: `${s.first_name} ${s.last_name} (Student)`,
          sub: s.email,
          studentProfileId: s.id,
        }))
        setComposeRecipients(options)
        if (options.length > 0) {
          setSelectedRecipientMembershipId(options[0].membershipId)
          setSelectedStudentProfileId(options[0].studentProfileId)
        }
      }
    } catch (err) {
      console.error('Failed to load eligible recipients', err)
    }
  }

  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRecipientMembershipId || !composeSubject.trim() || !composeMessage.trim()) return

    try {
      setSubmittingCompose(true)
      const created = await api.createConversation({
        recipient_membership_id: selectedRecipientMembershipId,
        conversation_kind: composeKind,
        subject: composeSubject.trim(),
        message_body: composeMessage.trim(),
        student_profile_id: selectedStudentProfileId,
      })
      setComposeOpen(false)
      await loadConversations()
      setSelectedId(created.id)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start conversation')
    } finally {
      setSubmittingCompose(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top action header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em', fontFamily: 'var(--font-heading)' }}>
            Queries & Messages
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Persistent communication with your mentors, students, and institutional faculty.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={loadConversations}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleOpenComposeModal}>
            <Plus size={14} /> New Query / Message
          </button>
        </div>
      </div>

      <div className="explainer-banner">
        <div className="explainer-icon-box">
          <MessageSquare size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            Traceable Institutional Advisory Threads
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Communicate directly with your Primary Mentor, Subject Specialists, or Course Assessors with real-time thread status (Open, Resolved) and persistent audit history.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="callout callout-warning">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main split inbox container */}
      <div
        className="card"
        style={{
          display: 'grid',
          gridTemplateColumns: '360px 1fr',
          minHeight: '620px',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '10px',
        }}
      >
        {/* Left Column: Conversation List */}
        <div
          style={{
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-surface)',
          }}
        >
          {/* Filter Bar */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '6px',
              background: 'var(--bg-surface-alt)',
            }}
          >
            {(['all', 'open', 'resolved'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                style={{
                  background: filterStatus === st ? 'var(--empiria-primary)' : 'transparent',
                  color: filterStatus === st ? '#fff' : 'var(--text-muted)',
                  border: filterStatus === st ? 'none' : '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {st === 'all' ? 'All Queries' : st}
              </button>
            ))}
          </div>

          {/* List items */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingList ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px' }} />
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <MessageSquare size={32} color="var(--text-dim)" style={{ margin: '0 auto 10px' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                  No Conversations
                </div>
                <div style={{ fontSize: '12px' }}>
                  {filterStatus === 'all'
                    ? 'Start a query using the button above.'
                    : `No ${filterStatus} conversations.`}
                </div>
              </div>
            ) : (
              conversations.map((c) => {
                const isSelected = c.id === selectedId

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--empiria-primary-subtle)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--empiria-primary)' : '3px solid transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                        {c.other_party_name}
                      </span>
                      <span
                        className={`badge ${c.status === 'open' ? 'badge-info' : 'badge-success'}`}
                        style={{ fontSize: '10px', padding: '1px 5px', textTransform: 'uppercase' }}
                      >
                        {c.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? 'var(--empiria-primary)' : 'var(--text-main)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.subject}
                    </div>

                    {c.latest_message && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '6px' }}>
                        {c.latest_message}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)' }}>
                      <span>{c.unread_messages ? `${c.unread_messages} unread` : 'Read'}</span>
                      <span>{new Date(c.last_message_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation View */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)' }}>
          {selectedId && activeConversation ? (
            <>
              {/* Thread Header */}
              <div
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--bg-surface)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {activeConversation.subject}
                    </h3>
                    <span className={`badge ${activeConversation.status === 'open' ? 'badge-info' : 'badge-success'}`} style={{ textTransform: 'uppercase' }}>
                      {activeConversation.status}
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                      {activeConversation.conversation_kind.replace('_', ' ')}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Participants:{' '}
                    {activeConversation.participants
                      .map((p) => `${p.name} (${p.participant_kind.replace('_', ' ')})`)
                      .join(' • ')}
                  </div>
                </div>

                <div>
                  {activeConversation.status === 'open' ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleToggleStatus('resolved')}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Check size={14} color="var(--status-met)" /> Mark Resolved
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleToggleStatus('open')}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <RotateCcw size={14} /> Reopen Query
                    </button>
                  )}
                </div>
              </div>

              {/* Message History */}
              <div
                style={{
                  flex: 1,
                  padding: '24px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  background: 'var(--empiria-surface-muted)',
                }}
              >
                {loadingThread ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px', color: 'var(--empiria-primary)' }} />
                    Loading messages...
                  </div>
                ) : (
                  activeConversation.messages.map((m) => {
                    const isSelf = activeConversation.participants.some(
                      (p) => p.membership_id === m.sender_membership_id && p.email === activeConversation.student_email
                    )
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isSelf ? 'flex-end' : 'flex-start',
                          maxWidth: '80%',
                          alignSelf: isSelf ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '11px', color: 'var(--text-dim)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                            {m.sender_name} ({m.sender_role.replace('_', ' ')})
                          </span>
                          <span>•</span>
                          <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div
                          style={{
                            background: isSelf ? 'var(--empiria-primary)' : 'var(--empiria-surface)',
                            color: isSelf ? '#ffffff' : 'var(--text-main)',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            boxShadow: 'var(--shadow-sm)',
                            border: isSelf ? 'none' : '1px solid var(--border-subtle)',
                            fontSize: '13px',
                            lineHeight: 1.6,
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {m.body}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Reply Input Box */}
              <form
                onSubmit={handleSendReply}
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-end',
                }}
              >
                <textarea
                  rows={2}
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your response..."
                  style={{
                    flex: 1,
                    background: 'var(--bg-surface-alt)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: 'var(--text-main)',
                    resize: 'none',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="btn btn-primary"
                  style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Send size={14} /> {sendingReply ? 'Sending...' : 'Reply'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
              <div style={{ textAlign: 'center' }}>
                <MessageSquare size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Select a Conversation
                </div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                  Choose a thread from the list or start a new query.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Query / Conversation Modal */}
      {composeOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--empiria-overlay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--empiria-surface)',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>
                Start a New Query / Conversation
              </h3>
              <button
                onClick={() => setComposeOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateConversation}>
              <div className="form-group">
                <label className="form-label">Recipient</label>
                {composeRecipients.length > 0 ? (
                  <select
                    className="form-select"
                    value={selectedRecipientMembershipId}
                    onChange={(e) => {
                      setSelectedRecipientMembershipId(e.target.value)
                      const found = composeRecipients.find((r) => r.membershipId === e.target.value)
                      if (found) setSelectedStudentProfileId(found.studentProfileId)
                    }}
                    required
                  >
                    {composeRecipients.map((r) => (
                      <option key={r.membershipId} value={r.membershipId}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--status-gap)', padding: '6px 0' }}>
                    No authorized recipients available.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Query Subject</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="e.g. Query on Python pandas aggregation or Milestone update"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Initial Message</label>
                <textarea
                  rows={4}
                  required
                  className="form-input"
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  placeholder="Provide details about your query or instructions..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setComposeOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCompose || !selectedRecipientMembershipId}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Send size={14} /> {submittingCompose ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
