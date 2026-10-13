import React, { useState } from 'react'
import {
  CheckCircle2,
  Save,
  ChevronRight,
} from 'lucide-react'
import type { Account, ActiveMembership } from '../../types'

interface MentorProfileViewProps {
  account?: Account
  activeMembership?: ActiveMembership | null
}

export const MentorProfileView: React.FC<MentorProfileViewProps> = ({
  account,
  activeMembership,
}) => {
  const [fullName, setFullName] = useState<string>('Dr. Rajesh Verma')
  const [academicTitle, setAcademicTitle] = useState<string>('Professor & Senior Faculty Advisor')
  const [department, setDepartment] = useState<string>('Department of Computer Science & Engineering')
  const [bio, setBio] = useState<string>(
    '20+ years of teaching and research in distributed systems, high-performance database architectures, and algorithm design. Passionate about continuous capability coaching, evidence-based student remediation, and career trajectory stewardship.'
  )
  const [officeLocation, setOfficeLocation] = useState<string>('Turing Hall, Academic Block C, Room 412')
  const [meetingUrl, setMeetingUrl] = useState<string>('https://meet.google.com/apex-verma-mentorship')
  const [officeHours, setOfficeHours] = useState<string>('Tuesdays & Thursdays: 3:00 PM – 5:30 PM IST')
  const [maxCaseload, setMaxCaseload] = useState<number>(15)
  const [specializations, setSpecializations] = useState<string[]>([
    'Distributed Systems & Cloud Architecture',
    'Data Structures & Algorithm Optimization',
    'PostgreSQL Internals & Query Planning',
    'Graduate School & Industry Career Guidance',
  ])
  const [newTag, setNewTag] = useState<string>('')
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false)

  const handleAddTag = () => {
    if (newTag.trim() && !specializations.includes(newTag.trim())) {
      setSpecializations([...specializations, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setSpecializations(specializations.filter((t) => t !== tag))
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 4000)
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>
            <span>Advisor Portal</span>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--empiria-primary)', fontWeight: 600 }}>Profile & Advising Settings</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            Mentor Profile & Advisory Settings
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
            Manage your faculty biography, office hours, advising links, and mentee capacity configurations.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '14px 18px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} />
          <span style={{ fontSize: '14px', fontWeight: 600 }}>
            Mentor profile and advising settings updated successfully.
          </span>
        </div>
      )}

      {/* Main Profile Card */}
      <div
        className="card"
        style={{
          margin: '0 0 24px 0',
          padding: '28px',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          background: 'linear-gradient(135deg, rgba(37,99,235,0.04) 0%, rgba(99,102,241,0.06) 100%)',
          border: '1px solid var(--empiria-border)',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '22px',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            fontWeight: 800,
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)',
            flexShrink: 0,
          }}
        >
          RV
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#2563eb', background: '#dbeafe', padding: '2px 8px', borderRadius: '6px' }}>
              {activeMembership?.institution_name || 'Empiria Institution'} · Faculty Mentor
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Empiria Verified Advisor
            </span>
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 4px 0', fontFamily: 'var(--font-display)' }}>
            {fullName}
          </h2>

          <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span>{academicTitle}</span>
            <span>·</span>
            <span>{department}</span>
            <span>·</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{account?.email || 'mentor@apex.edu'}</span>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          {/* Identity Fields */}
          <div className="card" style={{ margin: 0, padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 16px 0', fontFamily: 'var(--font-display)' }}>
              Faculty Identity & Affiliation
            </h3>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                Full Name with Title
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="form-input"
                style={{ width: '100%', borderRadius: '10px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                Academic Title & Role
              </label>
              <input
                type="text"
                value={academicTitle}
                onChange={(e) => setAcademicTitle(e.target.value)}
                className="form-input"
                style={{ width: '100%', borderRadius: '10px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                Academic Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="form-input"
                style={{ width: '100%', borderRadius: '10px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                Primary Institutional Email
              </label>
              <input
                type="email"
                disabled
                value={account?.email || 'mentor@apex.edu'}
                className="form-input"
                style={{ width: '100%', borderRadius: '10px', background: 'var(--empiria-surface-muted)', color: 'var(--text-muted)' }}
              />
            </div>
          </div>

          {/* Advising & Office Hours */}
          <div className="card" style={{ margin: 0, padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 16px 0', fontFamily: 'var(--font-display)' }}>
              Advising Availability & Location
            </h3>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                Weekly Office Hours
              </label>
              <input
                type="text"
                value={officeHours}
                onChange={(e) => setOfficeHours(e.target.value)}
                className="form-input"
                placeholder="e.g. Tuesdays & Thursdays: 3:00 PM – 5:30 PM"
                style={{ width: '100%', borderRadius: '10px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                Physical Office Location
              </label>
              <input
                type="text"
                value={officeLocation}
                onChange={(e) => setOfficeLocation(e.target.value)}
                className="form-input"
                placeholder="Building, Floor, Room Number"
                style={{ width: '100%', borderRadius: '10px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                Virtual Meeting Room (Google Meet / Zoom)
              </label>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                className="form-input"
                placeholder="https://meet.google.com/..."
                style={{ width: '100%', borderRadius: '10px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                Maximum Mentee Caseload Capacity
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={maxCaseload}
                onChange={(e) => setMaxCaseload(Number(e.target.value))}
                className="form-input"
                style={{ width: '100%', borderRadius: '10px' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Used by the institutional Hungarian matching algorithm for load balancing.
              </span>
            </div>
          </div>
        </div>

        {/* Bio & Philosophy */}
        <div className="card" style={{ margin: '0 0 24px 0', padding: '24px', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 8px 0', fontFamily: 'var(--font-display)' }}>
            Advising Philosophy & Bio
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 14px 0' }}>
            This description appears on your mentor profile and is shown to your assigned mentees when reviewing their advisor background.
          </p>

          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="form-input"
            style={{ width: '100%', borderRadius: '12px', padding: '12px', fontSize: '13px', lineHeight: 1.6 }}
          />
        </div>

        {/* Areas of Expertise */}
        <div className="card" style={{ margin: '0 0 24px 0', padding: '24px', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 8px 0', fontFamily: 'var(--font-display)' }}>
            Specializations & Subject Competencies
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 14px 0' }}>
            Topics where you provide subject-specific mentorship and diagnostic rubric grading.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {specializations.map((spec) => (
              <span
                key={spec}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                  borderRadius: 'var(--radius-full)',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <span>{spec}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(spec)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#1d4ed8',
                    cursor: 'pointer',
                    fontSize: '14px',
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', maxWidth: '480px' }}>
            <input
              type="text"
              placeholder="Add area of expertise..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="form-input"
              style={{ borderRadius: '10px', fontSize: '13px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAddTag}
              style={{ flexShrink: 0 }}
            >
              Add Tag
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', fontSize: '14px' }}
          >
            <Save size={16} /> Save Profile & Settings
          </button>
        </div>
      </form>
    </div>
  )
}
