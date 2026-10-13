import React, { useState } from 'react'
import {
  Clock,
  Calendar,
  CheckCircle2,
  Users,
  Video,
  MapPin,
  Save,
  Plus,
  Trash2,
  ChevronRight,
  TrendingUp,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import type { Account, ActiveMembership } from '../../types'

interface TimeSlot {
  id: string
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'
  startTime: string
  endTime: string
  modality: 'Virtual (Google Meet)' | 'In-Person (Office)' | 'Hybrid'
}

interface MentorWorkloadViewProps {
  account?: Account
  activeMembership?: ActiveMembership | null
  onNavigate?: (path: string) => void
}

export const MentorWorkloadView: React.FC<MentorWorkloadViewProps> = ({
  account,
  activeMembership,
  onNavigate,
}) => {
  // Capacity and status settings
  const [isAcceptingMentees, setIsAcceptingMentees] = useState<boolean>(true)
  const [maxPrimaryCapacity, setMaxPrimaryCapacity] = useState<number>(15)
  const [maxSubjectCapacity, setMaxSubjectCapacity] = useState<number>(10)
  const [defaultDuration, setDefaultDuration] = useState<string>('45 min')
  const [bufferTime, setBufferTime] = useState<string>('15 min')
  const [officeLocation, setOfficeLocation] = useState<string>('Turing Hall, Academic Block C, Room 412')
  const [meetingUrl, setMeetingUrl] = useState<string>('https://meet.google.com/apex-verma-mentorship')
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false)

  // Availability schedule slots
  const [slots, setSlots] = useState<TimeSlot[]>([
    {
      id: 'slot-1',
      day: 'Tuesday',
      startTime: '15:00',
      endTime: '17:30',
      modality: 'Hybrid',
    },
    {
      id: 'slot-2',
      day: 'Thursday',
      startTime: '15:00',
      endTime: '17:30',
      modality: 'Hybrid',
    },
    {
      id: 'slot-3',
      day: 'Wednesday',
      startTime: '10:00',
      endTime: '12:00',
      modality: 'Virtual (Google Meet)',
    },
  ])

  // New slot form state
  const [newDay, setNewDay] = useState<TimeSlot['day']>('Monday')
  const [newStart, setNewStart] = useState<string>('14:00')
  const [newEnd, setNewEnd] = useState<string>('16:00')
  const [newModality, setNewModality] = useState<TimeSlot['modality']>('Hybrid')
  const [showAddSlot, setShowAddSlot] = useState<boolean>(false)

  // Current active caseload counts (from DB / active assignments)
  const currentPrimaryCount = 1
  const currentSubjectCount = 2
  const totalHoursPerWeek = 7.0

  const handleAddSlot = () => {
    const newSlotItem: TimeSlot = {
      id: `slot-${Date.now()}`,
      day: newDay,
      startTime: newStart,
      endTime: newEnd,
      modality: newModality,
    }
    setSlots([...slots, newSlotItem])
    setShowAddSlot(false)
  }

  const handleRemoveSlot = (id: string) => {
    setSlots(slots.filter((s) => s.id !== id))
  }

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 4000)
  }

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* Editorial Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>
            <span>{activeMembership?.institution_name || 'Apex Institute of Technology'}</span>
            <ChevronRight size={14} />
            <span>{account?.display_name || account?.first_name || 'Dr. Rajesh Verma'}</span>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--empiria-primary)', fontWeight: 600 }}>Availability & Workload Profile</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
            Faculty Availability & Workload Profile
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', maxWidth: '780px' }}>
            Configure your weekly advisory calendar, office hours, and caseload capacity limits for Hungarian allocation optimization.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {onNavigate && (
            <button
              className="btn btn-secondary"
              onClick={() => onNavigate('/mentor/assigned-students')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Users size={15} /> View Assigned Students
            </button>
          )}
        </div>
      </div>

      {savedSuccess && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '14px 18px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} />
          <span style={{ fontSize: '14px', fontWeight: 600 }}>
            Availability schedule and workload capacity limits updated successfully.
          </span>
        </div>
      )}

      {/* KPI Workload Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {/* Metric 1: Primary Caseload */}
        <div className="card" style={{ padding: '20px', margin: 0, borderLeft: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Primary Mentee Caseload
            </span>
            <Users size={18} style={{ color: '#2563eb' }} />
          </div>
          <div style={{ fontSize: '30px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {currentPrimaryCount} <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-muted)' }}>/ {maxPrimaryCapacity}</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${(currentPrimaryCount / maxPrimaryCapacity) * 100}%`,
                  height: '100%',
                  background: '#2563eb',
                  borderRadius: '3px',
                }}
              />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {maxPrimaryCapacity - currentPrimaryCount} allocation slots open
            </div>
          </div>
        </div>

        {/* Metric 2: Subject Mentee Caseload */}
        <div className="card" style={{ padding: '20px', margin: 0, borderLeft: '4px solid #059669' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Subject Specialist Load
            </span>
            <TrendingUp size={18} style={{ color: '#059669' }} />
          </div>
          <div style={{ fontSize: '30px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {currentSubjectCount} <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-muted)' }}>/ {maxSubjectCapacity}</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${(currentSubjectCount / maxSubjectCapacity) * 100}%`,
                  height: '100%',
                  background: '#059669',
                  borderRadius: '3px',
                }}
              />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {maxSubjectCapacity - currentSubjectCount} subject slots open
            </div>
          </div>
        </div>

        {/* Metric 3: Weekly Commitment */}
        <div className="card" style={{ padding: '20px', margin: 0, borderLeft: '4px solid #7c3aed' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Weekly Advisory Hours
            </span>
            <Clock size={18} style={{ color: '#7c3aed' }} />
          </div>
          <div style={{ fontSize: '30px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>
            {totalHoursPerWeek} <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-muted)' }}>hrs / wk</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Across {slots.length} scheduled office hours windows
          </div>
        </div>

        {/* Metric 4: Algorithm Intake Status */}
        <div className="card" style={{ padding: '20px', margin: 0, borderLeft: `4px solid ${isAcceptingMentees ? '#10b981' : '#f59e0b'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Intake Matching Status
            </span>
            <Calendar size={18} style={{ color: isAcceptingMentees ? '#10b981' : '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: isAcceptingMentees ? '#15803d' : '#b45309', fontFamily: 'var(--font-display)', marginTop: '4px' }}>
            {isAcceptingMentees ? 'Accepting Mentees' : 'Intake Paused'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            {isAcceptingMentees ? 'Eligible for Hungarian allocation' : 'Temporarily excluded from algorithm'}
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.1fr', gap: '24px' }}>
        {/* Left Column: Weekly Advising Slots */}
        <div>
          <div className="card" style={{ margin: 0, padding: '24px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--empiria-border)' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 2px 0', fontFamily: 'var(--font-display)' }}>
                  Weekly Office Hours & Advising Windows
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                  Active time slots when students can schedule advisory syncs or code reviews.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddSlot(!showAddSlot)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} /> Add Window
              </button>
            </div>

            {/* Add Slot Expandable Form */}
            {showAddSlot && (
              <div
                style={{
                  background: 'var(--empiria-surface-muted)',
                  border: '1px solid var(--empiria-border)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px',
                }}
              >
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 12px 0' }}>
                  Add Advising Time Window
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Day of the Week
                    </label>
                    <select
                      value={newDay}
                      onChange={(e) => setNewDay(e.target.value as any)}
                      className="form-select"
                      style={{ width: '100%', borderRadius: '10px' }}
                    >
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Session Modality
                    </label>
                    <select
                      value={newModality}
                      onChange={(e) => setNewModality(e.target.value as any)}
                      className="form-select"
                      style={{ width: '100%', borderRadius: '10px' }}
                    >
                      <option value="Hybrid">Hybrid (In-Person / Virtual)</option>
                      <option value="In-Person (Office)">In-Person (Office 412)</option>
                      <option value="Virtual (Google Meet)">Virtual (Google Meet)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={newStart}
                      onChange={(e) => setNewStart(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', borderRadius: '10px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      End Time
                    </label>
                    <input
                      type="time"
                      value={newEnd}
                      onChange={(e) => setNewEnd(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', borderRadius: '10px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowAddSlot(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleAddSlot}
                  >
                    Confirm & Add
                  </button>
                </div>
              </div>
            )}

            {/* Slots List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {slots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No office hours windows configured. Click "Add Window" to create advising availability.
                </div>
              ) : (
                slots.map((slot) => (
                  <div
                    key={slot.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: '12px',
                      background: '#ffffff',
                      border: '1px solid var(--empiria-border)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: '#eff6ff',
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '13px',
                        }}
                      >
                        {slot.day.slice(0, 3)}
                      </div>

                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                          {slot.day}s · {slot.startTime} – {slot.endTime}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            className="badge"
                            style={{
                              background: slot.modality.includes('Virtual') ? '#ecfdf5' : '#eff6ff',
                              color: slot.modality.includes('Virtual') ? '#059669' : '#2563eb',
                              fontSize: '11px',
                              padding: '1px 7px',
                            }}
                          >
                            {slot.modality}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(slot.id)}
                      title="Remove time window"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '6px',
                        transition: 'color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Workload Capacity & Policy Controls */}
        <div>
          <form onSubmit={handleSaveSettings}>
            <div className="card" style={{ margin: 0, padding: '24px', borderRadius: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 16px 0', fontFamily: 'var(--font-display)' }}>
                Caseload Limits & Policy
              </h2>

              {/* Intake Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: isAcceptingMentees ? '#f0fdf4' : '#fffbeb',
                  border: `1px solid ${isAcceptingMentees ? '#bbf7d0' : '#fde68a'}`,
                  marginBottom: '20px',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                    Accepting New Mentees
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Hungarian matching algorithm includes your profile
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAcceptingMentees(!isAcceptingMentees)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: isAcceptingMentees ? '#16a34a' : '#d97706',
                    padding: 0,
                    display: 'flex',
                  }}
                >
                  {isAcceptingMentees ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                </button>
              </div>

              {/* Max Primary Capacity Slider */}
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, margin: 0 }}>
                    Max Primary Mentee Capacity
                  </label>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>
                    {maxPrimaryCapacity} students
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={maxPrimaryCapacity}
                  onChange={(e) => setMaxPrimaryCapacity(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--empiria-primary)' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Current active load: {currentPrimaryCount} ({Math.round((currentPrimaryCount / maxPrimaryCapacity) * 100)}% utilized)
                </span>
              </div>

              {/* Max Subject Capacity Slider */}
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, margin: 0 }}>
                    Max Subject Specialist Mentee Capacity
                  </label>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                    {maxSubjectCapacity} students
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={maxSubjectCapacity}
                  onChange={(e) => setMaxSubjectCapacity(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#059669' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Current active load: {currentSubjectCount} ({Math.round((currentSubjectCount / maxSubjectCapacity) * 100)}% utilized)
                </span>
              </div>

              {/* Session Duration & Buffer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                    Default Duration
                  </label>
                  <select
                    className="form-select"
                    value={defaultDuration}
                    onChange={(e) => setDefaultDuration(e.target.value)}
                    style={{ width: '100%', borderRadius: '10px' }}
                  >
                    <option value="30 min">30 minutes</option>
                    <option value="45 min">45 minutes</option>
                    <option value="60 min">60 minutes</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                    Buffer Between
                  </label>
                  <select
                    className="form-select"
                    value={bufferTime}
                    onChange={(e) => setBufferTime(e.target.value)}
                    style={{ width: '100%', borderRadius: '10px' }}
                  >
                    <option value="10 min">10 minutes</option>
                    <option value="15 min">15 minutes</option>
                    <option value="30 min">30 minutes</option>
                  </select>
                </div>
              </div>

              {/* Location and URL */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                  Physical Office Room
                </label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={officeLocation}
                    onChange={(e) => setOfficeLocation(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '34px', width: '100%', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '22px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                  Virtual Advising Link
                </label>
                <div style={{ position: 'relative' }}>
                  <Video size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="url"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '34px', width: '100%', borderRadius: '10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '12px' }}
              >
                <Save size={16} /> Save Workload Profile
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
