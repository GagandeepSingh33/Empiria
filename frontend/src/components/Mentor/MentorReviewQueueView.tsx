import React, { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  ChevronRight,
  ShieldCheck,
  MessageSquare,
  FileCheck,
  AlertTriangle,
  X,
} from 'lucide-react'

interface ReviewItem {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  courseCode: string
  courseName: string
  assessmentType: 'Diagnostic Assessment' | 'Verification Check' | 'Lab Milestone'
  submittedAt: string
  status: 'pending' | 'needs_remediation' | 'approved'
  scorePercent: number
  identifiedDeficit: string
  evidenceSnippet: string
  priority: 'high' | 'medium' | 'normal'
}

const INITIAL_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-001',
    studentId: 'stu-aarav-01',
    studentName: 'Aarav Sharma',
    studentEmail: 'student@apex.edu',
    courseCode: 'CS201',
    courseName: 'Data Structures & Algorithms',
    assessmentType: 'Diagnostic Assessment',
    submittedAt: 'Today, 11:20 AM',
    status: 'pending',
    scorePercent: 68,
    identifiedDeficit: 'Graph Algorithms & Adjacency List Complexity Analysis',
    evidenceSnippet: 'Attempted BFS on cyclic directed graph without visited set; time complexity miscalculated as O(V).',
    priority: 'high',
  },
  {
    id: 'rev-002',
    studentId: 'stu-aarav-01',
    studentName: 'Aarav Sharma',
    studentEmail: 'student@apex.edu',
    courseCode: 'CS304',
    courseName: 'Database Management Systems',
    assessmentType: 'Verification Check',
    submittedAt: 'Yesterday, 3:45 PM',
    status: 'approved',
    scorePercent: 88,
    identifiedDeficit: 'SQL Multi-table Joins with Window Partitions',
    evidenceSnippet: 'Correctly structured dense_rank() over department partitions with subquery filter.',
    priority: 'normal',
  },
  {
    id: 'rev-003',
    studentId: 'stu-priya-02',
    studentName: 'Priya Nair',
    studentEmail: 'student2@apex.edu',
    courseCode: 'CS202',
    courseName: 'Discrete Mathematics',
    assessmentType: 'Diagnostic Assessment',
    submittedAt: 'Oct 11, 2026',
    status: 'needs_remediation',
    scorePercent: 54,
    identifiedDeficit: 'Predicate Logic Induction Proofs',
    evidenceSnippet: 'Induction step omitted base case boundary check n=1 for recurrence hypothesis.',
    priority: 'high',
  },
  {
    id: 'rev-004',
    studentId: 'stu-priya-02',
    studentName: 'Priya Nair',
    studentEmail: 'student2@apex.edu',
    courseCode: 'CS204',
    courseName: 'Object Oriented Design',
    assessmentType: 'Lab Milestone',
    submittedAt: 'Oct 10, 2026',
    status: 'pending',
    scorePercent: 74,
    identifiedDeficit: 'Dependency Inversion & Interface Segregation',
    evidenceSnippet: 'Direct tight coupling to ConcretePaymentGateway in BusinessOrderService.',
    priority: 'medium',
  },
]

interface MentorReviewQueueViewProps {
  onNavigate?: (path: string) => void
  onOpenConversation?: (conversationId?: string) => void
}

export const MentorReviewQueueView: React.FC<MentorReviewQueueViewProps> = ({
  onNavigate,
  onOpenConversation,
}) => {
  const [reviews, setReviews] = useState<ReviewItem[]>(INITIAL_REVIEWS)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [activeReview, setActiveReview] = useState<ReviewItem | null>(null)
  const [feedbackNotes, setFeedbackNotes] = useState<string>('')
  const [decisionScore, setDecisionScore] = useState<number>(70)
  const [submittingReview, setSubmittingReview] = useState<boolean>(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const filteredReviews = reviews.filter((r) => {
    const matchesFilter = filterStatus === 'all' || r.status === filterStatus
    const matchesSearch =
      r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.identifiedDeficit.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const pendingCount = reviews.filter((r) => r.status === 'pending').length
  const remediationCount = reviews.filter((r) => r.status === 'needs_remediation').length
  const approvedCount = reviews.filter((r) => r.status === 'approved').length

  const handleOpenReviewModal = (item: ReviewItem) => {
    setActiveReview(item)
    setDecisionScore(item.scorePercent)
    setFeedbackNotes(
      item.status === 'needs_remediation'
        ? `Remediation required on ${item.identifiedDeficit}. Please complete the assigned targeted practice module.`
        : `Verified competency demonstrated in ${item.courseName}. Good analytical rigor.`
    )
  }

  const handleSaveReviewDecision = (newStatus: 'approved' | 'needs_remediation') => {
    if (!activeReview) return
    setSubmittingReview(true)

    setTimeout(() => {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === activeReview.id
            ? { ...r, status: newStatus, scorePercent: decisionScore }
            : r
        )
      )
      setSubmittingReview(false)
      setActiveReview(null)
      setToastMsg(`Submission by ${activeReview.studentName} marked as ${newStatus.replace('_', ' ').toUpperCase()}`)
      setTimeout(() => setToastMsg(null), 4000)
    }, 400)
  }

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>
            <span>Advisor Portal</span>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--empiria-primary)', fontWeight: 600 }}>Academic Review Queue</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            Academic & Diagnostic Review Queue
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', maxWidth: '720px' }}>
            Verify mentee diagnostic submissions, evaluate capability evidence, and approve developmental milestones with human-in-the-loop oversight.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {onNavigate && (
            <button
              className="btn btn-secondary"
              onClick={() => onNavigate('/mentor/improvement-plans')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FileCheck size={15} /> View Improvement Plans
            </button>
          )}
        </div>
      </div>

      {toastMsg && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{toastMsg}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="card" style={{ padding: '18px', margin: 0, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Pending Mentor Reviews
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {pendingCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Requires rubric scoring or sign-off
          </div>
        </div>

        <div className="card" style={{ padding: '18px', margin: 0, borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Flagged for Remediation
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {remediationCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Capability deficits below threshold
          </div>
        </div>

        <div className="card" style={{ padding: '18px', margin: 0, borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Approved This Term
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {approvedCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Verified competencies stamped
          </div>
        </div>

        <div className="card" style={{ padding: '18px', margin: 0, borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Avg. Review Latency
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            1.2 <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>days</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Target turnaround: &lt; 48 hours
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Reviews' },
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'needs_remediation', label: `Needs Remediation (${remediationCount})` },
            { id: 'approved', label: `Approved (${approvedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid',
                borderColor: filterStatus === tab.id ? 'var(--empiria-primary)' : 'var(--empiria-border)',
                background: filterStatus === tab.id ? 'var(--empiria-primary)' : 'transparent',
                color: filterStatus === tab.id ? '#ffffff' : 'var(--text-main)',
                fontSize: '13px',
                fontWeight: filterStatus === tab.id ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '260px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search mentee, course, or deficit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '34px', width: '100%', height: '38px', borderRadius: '10px', fontSize: '13px' }}
            />
          </div>
        </div>
      </div>

      {/* Review Submissions Table */}
      <div className="card" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--empiria-surface-muted)', borderBottom: '1px solid var(--empiria-border)' }}>
                <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-muted)' }}>Mentee Student</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-muted)' }}>Course & Milestone</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-muted)' }}>Identified Capability Deficit</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-muted)' }}>Score</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Review Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No reviews match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredReviews.map((rev) => (
                  <tr key={rev.id} style={{ borderBottom: '1px solid var(--empiria-border)' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{rev.studentName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {rev.studentEmail}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Submitted: {rev.submittedAt}
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        <span style={{ color: 'var(--empiria-primary)' }}>{rev.courseCode}</span> · {rev.courseName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {rev.assessmentType}
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', maxWidth: '300px' }}>
                      <div style={{ fontWeight: 600, color: '#b45309', fontSize: '12px' }}>
                        {rev.identifiedDeficit}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {rev.evidenceSnippet}
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '12px',
                          background:
                            rev.scorePercent >= 80 ? '#dcfce7' : rev.scorePercent >= 60 ? '#fef3c7' : '#fee2e2',
                          color:
                            rev.scorePercent >= 80 ? '#15803d' : rev.scorePercent >= 60 ? '#b45309' : '#b91c1c',
                        }}
                      >
                        {rev.scorePercent}%
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {rev.status === 'pending' && (
                        <span className="badge" style={{ background: '#fef3c7', color: '#b45309' }}>
                          <Clock size={11} style={{ marginRight: '4px' }} /> Pending Review
                        </span>
                      )}
                      {rev.status === 'approved' && (
                        <span className="badge" style={{ background: '#dcfce7', color: '#15803d' }}>
                          <CheckCircle2 size={11} style={{ marginRight: '4px' }} /> Approved
                        </span>
                      )}
                      {rev.status === 'needs_remediation' && (
                        <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                          <AlertTriangle size={11} style={{ marginRight: '4px' }} /> Needs Remediation
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleOpenReviewModal(rev)}
                          style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                          <ShieldCheck size={13} /> Review Submission
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Message Mentee"
                          onClick={() => {
                            if (onOpenConversation) {
                              onOpenConversation()
                            } else if (onNavigate) {
                              onNavigate('/mentor/messaging')
                            }
                          }}
                        >
                          <MessageSquare size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {activeReview && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              margin: 0,
              padding: '28px',
              borderRadius: '20px',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--empiria-border)', paddingBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#2563eb', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px' }}>
                  Rubric Assessment Review
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '6px 0 0 0', color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
                  {activeReview.studentName} — {activeReview.courseCode}
                </h3>
              </div>
              <button
                onClick={() => setActiveReview(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--empiria-surface-muted)', padding: '14px', borderRadius: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Assessment Submission
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {activeReview.courseName} ({activeReview.assessmentType})
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Submitted on {activeReview.submittedAt}
                </div>
              </div>

              <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '14px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b91c1c', fontWeight: 700, fontSize: '12px', marginBottom: '4px' }}>
                  <AlertCircle size={14} /> Diagnostic Deficit Flagged
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#991b1b' }}>
                  {activeReview.identifiedDeficit}
                </div>
                <div style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '6px', fontStyle: 'italic' }}>
                  "{activeReview.evidenceSnippet}"
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Evaluated Score (%): <span style={{ color: '#2563eb' }}>{decisionScore}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={decisionScore}
                  onChange={(e) => setDecisionScore(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--empiria-primary)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Mentor Advisory Feedback & Remediation Guidance
                </label>
                <textarea
                  rows={4}
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  className="form-input"
                  placeholder="Enter constructive advisory feedback for the mentee..."
                  style={{ borderRadius: '12px', padding: '12px', fontSize: '13px', lineHeight: 1.5 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveReview(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={() => handleSaveReviewDecision('needs_remediation')}
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <AlertTriangle size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Flag for Remediation Plan
                </button>
                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={() => handleSaveReviewDecision('approved')}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <CheckCircle2 size={14} />
                  Approve & Certify Milestone
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
