import React, { useState, useEffect, useRef } from 'react'
import type { Account, ActiveMembership, NotificationItem } from '../types'
import {
  LogOut,
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  Compass,
  Layers,
  Users,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react'
import { api } from '../api'

interface NavbarProps {
  account?: Account
  activeMembership?: ActiveMembership
  onLogout: () => void
  activeRole: string
  activeNavSection?: string
  onSelectNavSection?: (section: string) => void
  onOpenConversation?: (conversationId?: string) => void
}

export const Navbar: React.FC<NavbarProps> = ({
  account,
  activeMembership,
  onLogout,
  activeRole,
  activeNavSection = 'workflow',
  onSelectNavSection,
  onOpenConversation,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [notifDropdownOpen, setNotifDropdownOpen] = useState<boolean>(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (account) {
      loadNotifications()
      // Poll every 30 seconds for background notifications
      const interval = setInterval(loadNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [account])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false)
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
      // Ignore background notification fetch errors
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
    } else if (onSelectNavSection) {
      onSelectNavSection('messages')
    }
  }

  const isStudent = activeRole === 'student'
  const isSuperAdmin = activeRole === 'super_admin'

  return (
    <header className="top-navbar">
      <div className="navbar-inner">
        {/* Brand Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <div className="brand-section">
            <div className="brand-logo-badge">EMPIRIA</div>
            <div>
              <div className="brand-title">EMPIRIA</div>
              <div className="brand-subtitle">
                {activeMembership?.institution_name || 'Capability Development Platform'}
              </div>
            </div>
          </div>

          {/* Primary Role Navigation Tabs */}
          {account && onSelectNavSection && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isStudent && (
                <>
                  <button
                    onClick={() => onSelectNavSection('workflow')}
                    style={{
                      background: activeNavSection === 'workflow' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                      color: activeNavSection === 'workflow' ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Layers size={14} /> Workflow Loop
                  </button>

                  <button
                    onClick={() => onSelectNavSection('student_360')}
                    style={{
                      background: activeNavSection === 'student_360' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                      color: activeNavSection === 'student_360' ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <GraduationCap size={14} /> Academic 360
                  </button>

                  <button
                    onClick={() => onSelectNavSection('mentors')}
                    style={{
                      background: activeNavSection === 'mentors' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                      color: activeNavSection === 'mentors' ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Compass size={14} /> My Mentors
                  </button>

                  <button
                    onClick={() => onSelectNavSection('messages')}
                    style={{
                      background: activeNavSection === 'messages' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                      color: activeNavSection === 'messages' ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <MessageSquare size={14} /> Messages
                  </button>

                  <button
                    onClick={() => onSelectNavSection('privacy')}
                    style={{
                      background: activeNavSection === 'privacy' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                      color: activeNavSection === 'privacy' ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <ShieldCheck size={14} /> Privacy Rights
                  </button>
                </>
              )}

              {!isStudent && !isSuperAdmin && (
                <>
                  <button
                    onClick={() => onSelectNavSection('staff_workspace')}
                    style={{
                      background: activeNavSection === 'staff_workspace' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                      color: activeNavSection === 'staff_workspace' ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Users size={14} /> Staff Workspace
                  </button>

                  <button
                    onClick={() => onSelectNavSection('messages')}
                    style={{
                      background: activeNavSection === 'messages' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                      color: activeNavSection === 'messages' ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <MessageSquare size={14} /> Queries & Messages
                  </button>
                </>
              )}
            </nav>
          )}
        </div>

        {/* User profile & Notification bell */}
        <div className="nav-actions">
          {account && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Notification Bell Dropdown */}
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  style={{
                    background: notifDropdownOpen ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '8px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  title="Notifications"
                >
                  <Bell size={16} />
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: '#e11d48',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 700,
                        borderRadius: '999px',
                        padding: '1px 5px',
                        lineHeight: 1.2,
                        border: '2px solid var(--empiria-surface)',
                      }}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Popover */}
                {notifDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '46px',
                      width: '340px',
                      background: 'var(--empiria-surface)',
                      border: '1px solid var(--empiria-border)',
                      borderRadius: '10px',
                      boxShadow: 'var(--empiria-shadow-lg)',
                      zIndex: 100,
                      overflow: 'hidden',
                      color: 'var(--text-main)',
                    }}
                  >
                    <div
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--empiria-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--empiria-surface-muted)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>Notifications</span>
                        {unreadCount > 0 && (
                          <span className="badge badge-info" style={{ fontSize: '10px', padding: '1px 5px' }}>
                            {unreadCount} unread
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#2dd4bf',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <CheckCheck size={12} /> Mark all read
                        </button>
                      )}
                    </div>

                    <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((n) => {
                          const isUnread = !n.read_at
                          return (
                            <div
                              key={n.id}
                              onClick={() => handleNotificationClick(n)}
                              style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                                cursor: 'pointer',
                                background: isUnread ? 'rgba(13, 148, 136, 0.1)' : 'transparent',
                                transition: 'background 0.15s ease',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {isUnread && (
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2dd4bf' }} />
                                  )}
                                  <span style={{ fontWeight: 600, fontSize: '12px', color: '#f8fafc' }}>
                                    {n.title}
                                  </span>
                                </div>
                                <span style={{ fontSize: '10px', color: '#64748b' }}>
                                  {new Date(n.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 6px', textTransform: 'capitalize' }}>
                                {n.notification_type.replace(/_/g, ' ')}
                              </p>
                              {isUnread && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={(e) => handleMarkRead(n.id, e)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#2dd4bf',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                  >
                                    <Check size={11} /> Mark as read
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Account Info */}
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                    {account.first_name} {account.last_name}
                  </span>
                  <span className="badge badge-info" style={{ fontSize: '10px', padding: '1px 5px' }}>
                    {activeRole.replace('_', ' ')}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{account.email}</span>
              </div>

              {/* Sign Out Button */}
              <button
                className="btn btn-secondary btn-sm"
                style={{ background: 'transparent', color: '#cbd5e1', borderColor: '#475569' }}
                onClick={onLogout}
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
