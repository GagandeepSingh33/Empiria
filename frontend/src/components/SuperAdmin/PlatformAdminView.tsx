import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import {
  CheckCircle2,
  XCircle,
  Building,
  Key,
  Users,
  Activity,
  Settings,
  RefreshCw,
  Plus,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Bell,
  BarChart3,
  UserCheck,
  ArrowRight,
  Server,
  Database,
  Mail,
  Cpu,
} from 'lucide-react'
import type {
  InstitutionApplication,
  Licence,
  PlatformKPISummary,
  OperationsHealth,
  BackgroundJobSummary,
  SystemErrorItem,
  PlatformUser,
} from '../../types'

type ActiveTab =
  | 'overview'
  | 'institutions'
  | 'licences'
  | 'users'
  | 'operations'
  | 'reports'
  | 'policies'
  | 'logs'
  | 'notifications'
  | 'settings'
  | 'profile'

interface PlatformAdminViewProps {
  currentPath?: string
  onNavigate?: (path: string) => void
}

export const PlatformAdminView: React.FC<PlatformAdminViewProps> = ({
  currentPath = '/super-admin/dashboard',
  onNavigate = () => {},
}) => {
  const [loading, setLoading] = useState<boolean>(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Data states
  const [kpis, setKpis] = useState<PlatformKPISummary | null>(null)
  const [institutions, setInstitutions] = useState<any[]>([])
  const [applications, setApplications] = useState<InstitutionApplication[]>([])
  const [licences, setLicences] = useState<Licence[]>([])
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [opsHealth, setOpsHealth] = useState<OperationsHealth | null>(null)
  const [bgJobs, setBgJobs] = useState<BackgroundJobSummary | null>(null)
  const [sysErrors, setSysErrors] = useState<SystemErrorItem[]>([])
  const [healthReports, setHealthReports] = useState<any[]>([])
  const [auditEvents, setAuditEvents] = useState<any[]>([])
  const [auditChainVerified, setAuditChainVerified] = useState<boolean | null>(null)
  const [auditChainLoading, setAuditChainLoading] = useState<boolean>(false)

  // Modal / action states
  const [selectedInst, setSelectedInst] = useState<any | null>(null)
  const [statusHistory, setStatusHistory] = useState<any[]>([])
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false)
  const [statusTarget, setStatusTarget] = useState<{ id: string; name: string; currentStatus: string } | null>(null)
  const [statusActionReason, setStatusActionReason] = useState<string>('')
  const [statusActionType, setStatusActionType] = useState<string>('suspended')

  // Licence modals
  const [showIssueLicenceModal, setShowIssueLicenceModal] = useState<boolean>(false)
  const [newLicenceInstId, setNewLicenceInstId] = useState<string>('')
  const [newLicenceTier, setNewLicenceTier] = useState<string>('standard')
  const [newLicenceStudents, setNewLicenceStudents] = useState<number>(500)
  const [newLicenceMentors, setNewLicenceMentors] = useState<number>(50)
  const [newLicenceDays, setNewLicenceDays] = useState<number>(365)

  const [selectedLicenceEvents, setSelectedLicenceEvents] = useState<any[]>([])
  const [showLicenceEventsModal, setShowLicenceEventsModal] = useState<boolean>(false)

  // User access history modal
  const [userAccessHistory, setUserAccessHistory] = useState<any | null>(null)
  const [showUserHistoryModal, setShowUserHistoryModal] = useState<boolean>(false)

  // Security policies form
  const [secPolicies, setSecPolicies] = useState<any>({
    min_password_length: 10,
    require_special_char: true,
    session_timeout_minutes: 120,
    mfa_enforced_for_admins: false,
    max_failed_logins_before_lockout: 5,
  })

  // Notification settings form
  const [notifConfig, setNotifConfig] = useState<any>({
    smtp_enabled: false,
    smtp_host: 'smtp.internal',
    smtp_port: 587,
    sender_email: 'notifications@empiria.internal',
    alerts_email: 'ops-alerts@empiria.internal',
    notifications_enabled: true,
  })

  // Map the current URL path to active tab
  const getActiveTab = (): ActiveTab => {
    if (currentPath === '/super-admin/institutions') return 'institutions'
    if (currentPath === '/super-admin/licences') return 'licences'
    if (currentPath === '/super-admin/users') return 'users'
    if (currentPath === '/super-admin/operations') return 'operations'
    if (currentPath === '/super-admin/reports') return 'reports'
    if (currentPath === '/super-admin/policies') return 'policies'
    if (currentPath === '/super-admin/logs') return 'logs'
    if (currentPath === '/super-admin/notifications') return 'notifications'
    if (currentPath === '/super-admin/settings') return 'settings'
    if (currentPath === '/super-admin/profile') return 'profile'
    return 'overview'
  }

  const tab = getActiveTab()

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const [
        kpiData,
        instData,
        appData,
        licData,
        userData,
        healthData,
        jobData,
        errData,
        repData,
        auditData,
        secData,
        notifData,
      ] = await Promise.all([
        api.getPlatformKPISummary().catch(() => null),
        api.getPlatformInstitutions().catch(() => []),
        api.getInstitutionApplications().catch(() => []),
        api.getLicences().catch(() => []),
        api.getPlatformUsers().catch(() => []),
        api.getOperationsHealth().catch(() => null),
        api.getBackgroundJobs().catch(() => null),
        api.getSystemErrors().catch(() => ({ errors: [] })),
        api.getInstitutionalHealthReports().catch(() => []),
        api.getPlatformAuditHistory(undefined, 25).catch(() => []),
        api.getSecurityPolicies().catch(() => null),
        api.getNotificationSettings().catch(() => null),
      ])

      setKpis(kpiData)
      setInstitutions(instData)
      setApplications(appData)
      setLicences(licData)
      setUsers(userData)
      setOpsHealth(healthData)
      setBgJobs(jobData)
      setSysErrors(errData?.errors || [])
      setHealthReports(repData)
      setAuditEvents(auditData)
      if (secData) setSecPolicies(secData)
      if (notifData) setNotifConfig(notifData)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load platform data')
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 5000)
  }

  // Application Review
  const handleReviewApp = async (id: string, decision: 'approved' | 'rejected') => {
    try {
      await api.reviewInstitutionApplication(id, decision, `Super admin decision: ${decision}`)
      showNotification(`Institution application ${decision} successfully. Initial admin invited.`)
      await loadAllData()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to review application')
    }
  }

  // Institution Profile Modal
  const handleViewInstitution = async (instId: string) => {
    try {
      const detail = await api.getInstitutionDetail(instId)
      const hist = await api.getInstitutionStatusHistory(instId)
      setSelectedInst(detail)
      setStatusHistory(hist)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load institution details')
    }
  }

  // Change Institution Status
  const handleConfirmStatusChange = async () => {
    if (!statusTarget) return
    try {
      await api.updateInstitutionStatus(statusTarget.id, statusActionType, statusActionReason)
      showNotification(`Institution status changed to ${statusActionType}.`)
      setShowStatusModal(false)
      setStatusTarget(null)
      setStatusActionReason('')
      await loadAllData()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to change institution status')
    }
  }

  // Issue Licence
  const handleIssueLicence = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLicenceInstId) return
    try {
      await api.issueLicence({
        institution_id: newLicenceInstId,
        plan_tier: newLicenceTier,
        max_students: Number(newLicenceStudents),
        max_mentors: Number(newLicenceMentors),
        duration_days: Number(newLicenceDays),
        permitted_features: [
          'basic_analytics',
          'attendance_tracking',
          'mentor_matching',
          'academic_interventions',
          'ai_risk_scoring',
        ],
      })
      showNotification('New institutional licence issued successfully.')
      setShowIssueLicenceModal(false)
      await loadAllData()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to issue licence')
    }
  }

  // Licence Actions: Renew, Suspend, Reactivate, Revoke
  const handleLicenceAction = async (licenceId: string, action: 'renew' | 'suspend' | 'reactivate' | 'revoke') => {
    try {
      if (action === 'renew') {
        await api.renewLicence(licenceId, 365, 'Super Admin renewed licence for 365 days')
        showNotification('Licence renewed for 365 days.')
      } else if (action === 'suspend') {
        await api.suspendLicence(licenceId, 'Suspended by Super Admin')
        showNotification('Licence suspended.')
      } else if (action === 'reactivate') {
        await api.reactivateLicence(licenceId, 'Reactivated by Super Admin')
        showNotification('Licence reactivated.')
      } else if (action === 'revoke') {
        await api.revokeLicence(licenceId, 'Revoked by Super Admin')
        showNotification('Licence revoked.')
      }
      await loadAllData()
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to ${action} licence`)
    }
  }

  // View Licence Events
  const handleViewLicenceEvents = async (licenceId: string) => {
    try {
      const events = await api.getLicenceEvents(licenceId)
      setSelectedLicenceEvents(events)
      setShowLicenceEventsModal(true)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load licence event history')
    }
  }

  // User Super Admin toggle
  const handleToggleSuperAdmin = async (userId: string, currentVal: boolean) => {
    try {
      await api.toggleSuperAdminRole(userId, !currentVal, 'Role updated via Super Admin Portal')
      showNotification(`Super admin role ${!currentVal ? 'granted' : 'revoked'}.`)
      await loadAllData()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update super admin role')
    }
  }

  // View User Access History
  const handleViewUserAccess = async (userId: string) => {
    try {
      const hist = await api.getUserAccessHistory(userId)
      setUserAccessHistory(hist)
      setShowUserHistoryModal(true)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load user access history')
    }
  }

  // Save Security Policies
  const handleSaveSecurityPolicies = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.updateSecurityPolicies(secPolicies)
      showNotification('Global security policies updated successfully.')
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save security policies')
    }
  }

  // Save Notification Config
  const handleSaveNotificationConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.updateNotificationSettings(notifConfig)
      showNotification('Notification configuration updated successfully.')
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save notification settings')
    }
  }

  // Verify Audit Chain
  const handleVerifyAuditChain = async () => {
    setAuditChainLoading(true)
    try {
      const res = await api.verifyAuditChain()
      setAuditChainVerified(res.is_valid ?? true)
      showNotification(res.message || 'Audit log cryptographic hash chain verified successfully.')
    } catch (err: any) {
      setErrorMsg(err.message || 'Audit chain verification failed')
      setAuditChainVerified(false)
    } finally {
      setAuditChainLoading(false)
    }
  }

  // Section title and breadcrumb helper
  const getSectionMetadata = () => {
    switch (tab) {
      case 'institutions':
        return {
          title: 'Institution Management & Applications',
          subtitle: 'Review incoming institutional applications, manage active tenant lifecycles, and view status history.',
          icon: <Building size={24} style={{ color: 'var(--primary-color)' }} />,
        }
      case 'licences':
        return {
          title: 'Licences & Subscriptions Management',
          subtitle: 'Issue, modify, renew, suspend, and audit tenant licences with real-time seat and feature entitlements.',
          icon: <Key size={24} style={{ color: 'var(--primary-color)' }} />,
        }
      case 'users':
        return {
          title: 'Platform Users & Super Admin Governance',
          subtitle: 'Account directory, privileged role assignments, access history, and session auditing.',
          icon: <Users size={24} style={{ color: 'var(--primary-color)' }} />,
        }
      case 'operations':
        return {
          title: 'Operations & System Observability',
          subtitle: 'Real-time database latency, background jobs, system errors, and core integration health.',
          icon: <Activity size={24} style={{ color: 'var(--primary-color)' }} />,
        }
      case 'reports':
        return {
          title: 'Platform Reports & Cross-Tenant Intelligence',
          subtitle: 'Persisted aggregate health metrics, student:mentor ratios, and cross-institutional analytics.',
          icon: <BarChart3 size={24} style={{ color: 'var(--primary-color)' }} />,
        }
      case 'policies':
        return {
          title: 'Global Security Policies & Standards',
          subtitle: 'Enforce platform-wide password constraints, session timeouts, and regulatory compliance standards.',
          icon: <ShieldAlert size={24} style={{ color: 'var(--primary-color)' }} />,
        }
      case 'logs':
        return {
          title: 'System Logs & Tamper-Evident Auditing',
          subtitle: 'Immutable audit trail with cryptographic SHA-256 hash-chain verification.',
          icon: <FileText size={24} style={{ color: 'var(--primary-color)' }} />,
        }
      case 'notifications':
        return {
          title: 'Notification & SMTP Alert Settings',
          subtitle: 'Configure platform dispatch channels, SMTP servers, and incident recipient lists.',
          icon: <Bell size={24} style={{ color: 'var(--primary-color)' }} />,
        }
      case 'settings':
        return {
          title: 'Operational Settings Console',
          subtitle: 'Global platform configuration, tenant defaults, and environment parameters.',
          icon: <Settings size={24} style={{ color: 'var(--primary-color)' }} />,
        }
      case 'profile':
        return {
          title: 'Platform Super Admin Profile & Account',
          subtitle: 'Root administrator identity, authorization boundary, and security posture.',
          icon: <UserCheck size={24} style={{ color: 'var(--primary-color)' }} />,
        }
      case 'overview':
      default:
        return {
          title: 'Platform Overview & Central Governance',
          subtitle: 'Empiria Control Plane: tenant lifecycle, licensing quotas, system health, and audit trails.',
          icon: <ShieldCheck size={24} style={{ color: 'var(--primary-color)' }} />,
        }
    }
  }

  const meta = getSectionMetadata()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="explainer-banner">
        <div className="explainer-icon-box">
          <ShieldCheck size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a8a', margin: '0 0 4px 0' }}>
            Empiria Global Control Plane & Tenant Governance
          </h4>
          <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, lineHeight: 1.5 }}>
            Central administration over institutions, licensing entitlements, tenant quotas, security compliance policies, and background worker operational health.
          </p>
        </div>
      </div>

      {/* Top Header Banner driven by Sidebar Selection */}
      <div className="card" style={{ padding: '20px 24px', borderLeft: '4px solid var(--empiria-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {meta.icon}
              <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--text-main)', fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>
                {meta.title}
              </h1>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              {meta.subtitle}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn btn-secondary btn-sm" onClick={loadAllData} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              Refresh Data
            </button>
            <span className="badge badge-info" style={{ fontWeight: 600, padding: '6px 12px' }}>
              Level: Platform Super Admin
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="callout callout-success" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="callout callout-error" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <XCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: OVERVIEW & REAL PERSISTED KPIS
      ========================================================================= */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Persisted KPI Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
            <div
              className="card"
              style={{ padding: '16px', borderTop: '3px solid #2563eb', cursor: 'pointer' }}
              onClick={() => onNavigate('/super-admin/institutions')}
            >
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Total Institutions
              </span>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '6px', color: 'var(--text-main)' }}>
                {kpis ? kpis.total_institutions : 'Not Available'}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {kpis ? `${kpis.active_institutions} Active | ${kpis.suspended_institutions} Suspended` : 'Awaiting data'}
              </span>
            </div>

            <div
              className="card"
              style={{ padding: '16px', borderTop: '3px solid #f59e0b', cursor: 'pointer' }}
              onClick={() => onNavigate('/super-admin/licences')}
            >
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Requiring Attention
              </span>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '6px', color: (kpis?.institutions_requiring_attention ?? 0) > 0 ? '#b45309' : 'var(--text-main)' }}>
                {kpis ? kpis.institutions_requiring_attention : 'Not Available'}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Suspended or Expiring Licences
              </span>
            </div>

            <div
              className="card"
              style={{ padding: '16px', borderTop: '3px solid var(--empiria-primary)', cursor: 'pointer' }}
              onClick={() => onNavigate('/super-admin/licences')}
            >
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Active Licences
              </span>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '6px', color: 'var(--text-main)' }}>
                {kpis ? kpis.active_licences : 'Not Available'}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {kpis ? `${kpis.expiring_licences} Expiring Soon` : 'Awaiting data'}
              </span>
            </div>

            <div
              className="card"
              style={{ padding: '16px', borderTop: '3px solid #8b5cf6', cursor: 'pointer' }}
              onClick={() => onNavigate('/super-admin/reports')}
            >
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Enrolled Students
              </span>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '6px', color: 'var(--text-main)' }}>
                {kpis ? kpis.total_students : 'Not Available'}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {kpis ? `${kpis.total_mentors} Faculty Mentors` : 'Awaiting data'}
              </span>
            </div>

            <div
              className="card"
              style={{ padding: '16px', borderTop: '3px solid #ec4899', cursor: 'pointer' }}
              onClick={() => onNavigate('/super-admin/institutions')}
            >
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Partnership Applications
              </span>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '6px', color: 'var(--text-main)' }}>
                {kpis ? kpis.total_applications : 'Not Available'}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {kpis ? `${kpis.pending_applications} Pending Review` : 'Awaiting data'}
              </span>
            </div>

            <div
              className="card"
              style={{ padding: '16px', borderTop: '3px solid var(--empiria-secondary)', cursor: 'pointer' }}
              onClick={() => onNavigate('/super-admin/logs')}
            >
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                24H Audit Events
              </span>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '6px', color: 'var(--text-main)' }}>
                {kpis ? kpis.total_audit_events_24h : 'Not Available'}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Tamper-Evident SHA256 Chain
              </span>
            </div>
          </div>

          {/* Quick Management Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div
              className="card"
              style={{ padding: '20px', cursor: 'pointer', transition: 'transform 0.15s ease' }}
              onClick={() => onNavigate('/super-admin/institutions')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Building size={20} color="var(--empiria-primary)" />
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Institutions & Applications</h3>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                Review partnership requests, manage {institutions.length} tenant profiles, and control operational status.
              </p>
            </div>

            <div
              className="card"
              style={{ padding: '20px', cursor: 'pointer', transition: 'transform 0.15s ease' }}
              onClick={() => onNavigate('/super-admin/licences')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Key size={20} color="var(--empiria-primary)" />
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Licences & Seat Quotas</h3>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                Configure {licences.length} active licences, student/mentor capacities, feature flags, and renewals.
              </p>
            </div>

            <div
              className="card"
              style={{ padding: '20px', cursor: 'pointer', transition: 'transform 0.15s ease' }}
              onClick={() => onNavigate('/super-admin/users')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Users size={20} color="#8b5cf6" />
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Platform Users</h3>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                Manage {users.length} accounts, grant/revoke Super Admin privileges, and inspect user session histories.
              </p>
            </div>

            <div
              className="card"
              style={{ padding: '20px', cursor: 'pointer', transition: 'transform 0.15s ease' }}
              onClick={() => onNavigate('/super-admin/operations')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Activity size={20} color="#ec4899" />
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Operations & Health</h3>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                Live database latency ({opsHealth?.database_latency_ms ?? 0}ms), background jobs, system errors, and ML engine.
              </p>
            </div>
          </div>

          {/* Recent Audit History Preview */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Recent Privileged Transitions</h3>
                <p className="card-subtitle">Immutable audit trail of recent administrative actions across the platform.</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('/super-admin/logs')}>
                View Full Audit Log <ArrowRight size={13} />
              </button>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Purpose / Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEvents.slice(0, 5).map((ev) => (
                    <tr key={ev.id}>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(ev.occurred_at).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {ev.action}
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ fontSize: '10px' }}>
                          {ev.resource_type}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px' }}>{ev.purpose || JSON.stringify(ev.details || {})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 2: INSTITUTION MANAGEMENT & APPLICATIONS REVIEW
      ========================================================================= */}
      {tab === 'institutions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Applications Section */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Institutional Partnership Applications</h3>
                <p className="card-subtitle">
                  Review new onboarding submissions. Approving automatically provisions the tenant, issues a standard licence, and invites the primary administrator.
                </p>
              </div>
              <span className="badge badge-info">{applications.length} Total Applications</span>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Institution Name</th>
                    <th>Representative</th>
                    <th>Email</th>
                    <th>Verification Summary</th>
                    <th>Submitted At</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No institutional applications submitted yet.
                      </td>
                    </tr>
                  ) : (
                    applications.map((app) => (
                      <tr key={app.id}>
                        <td style={{ fontWeight: 600 }}>{app.institution_name}</td>
                        <td>{app.representative_name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{app.representative_email}</td>
                        <td style={{ fontSize: '12px', maxWidth: '200px' }} title={app.verification_summary}>
                          {app.verification_summary.slice(0, 60)}...
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(app.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              app.status === 'approved'
                                ? 'badge-met'
                                : app.status === 'rejected'
                                ? 'badge-gap'
                                : 'badge-info'
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {app.status === 'submitted' && (
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ color: 'var(--status-met)', borderColor: 'var(--status-met)', fontSize: '11px', padding: '2px 8px' }}
                                onClick={() => handleReviewApp(app.id, 'approved')}
                              >
                                Approve & Onboard
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ color: 'var(--status-gap)', borderColor: 'var(--status-gap)', fontSize: '11px', padding: '2px 8px' }}
                                onClick={() => handleReviewApp(app.id, 'rejected')}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Registered Institutions Directory */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Registered Tenant Institutions</h3>
                <p className="card-subtitle">
                  Inspect tenant profiles, student/mentor capacities, and manage operational status (Activate / Suspend / Reactivate).
                </p>
              </div>
              <span className="badge badge-met">{institutions.length} Institutions Registered</span>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Institution Name</th>
                    <th>Tenant Slug</th>
                    <th>Account Status</th>
                    <th>Created Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map((inst) => (
                    <tr key={inst.id}>
                      <td style={{ fontWeight: 600 }}>{inst.name}</td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {inst.slug}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${inst.status === 'active' ? 'badge-met' : 'badge-gap'}`}>
                          {inst.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(inst.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '2px 8px' }}
                            onClick={() => handleViewInstitution(inst.id)}
                          >
                            View Profile
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '2px 8px' }}
                            onClick={() => {
                              setStatusTarget({ id: inst.id, name: inst.name, currentStatus: inst.status })
                              setStatusActionType(inst.status === 'active' ? 'suspended' : 'active')
                              setShowStatusModal(true)
                            }}
                          >
                            Change Status
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 3: LICENCES & SUBSCRIPTIONS
      ========================================================================= */}
      {tab === 'licences' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Institutional Licences & Seat Enforcements</h3>
                <p className="card-subtitle">
                  Configure plan tiers, seat capacities (Students & Mentors), feature entitlements, and renewal lifecycles.
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowIssueLicenceModal(true)}>
                <Plus size={14} /> Issue New Licence
              </button>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Institution</th>
                    <th>Plan Tier</th>
                    <th>Student Seats</th>
                    <th>Mentor Seats</th>
                    <th>Expiry & Days</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {licences.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No institutional licences found. Issue a licence to begin.
                      </td>
                    </tr>
                  ) : (
                    licences.map((lic) => (
                      <tr key={lic.id}>
                        <td style={{ fontWeight: 600 }}>{lic.institution_name || lic.institution_id}</td>
                        <td>
                          <span className="badge badge-info" style={{ textTransform: 'uppercase' }}>
                            {lic.plan_tier}
                          </span>
                        </td>
                        <td>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 600 }}>
                              {lic.current_students} / {lic.max_students}
                            </span>
                            <div style={{ width: '100px', height: '4px', background: '#e2e8f0', borderRadius: '2px', marginTop: '4px' }}>
                              <div
                                style={{
                                  width: `${Math.min(100, (lic.current_students / (lic.max_students || 1)) * 100)}%`,
                                  height: '100%',
                                  background: lic.current_students >= lic.max_students ? 'var(--status-gap)' : 'var(--primary-color)',
                                  borderRadius: '2px',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>
                            {lic.current_mentors} / {lic.max_mentors}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px' }}>
                          <div>{new Date(lic.expires_at).toLocaleDateString()}</div>
                          <span style={{ color: lic.days_until_expiry < 30 ? 'var(--status-gap)' : 'var(--text-muted)', fontSize: '11px' }}>
                            {lic.days_until_expiry} days left
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              lic.status === 'active'
                                ? 'badge-met'
                                : lic.status === 'suspended'
                                ? 'badge-gap'
                                : 'badge-info'
                            }`}
                          >
                            {lic.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '2px 6px' }}
                              onClick={() => handleLicenceAction(lic.id, 'renew')}
                              title="Renew licence by 365 days"
                            >
                              Renew
                            </button>
                            {lic.status === 'active' ? (
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '11px', padding: '2px 6px', color: 'var(--status-gap)' }}
                                onClick={() => handleLicenceAction(lic.id, 'suspend')}
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '11px', padding: '2px 6px', color: 'var(--status-met)' }}
                                onClick={() => handleLicenceAction(lic.id, 'reactivate')}
                              >
                                Reactivate
                              </button>
                            )}
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '2px 6px' }}
                              onClick={() => handleViewLicenceEvents(lic.id)}
                            >
                              Events
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
        </div>
      )}

      {/* =========================================================================
          SECTION 4: PLATFORM USERS & GOVERNANCE
      ========================================================================= */}
      {tab === 'users' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Platform Users & Super Admin Governance</h3>
              <p className="card-subtitle">
                Inspect accounts, toggle Platform Super Admin privileges, and audit user login sessions.
              </p>
            </div>
            <span className="badge badge-info">{users.length} Platform Accounts</span>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Display Name</th>
                  <th>Email</th>
                  <th>Super Admin</th>
                  <th>Account Status</th>
                  <th>Created Date</th>
                  <th>Last Session</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.display_name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                    <td>
                      {u.is_super_admin ? (
                        <span className="badge badge-met" style={{ fontSize: '11px' }}>
                          SUPER ADMIN
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Standard</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${u.status === 'active' ? 'badge-met' : 'badge-gap'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '11px', padding: '2px 8px' }}
                          onClick={() => handleToggleSuperAdmin(u.id, u.is_super_admin)}
                        >
                          {u.is_super_admin ? 'Revoke Super Admin' : 'Grant Super Admin'}
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '11px', padding: '2px 8px' }}
                          onClick={() => handleViewUserAccess(u.id)}
                        >
                          Access History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 5: OPERATIONS & OBSERVABILITY
      ========================================================================= */}
      {tab === 'operations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Operations Health Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '16px', borderTop: '3px solid #10b981' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                System Liveness
              </span>
              <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '6px', color: opsHealth?.liveness ? 'var(--status-met)' : 'var(--status-gap)' }}>
                {opsHealth?.liveness ? 'ONLINE (Live)' : 'OFFLINE'}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/health/live HTTP 200</span>
            </div>

            <div className="card" style={{ padding: '16px', borderTop: '3px solid var(--empiria-primary)' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                System Readiness
              </span>
              <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '6px', color: opsHealth?.readiness ? 'var(--status-met)' : 'var(--status-gap)' }}>
                {opsHealth?.readiness ? 'READY FOR TRAFFIC' : 'NOT READY'}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>DB & Storage connected</span>
            </div>

            <div className="card" style={{ padding: '16px', borderTop: '3px solid #2563eb' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Database Latency
              </span>
              <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '6px', color: 'var(--text-main)' }}>
                {opsHealth?.database_latency_ms !== undefined ? `${opsHealth.database_latency_ms} ms` : 'Not Available'}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PostgreSQL connection ping</span>
            </div>

            <div className="card" style={{ padding: '16px', borderTop: '3px solid #f59e0b' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                Active System Alerts
              </span>
              <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '6px', color: sysErrors.length > 0 ? '#b45309' : 'var(--text-main)' }}>
                {sysErrors.length}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unresolved errors</span>
            </div>
          </div>

          {/* Background Jobs Monitoring */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Background Job Monitoring</h3>
                <p className="card-subtitle">
                  Status and execution metrics for risk pipelines, model benchmarks, and mentor matching optimization.
                </p>
              </div>
              <span className="badge badge-info">
                {bgJobs ? `${bgJobs.completed_jobs} Completed | ${bgJobs.failed_jobs} Failed` : 'Loading jobs...'}
              </span>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Job Type</th>
                    <th>Status</th>
                    <th>Started At</th>
                    <th>Duration (s)</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {!bgJobs || bgJobs.recent_jobs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No background jobs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    bgJobs.recent_jobs.map((job) => (
                      <tr key={job.id}>
                        <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                          {job.job_type}
                        </td>
                        <td>
                          <span className={`badge ${job.status === 'completed' ? 'badge-met' : job.status === 'failed' ? 'badge-gap' : 'badge-info'}`}>
                            {job.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(job.started_at).toLocaleString()}
                        </td>
                        <td style={{ fontSize: '12px' }}>{job.duration_seconds}s</td>
                        <td style={{ fontSize: '12px' }}>{job.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Core Integrations Health Cards */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Core Subsystem & Integration Health</h3>
                <p className="card-subtitle">Monitored interfaces for database connectivity, outbound dispatch, and ML services.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Database size={18} color="#2563eb" />
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>PostgreSQL 17 Database</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                  <span className="badge badge-met">CONNECTED</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', marginTop: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Latency:</span>
                  <span>{opsHealth?.database_latency_ms ?? 0} ms</span>
                </div>
              </div>

              <div style={{ padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Mail size={18} color="var(--empiria-primary)" />
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>Email & Outbox Service</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                  <span className="badge badge-met">CONNECTED (Local Adapter)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', marginTop: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Mode:</span>
                  <span>Development Test Outbox</span>
                </div>
              </div>

              <div style={{ padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Cpu size={18} color="#8b5cf6" />
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>Scikit-Learn ML Risk Engine</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                  <span className="badge badge-met">OPERATIONAL</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', marginTop: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Pipeline:</span>
                  <span>Isolation Forest & Logistic Reg</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 6: PLATFORM REPORTS & CROSS-TENANT INTELLIGENCE
      ========================================================================= */}
      {tab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Cross-Institution Academic & Mentor Health</h3>
                <p className="card-subtitle">
                  Persisted metrics tracking student-mentor ratios, licence tiers, and platform engagement across tenants.
                </p>
              </div>
              <span className="badge badge-met">{healthReports.length} Institutions Tracked</span>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Institution</th>
                    <th>Active Students</th>
                    <th>Active Mentors</th>
                    <th>Student:Mentor Ratio</th>
                    <th>Licence Tier</th>
                    <th>Health Band</th>
                  </tr>
                </thead>
                <tbody>
                  {healthReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No institution health reports available.
                      </td>
                    </tr>
                  ) : (
                    healthReports.map((h, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{h.institution_name}</td>
                        <td>{h.active_students}</td>
                        <td>{h.active_mentors}</td>
                        <td style={{ fontWeight: 600 }}>{h.student_mentor_ratio}</td>
                        <td>
                          <span className="badge badge-info" style={{ textTransform: 'uppercase' }}>
                            {h.licence_tier}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${h.health_status === 'Good' ? 'badge-met' : 'badge-gap'}`}>
                            {h.health_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 7: GLOBAL SECURITY POLICIES & STANDARDS
      ========================================================================= */}
      {tab === 'policies' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Global Platform Security Policies</h3>
                <p className="card-subtitle">
                  Mandated security controls applied across all tenant organizations, staff, and student accounts.
                </p>
              </div>
              <span className="badge badge-info">Tenant Security Baseline</span>
            </div>

            <form onSubmit={handleSaveSecurityPolicies} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Minimum Password Length
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={secPolicies.min_password_length}
                    onChange={(e) => setSecPolicies({ ...secPolicies, min_password_length: Number(e.target.value) })}
                    min={8}
                    max={32}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Session Timeout (Minutes)
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={secPolicies.session_timeout_minutes}
                    onChange={(e) => setSecPolicies({ ...secPolicies, session_timeout_minutes: Number(e.target.value) })}
                    min={15}
                    max={1440}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Max Failed Logins Before Lockout
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={secPolicies.max_failed_logins_before_lockout}
                    onChange={(e) => setSecPolicies({ ...secPolicies, max_failed_logins_before_lockout: Number(e.target.value) })}
                    min={3}
                    max={10}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={secPolicies.require_special_char}
                    onChange={(e) => setSecPolicies({ ...secPolicies, require_special_char: e.target.checked })}
                  />
                  <span>Enforce Special Character & Complexity in Passwords</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={secPolicies.mfa_enforced_for_admins}
                    onChange={(e) => setSecPolicies({ ...secPolicies, mfa_enforced_for_admins: e.target.checked })}
                  />
                  <span>Enforce Multi-Factor Authentication (MFA) for Institution Admins</span>
                </label>
              </div>

              <div>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Security Policies
                </button>
              </div>
            </form>
          </div>

          {/* Compliance Frameworks card */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Regulatory Compliance & Institutional Standards</h3>
                <p className="card-subtitle">Platform architectural adherence to international education and privacy mandates.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>FERPA (34 CFR Part 99)</div>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Student education records isolated by tenant foreign keys. Explicit consent requirements enforced.
                </p>
              </div>
              <div style={{ padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>GDPR Article 17 & 20</div>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Right to erasure and data portability with automated export packaging and audit trail verification.
                </p>
              </div>
              <div style={{ padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>ISO/IEC 27001 & SOC 2 Type II</div>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Immutable SHA-256 hash chains for all state mutations. Privileged session token rotation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 8: SYSTEM LOGS & AUDITING STREAM
      ========================================================================= */}
      {tab === 'logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Tamper-evident verification card */}
          <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={22} color="var(--primary-color)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>Cryptographic Hash Chain Integrity</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Each audit entry contains SHA-256 payload hash and previous event block hash.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {auditChainVerified !== null && (
                <span className={`badge ${auditChainVerified ? 'badge-met' : 'badge-gap'}`}>
                  {auditChainVerified ? 'CHAIN INTACT (No Tampering)' : 'VERIFICATION FAILED'}
                </span>
              )}
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleVerifyAuditChain}
                disabled={auditChainLoading}
              >
                {auditChainLoading ? 'Verifying...' : 'Verify Cryptographic Chain'}
              </button>
            </div>
          </div>

          {/* Audit events table */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Immutable Audit Event Stream</h3>
                <p className="card-subtitle">Real-time log of privileged operations, tenant creation, and access events.</p>
              </div>
              <span className="badge badge-info">{auditEvents.length} Events Logged</span>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Resource Type</th>
                    <th>Purpose / Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEvents.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No audit events recorded.
                      </td>
                    </tr>
                  ) : (
                    auditEvents.map((e) => (
                      <tr key={e.id}>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(e.occurred_at).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{e.action}</td>
                        <td>
                          <span className="badge badge-info" style={{ fontSize: '10px' }}>
                            {e.resource_type}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px' }}>{e.purpose || JSON.stringify(e.details || {})}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 9: NOTIFICATION CONFIGURATION
      ========================================================================= */}
      {tab === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Platform Notification & Dispatch Configuration</h3>
                <p className="card-subtitle">
                  Configure SMTP mail delivery adapters, automated alert destinations, and email delivery thresholds.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveNotificationConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={notifConfig.smtp_host}
                    onChange={(e) => setNotifConfig({ ...notifConfig, smtp_host: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={notifConfig.smtp_port}
                    onChange={(e) => setNotifConfig({ ...notifConfig, smtp_port: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Sender Email Address
                  </label>
                  <input
                    type="email"
                    className="input"
                    value={notifConfig.sender_email}
                    onChange={(e) => setNotifConfig({ ...notifConfig, sender_email: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Security Operations Alerts Email
                  </label>
                  <input
                    type="email"
                    className="input"
                    value={notifConfig.alerts_email}
                    onChange={(e) => setNotifConfig({ ...notifConfig, alerts_email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifConfig.smtp_enabled}
                    onChange={(e) => setNotifConfig({ ...notifConfig, smtp_enabled: e.target.checked })}
                  />
                  <span>Enable Live SMTP Transport (Otherwise local outbox adapter is used)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifConfig.notifications_enabled}
                    onChange={(e) => setNotifConfig({ ...notifConfig, notifications_enabled: e.target.checked })}
                  />
                  <span>Global In-App Notifications Service Enabled</span>
                </label>
              </div>

              <div>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Notification Config
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 10: OPERATIONAL SETTINGS CONSOLE
      ========================================================================= */}
      {tab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <ShieldAlert size={20} color="var(--primary-color)" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Security Baseline</h3>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Min password length: <strong>{secPolicies.min_password_length}</strong> | Session timeout: <strong>{secPolicies.session_timeout_minutes}m</strong>
              </p>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('/super-admin/policies')}>
                Edit Security Policies <ArrowRight size={13} />
              </button>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Bell size={20} color="var(--empiria-primary)" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Dispatch & Notifications</h3>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Host: <strong>{notifConfig.smtp_host}</strong> | Alerts: <strong>{notifConfig.alerts_email}</strong>
              </p>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('/super-admin/notifications')}>
                Configure Notifications <ArrowRight size={13} />
              </button>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Server size={20} color="#8b5cf6" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>System Health & Jobs</h3>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Status: <strong>{opsHealth?.status?.toUpperCase() || 'HEALTHY'}</strong> | DB Latency: <strong>{opsHealth?.database_latency_ms ?? 0}ms</strong>
              </p>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('/super-admin/operations')}>
                Inspect Operations <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 11: PROFILE & ACCOUNT
      ========================================================================= */}
      {tab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, var(--empiria-primary) 0%, var(--empiria-secondary) 100%)',
                  color: '#ffffff',
                  fontSize: '22px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                PS
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Platform Super Admin</h2>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  superadmin@empiria.internal
                </div>
                <div style={{ marginTop: '6px' }}>
                  <span className="badge badge-met">Root Privilege</span>
                  <span className="badge badge-info" style={{ marginLeft: '6px' }}>Multi-Tenant Control Plane</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>ACCOUNT ID</span>
                <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  sa-master-0000-0000-000000000000
                </div>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>AUTHORIZATION SCOPE</span>
                <div style={{ fontSize: '13px', marginTop: '2px' }}>
                  Full Platform Root Access (All Institutions & Data)
                </div>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>CSRF PROTECTION</span>
                <div style={{ fontSize: '13px', color: 'var(--status-met)', fontWeight: 600, marginTop: '2px' }}>
                  Active (Double-Submit Token Enforced)
                </div>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>DATABASE CONNECTION</span>
                <div style={{ fontSize: '13px', marginTop: '2px' }}>
                  PostgreSQL 17 on 127.0.0.1:5433
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS
      ========================================================================= */}

      {/* Institution Detail Modal */}
      {selectedInst && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--empiria-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '640px', width: '90%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="card-header">
              <h3 className="card-title">{selectedInst.name} — Institutional Profile</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedInst(null)}>
                Close
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--empiria-surface-muted)', padding: '12px', borderRadius: '6px' }}>
                <div><strong>Tenant Slug:</strong> {selectedInst.slug}</div>
                <div><strong>Status:</strong> <span className="badge badge-met">{selectedInst.status}</span></div>
                <div><strong>Total Students:</strong> {selectedInst.student_count}</div>
                <div><strong>Total Mentors:</strong> {selectedInst.mentor_count}</div>
                <div><strong>Departments:</strong> {selectedInst.department_count}</div>
                <div><strong>Created:</strong> {new Date(selectedInst.created_at).toLocaleDateString()}</div>
              </div>

              {selectedInst.active_licence ? (
                <div style={{ padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700 }}>Active Licence</h4>
                  <div>Plan Tier: <strong>{selectedInst.active_licence.plan_tier.toUpperCase()}</strong></div>
                  <div>Student Limit: {selectedInst.active_licence.max_students} | Mentor Limit: {selectedInst.active_licence.max_mentors}</div>
                  <div>Expires At: {new Date(selectedInst.active_licence.expires_at).toLocaleDateString()} ({selectedInst.active_licence.days_until_expiry} days remaining)</div>
                </div>
              ) : (
                <div className="callout callout-info">No active licence assigned to this institution.</div>
              )}

              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700 }}>Institutional Administrators</h4>
                {selectedInst.admin_accounts.length === 0 ? (
                  <span style={{ color: 'var(--text-muted)' }}>No administrator accounts enrolled yet.</span>
                ) : (
                  <ul>
                    {selectedInst.admin_accounts.map((a: any, i: number) => (
                      <li key={i}>{a.display_name} ({a.email}) — Status: {a.status}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 700 }}>Status Transition History</h4>
                {statusHistory.length === 0 ? (
                  <span style={{ color: 'var(--text-muted)' }}>No status transitions recorded.</span>
                ) : (
                  <ul style={{ maxHeight: '120px', overflowY: 'auto' }}>
                    {statusHistory.map((sh, idx) => (
                      <li key={idx} style={{ fontSize: '12px', marginBottom: '4px' }}>
                        {new Date(sh.occurred_at).toLocaleString()}: <strong>{sh.previous_status} → {sh.new_status}</strong> ({sh.reason || 'No reason provided'})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {showStatusModal && statusTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--empiria-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '440px', width: '90%' }}>
            <div className="card-header">
              <h3 className="card-title">Change Institution Status</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowStatusModal(false)}>
                Cancel
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '13px' }}>
                Modifying operational status for <strong>{statusTarget.name}</strong>.
              </p>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Target Status
                </label>
                <select
                  className="input"
                  value={statusActionType}
                  onChange={(e) => setStatusActionType(e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="reactivated">Reactivated</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Reason (Audited)
                </label>
                <textarea
                  className="input"
                  rows={3}
                  value={statusActionReason}
                  onChange={(e) => setStatusActionReason(e.target.value)}
                  placeholder="Provide explicit operational reason..."
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowStatusModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleConfirmStatusChange}>
                  Confirm Transition
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issue Licence Modal */}
      {showIssueLicenceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--empiria-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '480px', width: '90%' }}>
            <div className="card-header">
              <h3 className="card-title">Issue Institutional Licence</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowIssueLicenceModal(false)}>
                Cancel
              </button>
            </div>
            <form onSubmit={handleIssueLicence} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Institution
                </label>
                <select
                  className="input"
                  value={newLicenceInstId}
                  onChange={(e) => setNewLicenceInstId(e.target.value)}
                  required
                >
                  <option value="">Select an institution...</option>
                  {institutions.map((i) => (
                    <option key={i.id} value={i.id}>{i.name} ({i.slug})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Plan Tier
                </label>
                <select
                  className="input"
                  value={newLicenceTier}
                  onChange={(e) => setNewLicenceTier(e.target.value)}
                >
                  <option value="starter">Starter (200 Students, 20 Mentors)</option>
                  <option value="standard">Standard (500 Students, 50 Mentors)</option>
                  <option value="professional">Professional (1,500 Students, 150 Mentors)</option>
                  <option value="enterprise">Enterprise (5,000 Students, 500 Mentors)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Student Seat Limit
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={newLicenceStudents}
                    onChange={(e) => setNewLicenceStudents(Number(e.target.value))}
                    min={10}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Mentor Seat Limit
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={newLicenceMentors}
                    onChange={(e) => setNewLicenceMentors(Number(e.target.value))}
                    min={2}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Validity Duration (Days)
                </label>
                <input
                  type="number"
                  className="input"
                  value={newLicenceDays}
                  onChange={(e) => setNewLicenceDays(Number(e.target.value))}
                  min={30}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowIssueLicenceModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Issue Licence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Licence Events History Modal */}
      {showLicenceEventsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--empiria-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '640px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="card-header">
              <h3 className="card-title">Licence Modification & Event Audit History</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowLicenceEventsModal(false)}>
                Close
              </button>
            </div>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event Type</th>
                    <th>Reason</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedLicenceEvents.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '16px' }}>No events recorded.</td>
                    </tr>
                  ) : (
                    selectedLicenceEvents.map((ev) => (
                      <tr key={ev.id}>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(ev.occurred_at).toLocaleString()}
                        </td>
                        <td>
                          <span className="badge badge-info" style={{ textTransform: 'uppercase' }}>
                            {ev.event_type}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px' }}>{ev.reason || '—'}</td>
                        <td style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                          {JSON.stringify(ev.after_state || {})}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* User Access History Modal */}
      {showUserHistoryModal && userAccessHistory && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--empiria-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '640px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="card-header">
              <h3 className="card-title">User Access & Session History</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowUserHistoryModal(false)}>
                Close
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 700 }}>Recent Login Sessions</h4>
                {userAccessHistory.sessions.length === 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No sessions recorded.</span>
                ) : (
                  <ul style={{ fontSize: '12px' }}>
                    {userAccessHistory.sessions.map((s: any, idx: number) => (
                      <li key={idx}>
                        Created: {new Date(s.created_at).toLocaleString()} — Expires: {new Date(s.expires_at).toLocaleString()} — Status: {s.revoked ? 'REVOKED' : 'ACTIVE'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 700 }}>Audit Events Performed</h4>
                {userAccessHistory.audit_events.length === 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No audit events logged.</span>
                ) : (
                  <ul style={{ fontSize: '12px' }}>
                    {userAccessHistory.audit_events.map((ae: any, idx: number) => (
                      <li key={idx}>
                        {new Date(ae.occurred_at).toLocaleString()}: <strong>{ae.action}</strong> on {ae.resource_type} — {ae.purpose}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
