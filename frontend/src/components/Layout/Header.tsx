import React, { useState, useEffect, useRef } from 'react'
import type { Account, ActiveMembership, NotificationItem } from '../../types'
import {
  Bell,
  Check,
  CheckCheck,
  LogOut,
  Building,
  User,
  ChevronDown,
  Search,
  ArrowRightLeft,
} from 'lucide-react'
import { api } from '../../api'

interface HeaderProps {
  account: Account
  activeMembership?: ActiveMembership
  activeRole: string
  onLogout: () => void
  onNavigate: (path: string) => void
  onOpenConversation?: (conversationId?: string) => void
  onSwitchMembership?: (membershipId: string) => void
}

export const Header: React.FC<HeaderProps> = ({
  account,
  activeMembership,
  activeRole,
  onLogout,
  onNavigate,
  onOpenConversation,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [notifDropdownOpen, setNotifDropdownOpen] = useState<boolean>(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')

  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [account.id])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false)
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications(15, false)
      setNotifications(res.notifications)
      setUnreadCount(res.unread_count)
    } catch {
      // background fetch error ignored
    }
  }

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      await api.markNotificationRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      // ignore
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead()
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      )
      setUnreadCount(0)
    } catch {
      // ignore
    }
  }

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read_at) {
      await handleMarkRead(notif.id)
    }
    setNotifDropdownOpen(false)
    if (notif.conversation_id && onOpenConversation) {
      onOpenConversation(notif.conversation_id)
    }
  }

  const getRoleBadgeStyle = (r: string) => {
    switch (r) {
      case 'super_admin':
      case 'platform_super_admin':
        return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5', label: 'Super Admin' }
      case 'institution_admin':
        return { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe', label: 'Institution Admin' }
      case 'data_operator':
      case 'institution_data_operator':
        return { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1', label: 'Data Operator' }
      case 'faculty':
      case 'faculty_assessor':
        return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd', label: 'Faculty Assessor' }
      case 'mentor':
      case 'mentor_advisor':
        return { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0', label: 'Mentor Advisor' }
      case 'student':
      default:
        return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', label: 'Student' }
    }
  }

  const roleStyle = getRoleBadgeStyle(activeRole)
  const displayName =
    account.display_name ||
    `${account.first_name || ''} ${account.last_name || ''}`.trim() ||
    account.email
  const initials = (
    account.display_name
      ? account.display_name
          .split(' ')
          .filter(Boolean)
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
      : `${account.first_name?.[0] || ''}${account.last_name?.[0] || ''}`
  ).toUpperCase() || 'U'

  return (
    <header
      className="top-header"
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--empiria-border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: '68px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Brand & Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div
          onClick={() => {
            if (activeRole === 'super_admin' || activeRole === 'platform_super_admin') onNavigate('/super-admin/dashboard')
            else if (activeRole === 'institution_admin' || activeRole === 'data_operator' || activeRole === 'institution_data_operator') onNavigate('/admin/dashboard')
            else if (activeRole === 'mentor' || activeRole === 'mentor_advisor' || activeRole === 'faculty' || activeRole === 'faculty_assessor') onNavigate('/mentor/dashboard')
            else onNavigate('/student/dashboard')
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <div className="brand-logo-squircle" style={{ width: '36px', height: '36px' }}>
            <ArrowRightLeft size={16} />
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--empiria-text)', lineHeight: 1.2, letterSpacing: '-0.025em' }}>
              EMPIRIA
            </div>
            <div style={{ fontSize: '11px', color: 'var(--empiria-text-muted)', fontWeight: 500 }}>
              Continuous Capability Intelligence
            </div>
          </div>
        </div>

        {/* Institution Context Badge */}
        {activeMembership && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f8fafc',
              border: '1px solid var(--empiria-border)',
              borderRadius: 'var(--radius-full)',
              padding: '5px 12px',
              fontSize: '12px',
              color: 'var(--empiria-text)',
            }}
          >
            <Building size={14} color="#2563eb" />
            <span style={{ fontWeight: 600 }}>{activeMembership.institution_name}</span>
            <span style={{ fontSize: '11px', color: 'var(--empiria-text-muted)' }}>({activeMembership.institution_slug})</span>
          </div>
        )}

        {/* Role Badge */}
        <div
          style={{
            background: roleStyle.bg,
            border: `1px solid ${roleStyle.border}`,
            color: roleStyle.text,
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
          }}
        >
          ● {roleStyle.label}
        </div>
      </div>

      {/* Global Quick Search, Notifications & User Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Quick Search */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: '#f8fafc',
            border: '1px solid var(--empiria-border)',
            borderRadius: 'var(--radius-full)',
            padding: '6px 14px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Search size={14} style={{ color: 'var(--empiria-text-muted)', marginRight: '8px' }} />
          <input
            type="text"
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--empiria-text)',
              fontSize: '13px',
              width: '160px',
            }}
          />
        </div>

        {/* Notification Bell Dropdown */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={() => setNotifDropdownOpen((prev) => !prev)}
            aria-label="Notifications"
            style={{
              background: notifDropdownOpen ? 'var(--empiria-surface-muted)' : 'transparent',
              border: '1px solid var(--empiria-border)',
              borderRadius: '6px',
              color: 'var(--empiria-text-muted)',
              padding: '6px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'var(--empiria-primary)',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 800,
                  width: '16px',
                  height: '16px',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '360px',
                background: 'var(--empiria-surface)',
                border: '1px solid var(--empiria-border)',
                borderRadius: '8px',
                boxShadow: 'var(--empiria-shadow-lg)',
                zIndex: 100,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--empiria-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--empiria-text-main)', fontFamily: 'var(--font-heading)' }}>
                  Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--empiria-primary)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <CheckCheck size={13} /> Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--empiria-text-tertiary)', fontSize: '12px' }}>
                    No notifications at this time
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isUnread = !notif.read_at
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--empiria-border-subtle)',
                          background: isUnread ? 'var(--empiria-surface-muted)' : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', fontWeight: isUnread ? 700 : 500, color: isUnread ? 'var(--empiria-text-main)' : 'var(--empiria-text-muted)' }}>
                            {notif.title}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--empiria-text-tertiary)', marginTop: '2px', lineHeight: 1.4 }}>
                            {notif.notification_type.replace('_', ' ').toLowerCase()}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--empiria-text-tertiary)', marginTop: '4px' }}>
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {isUnread && (
                          <button
                            onClick={(e) => handleMarkRead(notif.id, e)}
                            title="Mark as read"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--empiria-text-tertiary)',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div style={{ position: 'relative' }} ref={userRef}>
          <button
            onClick={() => setUserDropdownOpen((prev) => !prev)}
            style={{
              background: 'var(--empiria-surface-muted)',
              border: '1px solid var(--empiria-border)',
              borderRadius: '6px',
              padding: '4px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--empiria-text-main)',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '999px',
                background: 'var(--empiria-primary)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {initials}
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600 }}>{account.first_name}</span>
            <ChevronDown size={14} color="var(--empiria-text-tertiary)" />
          </button>

          {userDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '240px',
                background: 'var(--empiria-surface)',
                border: '1px solid var(--empiria-border)',
                borderRadius: '8px',
                boxShadow: 'var(--empiria-shadow-lg)',
                zIndex: 100,
                overflow: 'hidden',
                padding: '8px 0',
              }}
            >
              <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--empiria-border)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--empiria-text-main)', fontFamily: 'var(--font-heading)' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--empiria-text-tertiary)', marginTop: '2px' }}>
                  {account.email}
                </div>
              </div>

              {activeRole !== 'student' && (
                <div style={{ padding: '4px 0' }}>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false)
                      if (activeRole === 'super_admin') onNavigate('/super-admin/profile')
                      else if (activeRole === 'institution_admin') onNavigate('/admin/settings')
                      else if (activeRole === 'mentor') onNavigate('/mentor/profile')
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      color: 'var(--empiria-text-main)',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--empiria-surface-muted)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <User size={14} /> Profile & Settings
                  </button>
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--empiria-border)', padding: '4px 0' }}>
                <button
                  onClick={() => {
                    setUserDropdownOpen(false)
                    onLogout()
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    color: 'var(--empiria-danger)',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(185, 28, 28, 0.06)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
