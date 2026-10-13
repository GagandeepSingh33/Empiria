import React from 'react'
import { Target, Search, Calendar, PlayCircle, Award, TrendingUp, Compass } from 'lucide-react'

export type WorkflowStage =
  | 'measure'
  | 'diagnose'
  | 'plan'
  | 'practise'
  | 'verify'
  | 'improve'

interface WorkflowTabsProps {
  currentStage: WorkflowStage
  onSelectStage: (stage: WorkflowStage) => void
}

const STAGES: { key: WorkflowStage; num: string; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'measure', num: '01', label: 'Measure', desc: 'Baseline Diagnostic', icon: <Target size={16} /> },
  { key: 'diagnose', num: '02', label: 'Diagnose', desc: 'Skill Deficit Analysis', icon: <Search size={16} /> },
  { key: 'plan', num: '03', label: 'Plan', desc: 'Curriculum & Milestones', icon: <Calendar size={16} /> },
  { key: 'practise', num: '04', label: 'Practise', desc: 'Evidence Submissions', icon: <PlayCircle size={16} /> },
  { key: 'verify', num: '05', label: 'Verify', desc: 'Assessor Validation', icon: <Award size={16} /> },
  { key: 'improve', num: '06', label: 'Improve', desc: 'Growth Trajectory', icon: <TrendingUp size={16} /> },
]

export const WorkflowTabs: React.FC<WorkflowTabsProps> = ({ currentStage, onSelectStage }) => {
  const activeStageObj = STAGES.find((s) => s.key === currentStage) || STAGES[0]

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Educational Explainer Banner (Helps users understand Empiria immediately) */}
      <div className="explainer-banner">
        <div className="explainer-icon-box">
          <Compass size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#2563eb', background: '#dbeafe', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
              Stage {activeStageObj.num} of 06
            </span>
            <div className="explainer-title" style={{ margin: 0 }}>
              {activeStageObj.label}: {activeStageObj.desc}
            </div>
          </div>
          <div className="explainer-text">
            The closed-loop Empiria development cycle continuously tracks, verifies, and accredits your technical mastery. Complete tasks at each stage to progress your capability score.
          </div>
        </div>
      </div>

      {/* Modern Pill Stepper Tabs */}
      <div className="workflow-nav-bar">
        <ul className="workflow-steps-list">
          {STAGES.map((s) => {
            const isActive = currentStage === s.key
            return (
              <li
                key={s.key}
                className={`workflow-step-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectStage(s.key)}
              >
                <span className="step-num-bubble">{s.num}</span>
                {s.icon}
                <span style={{ fontWeight: 700 }}>{s.label}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
