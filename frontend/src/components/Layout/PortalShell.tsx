import React, { useState } from 'react'
import type { Account, ActiveMembership } from '../../types'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { AccessDenied } from './AccessDenied'

interface PortalShellProps {
  account: Account
  activeMembership?: ActiveMembership
  activeRole: string
  targetPortal: 'super_admin' | 'institution_admin' | 'mentor' | 'student'
  currentPath: string
  onNavigate: (path: string) => void
  onLogout: () => void
  onOpenConversation?: (conversationId?: string) => void
  children: React.ReactNode
}

export const PortalShell: React.FC<PortalShellProps> = ({
  account,
  activeMembership,
  activeRole,
  targetPortal,
  currentPath,
  onNavigate,
  onLogout,
  onOpenConversation,
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Determine authorization
  const isAuthorized = () => {
    const isSuperAdmin =
      activeRole === 'super_admin' ||
      activeRole === 'platform_super_admin' ||
      account.is_super_admin === true ||
      account.account_type === 'super_admin'

    if (targetPortal === 'super_admin') {
      return isSuperAdmin
    }
    if (targetPortal === 'institution_admin') {
      return (
        activeRole === 'institution_admin' ||
        activeRole === 'institution_data_operator' ||
        activeRole === 'data_operator' ||
        isSuperAdmin
      )
    }
    if (targetPortal === 'mentor') {
      return (
        activeRole === 'mentor' ||
        activeRole === 'mentor_advisor' ||
        activeRole === 'faculty' ||
        activeRole === 'faculty_assessor' ||
        activeRole === 'institution_admin' ||
        isSuperAdmin
      )
    }
    if (targetPortal === 'student') {
      return activeRole === 'student' || isSuperAdmin
    }
    return false
  }

  const getAuthorizedHomePath = () => {
    switch (activeRole) {
      case 'super_admin':
      case 'platform_super_admin':
        return '/super-admin/dashboard'
      case 'institution_admin':
      case 'institution_data_operator':
      case 'data_operator':
        return '/admin/dashboard'
      case 'mentor':
      case 'mentor_advisor':
      case 'faculty':
      case 'faculty_assessor':
        return '/mentor/dashboard'
      case 'student':
      default:
        return '/student/dashboard'
    }
  }

  if (!isAuthorized()) {
    return (
      <div className="app-container" style={{ minHeight: '100vh', background: 'var(--empiria-background)' }}>
        <Header
          account={account}
          activeMembership={activeMembership}
          activeRole={activeRole}
          onLogout={onLogout}
          onNavigate={onNavigate}
        />
        <AccessDenied
          requiredRole={targetPortal}
          currentRole={activeRole}
          onNavigateHome={() => onNavigate(getAuthorizedHomePath())}
        />
      </div>
    )
  }

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--empiria-background)' }}>
      <Header
        account={account}
        activeMembership={activeMembership}
        activeRole={activeRole}
        onLogout={onLogout}
        onNavigate={onNavigate}
        onOpenConversation={onOpenConversation}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 64px)' }}>
        <Sidebar
          role={activeRole}
          currentPath={currentPath}
          onNavigate={onNavigate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />

        <main
          className="portal-content-area"
          style={{
            flex: 1,
            overflowY: 'auto',
            background: 'var(--empiria-background)',
            padding: '24px 28px 48px 28px',
            minWidth: 0,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
