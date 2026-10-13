import React, { useState } from 'react'
import { api } from '../../api'
import { X, Send, CheckCircle2, AlertCircle } from 'lucide-react'

interface SupportRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmitted: () => void
}

export const SupportRequestModal: React.FC<SupportRequestModalProps> = ({ isOpen, onClose, onSubmitted }) => {
  const [subject, setSubject] = useState<string>('')
  const [message, setMessage] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      setError('Please provide both subject and detailed description.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      await api.submitSupportRequest(subject, message)
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setSubject('')
        setMessage('')
        onSubmitted()
        onClose()
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)', margin: 0 }}>
            Request Advisor Review / Institutional Support
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--empiria-text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="callout callout-warning">
            <AlertCircle size={18} />
            <div>{error}</div>
          </div>
        )}

        {success ? (
          <div className="callout callout-success">
            <CheckCircle2 size={18} />
            <div>Your support request has been logged and routed to the institutional staff queue!</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Review verified SQL progress or request project consultation"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Detailed Notes / Questions</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="Describe what specific guidance, rubric clarification, or portfolio review you require..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Requests are securely routed to assigned academic advisors or designated institutional queue coordinators.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                <Send size={14} /> {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
