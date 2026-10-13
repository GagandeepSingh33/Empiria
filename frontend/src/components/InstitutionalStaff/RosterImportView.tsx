import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import type { StudentProfile, ImportJob, ImportPreview } from '../../types'
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Download,
  FileSpreadsheet,
  Calendar,
  Award,
  Users,
  AlertTriangle,
  Info,
} from 'lucide-react'

type ImportType = 'students' | 'attendance' | 'marks' | 'enrollments'

export const RosterImportView: React.FC = () => {
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [dataHealth, setDataHealth] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // CSV Import State
  const [importType, setImportType] = useState<ImportType>('students')
  const [importing, setImporting] = useState<boolean>(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [allowPartial, setAllowPartial] = useState<boolean>(false)
  const [activeJob, setActiveJob] = useState<ImportJob | null>(null)
  const [previewData, setPreviewData] = useState<ImportPreview | null>(null)
  const [commitSuccessMsg, setCommitSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      setLoading(true)
      const [stuData, healthData] = await Promise.all([
        api.listStudents(),
        api.getAcademicDataHealth().catch(() => null),
      ])
      setStudents(stuData)
      setDataHealth(healthData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('Only CSV (.csv) files are supported.')
        setSelectedFile(null)
        return
      }
      setSelectedFile(file)
      setError(null)
      setCommitSuccessMsg(null)
      setActiveJob(null)
      setPreviewData(null)
    }
  }

  const handleDownloadTemplate = (type: ImportType) => {
    window.open(`/internal/v1/imports/templates/${type}`, '_blank')
  }

  const handleUploadAndValidate = async () => {
    if (!selectedFile) {
      setError('Please choose a CSV file first.')
      return
    }

    try {
      setImporting(true)
      setError(null)
      setCommitSuccessMsg(null)

      // 1. Create Job with unique idempotency key
      const idempotencyKey = `job-${importType}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      const job = await api.createImportJob(idempotencyKey, importType)

      // 2. Upload and validate file (dry-run isolation mode)
      const validatedJob = await api.validateImportCsv(job.id, selectedFile)
      setActiveJob(validatedJob)

      // 3. Fetch Preview
      const prev = await api.getImportPreview(job.id)
      setPreviewData(prev)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  const handleCommitImport = async () => {
    if (!activeJob) return
    try {
      setImporting(true)
      setError(null)
      const res = await api.commitImportJob(activeJob.id, allowPartial)
      const count = res.created_students || res.created_records || res.created_results || res.created_enrollments || res.committed_rows || 0
      setCommitSuccessMsg(`Import successfully committed! ${count} records processed with full audit logging.`)
      setActiveJob(null)
      setPreviewData(null)
      setSelectedFile(null)
      await loadAll()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  const getImportDescription = (type: ImportType) => {
    switch (type) {
      case 'students':
        return {
          title: 'Student Roster Import',
          headers: 'student_identifier, first_name, last_name, email, cohort_name',
          desc: 'Creates student profiles and assigns cohort memberships. Existing students are idempotently updated.',
        }
      case 'attendance':
        return {
          title: 'Class Attendance Import',
          headers: 'student_identifier (or email), course_code, session_date (YYYY-MM-DD), status (present/absent/late/excused)',
          desc: 'Stages session attendance. Validates student enrollment and upserts attendance records.',
        }
      case 'marks':
        return {
          title: 'Assessment Marks & Grades Import',
          headers: 'student_identifier (or email), course_code, assessment_name, score, status (draft/submitted/released)',
          desc: 'Stages assessment component results. Unreleased marks remain NULL in student views.',
        }
      case 'enrollments':
        return {
          title: 'Course Enrollments Import',
          headers: 'student_identifier, course_code, section_identifier, enrollment_status',
          desc: 'Enrolls students into active course offerings.',
        }
    }
  }

  const currentDesc = getImportDescription(importType)

  return (
    <div>
      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <FileSpreadsheet size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            Academic Roster Data Pipeline & Ingestion
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Bulk import students, attendance sheets, exam marks, and course rosters with staging previews and dry-run validation before committing to the live database.
          </p>
        </div>
      </div>

      {/* Institutional Academic Data Health Summary */}
      {dataHealth && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={20} color="var(--empiria-primary)" />
              <div>
                <div style={{ fontSize: '11px', color: 'var(--empiria-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Total Enrolled Students
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--empiria-text-primary)' }}>
                  {dataHealth.total_students}
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={20} color="var(--empiria-primary)" />
              <div>
                <div style={{ fontSize: '11px', color: 'var(--empiria-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Attendance Records
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--empiria-text-primary)' }}>
                  {dataHealth.attendance_records_count}
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Award size={20} color="var(--empiria-secondary)" />
              <div>
                <div style={{ fontSize: '11px', color: 'var(--empiria-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Unreleased Marks
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: dataHealth.unreleased_results_count > 0 ? 'var(--badge-warn-text)' : 'var(--empiria-text-primary)' }}>
                  {dataHealth.unreleased_results_count}
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={20} color="var(--empiria-secondary)" />
              <div>
                <div style={{ fontSize: '11px', color: 'var(--empiria-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Data Health State
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--empiria-secondary)' }}>
                  {dataHealth.data_freshness_status}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title" style={{ fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)' }}>Academic Data Management & Staged CSV Import</h2>
            <p className="card-subtitle" style={{ color: 'var(--empiria-text-secondary)' }}>
              Dry-run isolated validation, idempotency protection, row-level error reporting, and formula-injection safe processing.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={loadAll} disabled={loading}>
              <RefreshCw size={12} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="callout callout-warning">
            <AlertCircle size={18} />
            <div>{error}</div>
          </div>
        )}

        {commitSuccessMsg && (
          <div className="callout callout-success">
            <CheckCircle2 size={18} />
            <div>{commitSuccessMsg}</div>
          </div>
        )}

        {/* Import Type Selector Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--empiria-border)', paddingBottom: '12px' }}>
          {(['students', 'attendance', 'marks', 'enrollments'] as ImportType[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setImportType(t)
                setSelectedFile(null)
                setActiveJob(null)
                setPreviewData(null)
                setError(null)
                setCommitSuccessMsg(null)
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--empiria-border)',
                background: importType === t ? 'var(--empiria-primary)' : 'var(--empiria-surface-muted)',
                color: importType === t ? '#ffffff' : 'var(--empiria-text-secondary)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <FileSpreadsheet size={15} />
              {t === 'students' && '1. Student Roster'}
              {t === 'attendance' && '2. Course Attendance'}
              {t === 'marks' && '3. Assessment Marks'}
              {t === 'enrollments' && '4. Enrollments'}
            </button>
          ))}
        </div>

        {/* Upload & Staging Box */}
        <div
          style={{
            border: '2px dashed var(--border-subtle)',
            borderRadius: '8px',
            padding: '24px',
            background: '#f8fafc',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'var(--primary-100)', color: 'var(--primary-700)', padding: '10px', borderRadius: '8px' }}>
                <Upload size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  {currentDesc.title}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  {currentDesc.desc}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--primary-800)', margin: '4px 0 0 0' }}>
                  Required columns: <code>{currentDesc.headers}</code>
                </p>
              </div>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleDownloadTemplate(importType)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={13} /> Download {importType.toUpperCase()} Template (.csv)
            </button>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              style={{ fontSize: '13px' }}
            />
            <button
              className="btn btn-primary"
              onClick={handleUploadAndValidate}
              disabled={!selectedFile || importing}
            >
              {importing ? <RefreshCw size={14} className="spin" /> : <Upload size={14} />}
              Validate & Preview CSV
            </button>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={allowPartial}
                onChange={(e) => setAllowPartial(e.target.checked)}
              />
              Allow partial commit (commit valid rows even if some rows contain validation errors)
            </label>
          </div>

          {/* Validation & Preview Report (Dry-Run Isolation) */}
          {activeJob && previewData && (
            <div style={{ marginTop: '20px', background: 'white', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span className={`badge ${activeJob.status === 'validated' ? 'badge-met' : 'badge-gap'}`}>
                    {activeJob.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>
                    Total: {activeJob.total_rows} rows | Valid: {activeJob.valid_rows} | Errors: {activeJob.error_rows}
                  </span>
                </div>

                {(activeJob.status === 'validated' || (allowPartial && activeJob.valid_rows > 0)) && (
                  <button className="btn btn-success btn-sm" onClick={handleCommitImport} disabled={importing}>
                    <ShieldCheck size={14} /> Commit Staged Import ({activeJob.valid_rows} valid records)
                  </button>
                )}
              </div>

              {/* Row-Level Issues Table */}
              {previewData.issues.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <AlertTriangle size={15} color="#dc2626" />
                    <strong style={{ fontSize: '12px', color: '#dc2626' }}>
                      Validation Issues ({previewData.issues.length}):
                    </strong>
                  </div>
                  <div className="data-table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Row #</th>
                          <th>Field</th>
                          <th>Code</th>
                          <th>Error Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.issues.map((iss, iIdx) => (
                          <tr key={iIdx}>
                            <td style={{ fontWeight: 600 }}>{iss.row_number}</td>
                            <td><code>{iss.field_name || 'General'}</code></td>
                            <td><span className="badge badge-gap">{iss.code}</span></td>
                            <td style={{ color: '#dc2626' }}>{iss.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sample Rows Preview */}
              <div>
                <strong style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Staged Rows Preview (First 10):</strong>
                <div className="data-table-container" style={{ marginTop: '6px' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Row #</th>
                        <th>Raw Content / Staged Columns</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.sample_rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td style={{ fontWeight: 600 }}>{rIdx + 2}</td>
                          <td>
                            <code style={{ fontSize: '11px' }}>
                              {JSON.stringify(row)}
                            </code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security / Formula-Injection Notice & Export Helpers */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={16} color="var(--primary-600)" />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Exported CSV reports are automatically sanitized against spreadsheet formula injection (<code>=</code>, <code>+</code>, <code>-</code>, <code>@</code> prefix neutralization).
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <a
              href="/internal/v1/students/export"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Download size={12} /> Export Roster
            </a>
            <a
              href="/internal/v1/attendance/export"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Download size={12} /> Export Attendance
            </a>
          </div>
        </div>

        {/* Current Active Students Table */}
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: 'var(--text-main)' }}>
          Active Student Directory ({students.length} Profiles)
        </h3>

        {students.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No student profiles found for this institution.</p>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Cohort</th>
                  <th>Status</th>
                  <th>Enrolled On</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      {s.student_identifier}
                    </td>
                    <td style={{ fontWeight: 600 }}>{s.first_name} {s.last_name}</td>
                    <td>{s.email}</td>
                    <td>
                      <span className="badge badge-neutral">{s.cohort_name || 'General CSE'}</span>
                    </td>
                    <td>
                      <span className={`badge ${s.status === 'active' ? 'badge-met' : 'badge-neutral'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
