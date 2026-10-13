import React, { useState } from 'react'
import {
  CheckCircle2,
  Plus,
  Search,
  ChevronRight,
  X,
  MessageSquare,
} from 'lucide-react'

interface PlanTask {
  id: string
  title: string
  competencyDomain: string
  status: 'completed' | 'in_progress' | 'pending'
  assignedDate: string
  dueDate: string
}

interface ImprovementPlan {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  title: string
  focusArea: string
  status: 'active' | 'behind_schedule' | 'completed'
  progressPercent: number
  startDate: string
  targetEndDate: string
  mentorNotes: string
  tasks: PlanTask[]
}

const INITIAL_PLANS: ImprovementPlan[] = [
  {
    id: 'plan-101',
    studentId: 'stu-aarav-01',
    studentName: 'Aarav Sharma',
    studentEmail: 'student@apex.edu',
    title: 'Data Structures: Graph Traversals & Adjacency Optimization',
    focusArea: 'Algorithms & Data Structures (CS201)',
    status: 'active',
    progressPercent: 65,
    startDate: 'Oct 01, 2026',
    targetEndDate: 'Oct 28, 2026',
    mentorNotes: 'Focused on BFS/DFS cycle detection algorithms and complexity trade-offs between Matrix vs List representations.',
    tasks: [
      {
        id: 't-1',
        title: 'Complete LeetCode Graph Cycle Detection Pattern Set',
        competencyDomain: 'Algorithmic Problem Solving',
        status: 'completed',
        assignedDate: 'Oct 02, 2026',
        dueDate: 'Oct 08, 2026',
      },
      {
        id: 't-2',
        title: 'Implement Adjacency List BFS with visited boolean bitmask',
        competencyDomain: 'Code Implementation Rigor',
        status: 'completed',
        assignedDate: 'Oct 08, 2026',
        dueDate: 'Oct 14, 2026',
      },
      {
        id: 't-3',
        title: 'Dijkstra Shortest Path with Priority Queue Benchmark',
        competencyDomain: 'Algorithmic Optimization',
        status: 'in_progress',
        assignedDate: 'Oct 14, 2026',
        dueDate: 'Oct 22, 2026',
      },
      {
        id: 't-4',
        title: 'Oral Defense & Code Walkthrough with Mentor',
        competencyDomain: 'Conceptual Communication',
        status: 'pending',
        assignedDate: 'Oct 15, 2026',
        dueDate: 'Oct 28, 2026',
      },
    ],
  },
  {
    id: 'plan-102',
    studentId: 'stu-priya-02',
    studentName: 'Priya Nair',
    studentEmail: 'student2@apex.edu',
    title: 'Discrete Mathematics: Predicate Induction & Set Theory Proofs',
    focusArea: 'Mathematical Foundations (CS202)',
    status: 'behind_schedule',
    progressPercent: 30,
    startDate: 'Sep 25, 2026',
    targetEndDate: 'Oct 24, 2026',
    mentorNotes: 'Remediation initiated following diagnostic assessment deficit. Focus on step-by-step inductive hypothesis formulation.',
    tasks: [
      {
        id: 't-21',
        title: 'Review Well-Ordering Principle & Weak vs Strong Induction Notes',
        competencyDomain: 'Theoretical Grounding',
        status: 'completed',
        assignedDate: 'Sep 26, 2026',
        dueDate: 'Oct 02, 2026',
      },
      {
        id: 't-22',
        title: 'Solve 10 Recurrence Relation Induction Problem Sets',
        competencyDomain: 'Analytical Proof Writing',
        status: 'in_progress',
        assignedDate: 'Oct 03, 2026',
        dueDate: 'Oct 12, 2026',
      },
      {
        id: 't-23',
        title: 'Peer Tutoring Session via Skill Swap on Logic Proofs',
        competencyDomain: 'Collaborative Learning',
        status: 'pending',
        assignedDate: 'Oct 12, 2026',
        dueDate: 'Oct 20, 2026',
      },
    ],
  },
  {
    id: 'plan-103',
    studentId: 'stu-aarav-01',
    studentName: 'Aarav Sharma',
    studentEmail: 'student@apex.edu',
    title: 'Relational Database: Query Execution Plans & B-Tree Indexing',
    focusArea: 'Database Systems (CS304)',
    status: 'completed',
    progressPercent: 100,
    startDate: 'Sep 10, 2026',
    targetEndDate: 'Oct 05, 2026',
    mentorNotes: 'Successfully completed query performance tuning sprint. Verified index selectivity benchmark in PostgreSQL lab.',
    tasks: [
      {
        id: 't-31',
        title: 'Analyze EXPLAIN ANALYZE on unindexed million-row table',
        competencyDomain: 'Query Optimization',
        status: 'completed',
        assignedDate: 'Sep 12, 2026',
        dueDate: 'Sep 18, 2026',
      },
      {
        id: 't-32',
        title: 'Design Composite B-Tree Index for range predicate workload',
        competencyDomain: 'Storage & Index Architecture',
        status: 'completed',
        assignedDate: 'Sep 19, 2026',
        dueDate: 'Sep 28, 2026',
      },
      {
        id: 't-33',
        title: 'Produce Diagnostic Lab Report with execution time curves',
        competencyDomain: 'Technical Documentation',
        status: 'completed',
        assignedDate: 'Sep 29, 2026',
        dueDate: 'Oct 05, 2026',
      },
    ],
  },
]

interface MentorImprovementPlansViewProps {
  onNavigate?: (path: string) => void
  onOpenConversation?: (conversationId?: string) => void
}

export const MentorImprovementPlansView: React.FC<MentorImprovementPlansViewProps> = ({
  onNavigate,
  onOpenConversation,
}) => {
  const [plans, setPlans] = useState<ImprovementPlan[]>(INITIAL_PLANS)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>('plan-101')
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState<boolean>(false)

  // New plan form
  const [newStudentName, setNewStudentName] = useState<string>('Aarav Sharma (student@apex.edu)')
  const [newTitle, setNewTitle] = useState<string>('')
  const [newFocusArea, setNewFocusArea] = useState<string>('Computer Science')
  const [newTargetDate, setNewTargetDate] = useState<string>('2026-11-15')
  const [newNotes, setNewNotes] = useState<string>('')

  const filteredPlans = plans.filter((p) => {
    const matchesFilter = filterStatus === 'all' || p.status === filterStatus
    const matchesSearch =
      p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.focusArea.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const newPlan: ImprovementPlan = {
      id: `plan-${Date.now()}`,
      studentId: newStudentName.includes('Aarav') ? 'stu-aarav-01' : 'stu-priya-02',
      studentName: newStudentName.includes('Aarav') ? 'Aarav Sharma' : 'Priya Nair',
      studentEmail: newStudentName.includes('Aarav') ? 'student@apex.edu' : 'student2@apex.edu',
      title: newTitle,
      focusArea: newFocusArea,
      status: 'active',
      progressPercent: 0,
      startDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      targetEndDate: newTargetDate,
      mentorNotes: newNotes || 'Targeted personal development plan configured by faculty mentor.',
      tasks: [
        {
          id: `t-${Date.now()}-1`,
          title: `Diagnostic Review & Concept Baseline in ${newFocusArea}`,
          competencyDomain: 'Foundational Mastery',
          status: 'in_progress',
          assignedDate: 'Today',
          dueDate: newTargetDate,
        },
      ],
    }

    setPlans([newPlan, ...plans])
    setExpandedPlanId(newPlan.id)
    setIsNewPlanModalOpen(false)
    setNewTitle('')
    setNewNotes('')
  }

  const handleToggleTaskStatus = (planId: string, taskId: string) => {
    setPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== planId) return plan
        const updatedTasks = plan.tasks.map((task) => {
          if (task.id !== taskId) return task
          const nextStatus: 'completed' | 'in_progress' | 'pending' =
            task.status === 'completed'
              ? 'in_progress'
              : task.status === 'in_progress'
              ? 'completed'
              : 'in_progress'
          return { ...task, status: nextStatus }
        })
        const completedCount = updatedTasks.filter((t) => t.status === 'completed').length
        const progressPercent = Math.round((completedCount / updatedTasks.length) * 100)
        const status = progressPercent === 100 ? 'completed' : plan.status
        return { ...plan, tasks: updatedTasks, progressPercent, status }
      })
    )
  }

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* Editorial Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>
            <span>Advisor Portal</span>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--empiria-primary)', fontWeight: 600 }}>Interventions & Plans</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            Mentee Improvement Plans & Targeted Interventions
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', maxWidth: '720px' }}>
            Prescribe targeted remediation milestones, monitor competency task completion, and evaluate student capability recovery trajectories.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => setIsNewPlanModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Create Improvement Plan
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="card" style={{ padding: '18px', margin: 0, borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Active Development Plans
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {plans.filter((p) => p.status === 'active').length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Currently in progress across cohort
          </div>
        </div>

        <div className="card" style={{ padding: '18px', margin: 0, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Behind Schedule
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {plans.filter((p) => p.status === 'behind_schedule').length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Overdue tasks requiring mentor nudge
          </div>
        </div>

        <div className="card" style={{ padding: '18px', margin: 0, borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Completed & Verified
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {plans.filter((p) => p.status === 'completed').length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Successful remediation outcomes
          </div>
        </div>

        <div className="card" style={{ padding: '18px', margin: 0, borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Average Plan Completion
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {Math.round(plans.reduce((acc, p) => acc + p.progressPercent, 0) / (plans.length || 1))}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Cohort milestone completion rate
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Plans' },
            { id: 'active', label: 'Active' },
            { id: 'behind_schedule', label: 'Behind Schedule' },
            { id: 'completed', label: 'Completed' },
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

        <div style={{ position: 'relative', minWidth: '260px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search plans, mentee, or topic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '34px', width: '100%', height: '38px', borderRadius: '10px', fontSize: '13px' }}
          />
        </div>
      </div>

      {/* Plan Accordions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredPlans.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No improvement plans match the selected criteria.
          </div>
        ) : (
          filteredPlans.map((plan) => {
            const isExpanded = expandedPlanId === plan.id
            return (
              <div
                key={plan.id}
                className="card"
                style={{
                  margin: 0,
                  padding: '22px',
                  borderRadius: '16px',
                  border: isExpanded ? '1px solid var(--empiria-primary)' : '1px solid var(--empiria-border)',
                  boxShadow: isExpanded ? '0 4px 20px rgba(37, 99, 235, 0.08)' : 'var(--shadow-sm)',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Plan Header Summary */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span
                        className="badge"
                        style={{
                          background:
                            plan.status === 'completed'
                              ? '#dcfce7'
                              : plan.status === 'behind_schedule'
                              ? '#fee2e2'
                              : '#dbeafe',
                          color:
                            plan.status === 'completed'
                              ? '#15803d'
                              : plan.status === 'behind_schedule'
                              ? '#b91c1c'
                              : '#1d4ed8',
                          fontWeight: 700,
                          fontSize: '11px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {plan.status.replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Target: {plan.targetEndDate}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 4px 0', fontFamily: 'var(--font-display)' }}>
                      {plan.title}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        Mentee: {plan.studentName}
                      </span>
                      <span>·</span>
                      <span>{plan.focusArea}</span>
                    </div>
                  </div>

                  {/* Progress Bar & Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ minWidth: '160px', textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                        {plan.progressPercent}% Complete
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${plan.progressPercent}%`,
                            height: '100%',
                            background:
                              plan.progressPercent === 100
                                ? '#10b981'
                                : plan.status === 'behind_schedule'
                                ? '#ef4444'
                                : '#2563eb',
                            borderRadius: '4px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        title="Message Mentee"
                        onClick={() => {
                          if (onOpenConversation) onOpenConversation()
                          else if (onNavigate) onNavigate('/mentor/messaging')
                        }}
                      >
                        <MessageSquare size={14} />
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span>{isExpanded ? 'Collapse' : 'Tasks & Milestones'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid var(--empiria-border)' }}>
                    <div style={{ background: 'var(--empiria-surface-muted)', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      <strong style={{ color: 'var(--text-main)' }}>Mentor Advisory Guidance: </strong>
                      {plan.mentorNotes}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', margin: 0 }}>
                        Remediation Milestone Tasks ({plan.tasks.filter((t) => t.status === 'completed').length}/{plan.tasks.length} Completed)
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Click a task checkmark to toggle status
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {plan.tasks.map((task) => (
                        <div
                          key={task.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: task.status === 'completed' ? '#f0fdf4' : '#ffffff',
                            border: '1px solid',
                            borderColor: task.status === 'completed' ? '#bbf7d0' : 'var(--empiria-border)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleTaskStatus(plan.id, task.id)}
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '6px',
                                border: '1px solid',
                                borderColor: task.status === 'completed' ? '#10b981' : '#cbd5e1',
                                background: task.status === 'completed' ? '#10b981' : 'transparent',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                flexShrink: 0,
                              }}
                            >
                              {task.status === 'completed' && <CheckCircle2 size={15} />}
                            </button>

                            <div>
                              <div
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: 'var(--text-main)',
                                  textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                                }}
                              >
                                {task.title}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Competency Domain: {task.competencyDomain} · Due: {task.dueDate}
                              </div>
                            </div>
                          </div>

                          <div>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background:
                                  task.status === 'completed'
                                    ? '#dcfce7'
                                    : task.status === 'in_progress'
                                    ? '#dbeafe'
                                    : '#f1f5f9',
                                color:
                                  task.status === 'completed'
                                    ? '#15803d'
                                    : task.status === 'in_progress'
                                    ? '#1e40af'
                                    : '#64748b',
                              }}
                            >
                              {task.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* New Improvement Plan Modal */}
      {isNewPlanModalOpen && (
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
              maxWidth: '600px',
              margin: 0,
              padding: '28px',
              borderRadius: '20px',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--empiria-border)', paddingBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#2563eb', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px' }}>
                  Capability Remediation
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '6px 0 0 0', color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
                  Create Improvement Plan
                </h3>
              </div>
              <button
                onClick={() => setIsNewPlanModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePlan}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Assigned Mentee Student
                </label>
                <select
                  className="form-select"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  style={{ width: '100%', borderRadius: '12px' }}
                >
                  <option value="Aarav Sharma (student@apex.edu)">Aarav Sharma — B.Tech CSE (Year 3)</option>
                  <option value="Priya Nair (student2@apex.edu)">Priya Nair — B.Tech CSE (Year 2)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Plan Title & Objective
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operating Systems: Multi-threading & Semaphore Mastery"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', borderRadius: '12px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                    Subject Focus Area
                  </label>
                  <input
                    type="text"
                    value={newFocusArea}
                    onChange={(e) => setNewFocusArea(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', borderRadius: '12px' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', borderRadius: '12px' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '22px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Mentor Guidance & Strategic Remediation Notes
                </label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="form-input"
                  placeholder="Outline the diagnostic deficit context and recommended milestones..."
                  style={{ width: '100%', borderRadius: '12px', padding: '10px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsNewPlanModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save & Launch Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
