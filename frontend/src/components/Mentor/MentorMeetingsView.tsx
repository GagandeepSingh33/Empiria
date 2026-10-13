import React, { useState } from 'react'
import {
  Clock,
  Video,
  MapPin,
  Plus,
  FileText,
} from 'lucide-react'

interface AdvisoryMeeting {
  id: string
  studentName: string
  studentEmail: string
  program: string
  meetingType: 'Primary Advisory Sync' | 'SQL Code Review' | 'Milestone Sign-off' | 'Intervention Check-in'
  dateTime: string
  location: string
  agenda: string
  status: 'confirmed' | 'completed' | 'rescheduled'
  notes?: string
}

interface MentorMeetingsViewProps {
  onNavigate?: (path: string) => void
  onOpenConversation?: (conversationId?: string) => void
}

export const MentorMeetingsView: React.FC<MentorMeetingsViewProps> = () => {
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<AdvisoryMeeting | null>(null)
  const [sessionNotes, setSessionNotes] = useState('')

  const meetings: AdvisoryMeeting[] = [
    {
      id: 'meet-1',
      studentName: 'Aarav Sharma',
      studentEmail: 'student@apex.edu',
      program: 'B.Tech Computer Science (Sem 4)',
      meetingType: 'Primary Advisory Sync',
      dateTime: 'Today, 2:30 PM – 3:15 PM',
      location: 'Faculty Office 402 / Zoom Link',
      agenda: 'Review Stage 1 diagnostic baseline (68%), address SQL tuning gap findings, and validate Stage 3 Personal Development Plan milestones.',
      status: 'confirmed',
      notes: 'Mentee requested advice on window function index structures.',
    },
    {
      id: 'meet-2',
      studentName: 'Priya Patel',
      studentEmail: 'student2@apex.edu',
      program: 'Data Science & Analytics (Sem 6)',
      meetingType: 'SQL Code Review',
      dateTime: 'Tomorrow, 10:00 AM – 10:45 AM',
      location: 'Virtual Advising Room B',
      agenda: 'Walkthrough of Lab 4 deliberate practice submission on PyTorch data loaders and dataset pipelines.',
      status: 'confirmed',
    },
    {
      id: 'meet-3',
      studentName: 'Devansh Mehta',
      studentEmail: 'devansh@apex.edu',
      program: 'Software Engineering (Sem 3)',
      meetingType: 'Milestone Sign-off',
      dateTime: 'Thursday, 4:00 PM – 4:30 PM',
      location: 'Faculty Office 402',
      agenda: 'Verification of OAuth2 and JWT security implementation before stage 5 assessor review.',
      status: 'confirmed',
    },
    {
      id: 'meet-4',
      studentName: 'Aarav Sharma',
      studentEmail: 'student@apex.edu',
      program: 'B.Tech Computer Science (Sem 4)',
      meetingType: 'Intervention Check-in',
      dateTime: 'Last Week, Oct 6',
      location: 'Faculty Office 402',
      agenda: 'Initial onboarding and Semester 4 credit load review.',
      status: 'completed',
      notes: 'Completed successfully. Mentee is in good academic standing. Enrolled in 4 core technical courses.',
    },
  ]

  const filteredMeetings = meetings.filter((m) => {
    if (filter === 'upcoming') return m.status === 'confirmed'
    if (filter === 'past') return m.status === 'completed'
    return true
  })

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--empiria-text-secondary)', fontSize: '13px', marginBottom: '4px' }}>
            <span>Mentor Portal</span>
            <span>/</span>
            <span style={{ color: 'var(--empiria-primary)', fontWeight: 600 }}>Advisory Meetings</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--empiria-text)', margin: 0, fontFamily: 'var(--font-heading)' }}>
            Advisory Meeting Schedule & Follow-ups
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--empiria-text-secondary)', marginTop: '4px' }}>
            Structured 1:1 mentee advisory syncs, deliberate practice walkthroughs, and milestone follow-ups.
          </p>
        </div>

        <button
          onClick={() => setShowScheduleModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: 'var(--radius-full)' }}
        >
          <Plus size={15} /> Schedule Advisory Sync
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => setFilter('upcoming')}
          className={`btn ${filter === 'upcoming' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-full)', padding: '7px 16px', fontSize: '13px' }}
        >
          Upcoming Sessions (3)
        </button>
        <button
          onClick={() => setFilter('past')}
          className={`btn ${filter === 'past' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-full)', padding: '7px 16px', fontSize: '13px' }}
        >
          Completed Sessions (1)
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: 'var(--radius-full)', padding: '7px 16px', fontSize: '13px' }}
        >
          All Sessions (4)
        </button>
      </div>

      {/* Meetings List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredMeetings.map((m) => (
          <div
            key={m.id}
            style={{
              background: '#ffffff',
              border: '1px solid var(--empiria-border)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '20px',
            }}
          >
            <div style={{ flex: 1, minWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: m.status === 'confirmed' ? '#eff6ff' : '#ecfdf5',
                    color: m.status === 'confirmed' ? '#2563eb' : '#059669',
                    border: `1px solid ${m.status === 'confirmed' ? '#bfdbfe' : '#a7f3d0'}`,
                  }}
                >
                  {m.meetingType}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--empiria-text-muted)' }}>
                  {m.status === 'confirmed' ? 'Scheduled & Confirmed' : 'Session Completed'}
                </span>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--empiria-text)', margin: '0 0 4px', fontFamily: 'var(--font-heading)' }}>
                {m.studentName} — {m.program}
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--empiria-text-secondary)', fontSize: '13px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={14} color="#2563eb" /> {m.dateTime}
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin size={14} color="#2563eb" /> {m.location}
                </span>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', color: 'var(--empiria-text)', lineHeight: 1.5 }}>
                <strong>Session Agenda:</strong> {m.agenda}
              </div>

              {m.notes && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--empiria-text-secondary)', fontStyle: 'italic' }}>
                  Session Follow-up Note: "{m.notes}"
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '150px' }}>
              <button
                onClick={() => setSelectedMeeting(m)}
                className="btn btn-primary"
                style={{
                  borderRadius: 'var(--radius-full)',
                  padding: '9px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <FileText size={14} /> Record Notes
              </button>
              <button
                className="btn btn-secondary"
                style={{
                  borderRadius: 'var(--radius-full)',
                  padding: '9px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Video size={14} color="#2563eb" /> Launch Room
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Record Notes Modal */}
      {selectedMeeting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '520px', width: '100%', padding: '28px', border: '1px solid var(--empiria-border)', boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', fontFamily: 'var(--font-heading)' }}>
              Record Advisory Session Notes
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--empiria-text-secondary)', margin: '0 0 16px' }}>
              Document progress notes for <strong>{selectedMeeting.studentName}</strong>. Notes will link to the mentee's Student 360 dossier.
            </p>

            <textarea
              rows={4}
              placeholder="Enter key discussion takeaways, student action items, and next milestone targets..."
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              style={{ width: '100%', marginBottom: '16px' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setSelectedMeeting(null)}
                className="btn btn-secondary"
                style={{ borderRadius: 'var(--radius-full)', padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Session notes saved to mentee audit trail!')
                  setSelectedMeeting(null)
                  setSessionNotes('')
                }}
                className="btn btn-primary"
                style={{ borderRadius: 'var(--radius-full)', padding: '8px 18px' }}
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '500px', width: '100%', padding: '28px', border: '1px solid var(--empiria-border)', boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px', fontFamily: 'var(--font-heading)' }}>
              Schedule New Advisory Sync
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Select Mentee</label>
                <select style={{ width: '100%' }}>
                  <option>Aarav Sharma (B.Tech CSE - Primary)</option>
                  <option>Priya Patel (Data Science - Subject)</option>
                  <option>Devansh Mehta (Software Eng - Subject)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Meeting Type</label>
                <select style={{ width: '100%' }}>
                  <option>Primary Advisory Review</option>
                  <option>Subject Competency Deep Dive</option>
                  <option>Deliberate Practice Code Review</option>
                  <option>Diagnostic Milestone Check-in</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Proposed Date & Time</label>
                <input type="text" placeholder="e.g. Next Tuesday at 2:00 PM" style={{ width: '100%' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Agenda / Objective</label>
                <textarea rows={3} placeholder="Session goals..." style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="btn btn-secondary"
                style={{ borderRadius: 'var(--radius-full)', padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Advisory sync invitation dispatched to student!')
                  setShowScheduleModal(false)
                }}
                className="btn btn-primary"
                style={{ borderRadius: 'var(--radius-full)', padding: '8px 18px' }}
              >
                Confirm & Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
