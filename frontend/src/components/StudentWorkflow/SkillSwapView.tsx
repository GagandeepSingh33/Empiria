import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import {
  Coins,
  ArrowRightLeft,
  Calendar,
  Plus,
  Star,
  CheckCircle2,
  Clock,
  Search,
  BookOpen,
  RefreshCw,
  Sparkles,
  X,
  Shield,
  Layers,
  ExternalLink,
  Globe,
} from 'lucide-react'

export const SkillSwapView: React.FC = () => {
  const [account, setAccount] = useState<any | null>(null)
  const [listings, setListings] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<'listings' | 'sessions' | 'ledger'>('listings')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [externalUrl, setExternalUrl] = useState<string>(() => {
    return localStorage.getItem('empiria_skillswap_url') || 'https://skillswap-9de96.web.app/'
  })
  const [showUrlEdit, setShowUrlEdit] = useState<boolean>(false)

  // Create Listing Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [listingType, setListingType] = useState<'offer' | 'request'>('offer')
  const [skillName, setSkillName] = useState<string>('')
  const [category, setCategory] = useState<string>('academic')
  const [proficiency, setProficiency] = useState<string>('intermediate')
  const [description, setDescription] = useState<string>('')
  const [savingListing, setSavingListing] = useState<boolean>(false)

  // Booking Modal
  const [selectedListing, setSelectedListing] = useState<any | null>(null)
  const [bookingNotes, setBookingNotes] = useState<string>('')
  const [bookingMinutes, setBookingMinutes] = useState<number>(60)
  const [bookingCredits, setBookingCredits] = useState<number>(1)
  const [bookingSaving, setBookingSaving] = useState<boolean>(false)

  // Session Completion Modal
  const [sessionToComplete, setSessionToComplete] = useState<any | null>(null)
  const [ratingScore, setRatingScore] = useState<number>(5.0)
  const [feedbackText, setFeedbackText] = useState<string>('')
  const [completingSession, setCompletingSession] = useState<boolean>(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      setLoading(true)
      const [acc, list, sess, txs] = await Promise.all([
        api.getSkillSwapAccount().catch(() => null),
        api.listSkillSwapListings().catch(() => []),
        api.listSkillSwapSessions().catch(() => []),
        api.getSkillSwapTransactions().catch(() => []),
      ])
      setAccount(acc)
      setListings(list || [])
      setSessions(sess || [])
      setTransactions(txs || [])
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load Skill Swap network.' })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!skillName.trim()) return
    try {
      setSavingListing(true)
      await api.createSkillSwapListing({
        listing_type: listingType,
        skill_name: skillName.trim(),
        category,
        proficiency_level: proficiency,
        description: description.trim() || undefined,
      })
      setStatusMsg({ type: 'success', text: `Skill ${listingType} published to peer exchange!` })
      setShowCreateModal(false)
      setSkillName('')
      setDescription('')
      await loadAll()
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to create listing.' })
    } finally {
      setSavingListing(false)
    }
  }

  const handleBookSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedListing) return
    try {
      setBookingSaving(true)
      await api.bookSkillSwapSession({
        listing_id: selectedListing.id,
        offering_student_id: selectedListing.student_id,
        skill_name: selectedListing.skill_name,
        duration_minutes: bookingMinutes,
        credit_cost: bookingCredits,
        notes: bookingNotes.trim() || undefined,
      })
      setStatusMsg({ type: 'success', text: 'Skill swap session booked and credits reserved!' })
      setSelectedListing(null)
      setBookingNotes('')
      await loadAll()
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to book session.' })
    } finally {
      setBookingSaving(false)
    }
  }

  const handleCompleteSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionToComplete) return
    try {
      setCompletingSession(true)
      await api.completeSkillSwapSession(sessionToComplete.id, {
        rating_score: ratingScore,
        feedback_text: feedbackText.trim() || undefined,
      })
      setStatusMsg({ type: 'success', text: 'Session verified! Credits transferred to mentor peer.' })
      setSessionToComplete(null)
      setFeedbackText('')
      await loadAll()
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to complete session.' })
    } finally {
      setCompletingSession(false)
    }
  }

  const filteredListings = listings.filter((l) => {
    const matchesCategory = categoryFilter === 'all' || l.category === categoryFilter
    const matchesSearch = !searchQuery || l.skill_name.toLowerCase().includes(searchQuery.toLowerCase()) || (l.description && l.description.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  return (
    <div className="section-container" style={{ padding: '0 0 40px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-flex', padding: '8px', background: 'var(--empiria-primary-subtle)', borderRadius: '8px', color: 'var(--empiria-primary)' }}>
              <ArrowRightLeft size={22} />
            </span>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--empiria-text-primary)' }}>
              Peer Skill Swap Exchange
            </h2>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: 'var(--empiria-text-secondary)' }}>
            Empowering reciprocal learning. Teach what you excel at, learn what you need, governed by a zero-sum credit ledger.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(37,99,235,0.06)',
              transition: 'all 0.15s ease',
            }}
          >
            <ExternalLink size={15} />
            <span>Launch Skill Swap Website ↗</span>
          </a>

          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Create Skill Listing
          </button>
        </div>
      </div>

      {/* External Skill Swap Gateway Banner */}
      <div
        className="card"
        style={{
          marginBottom: '24px',
          padding: '20px 24px',
          borderRadius: '18px',
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.04) 0%, rgba(99, 102, 241, 0.06) 100%)',
          border: '1px solid rgba(37, 99, 235, 0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '300px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(37,99,235,0.12)',
            }}
          >
            <Globe size={24} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#2563eb',
                  background: '#dbeafe',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                External Application Gateway
              </span>
              <span style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {externalUrl}
              </span>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '2px 0 0 0', color: 'var(--empiria-text-primary)' }}>
              Official Skill Swap Web Platform
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--empiria-text-secondary)' }}>
              Redirect directly to the standalone Skill Swap website for live interactive whiteboard sessions, peer matchmaking lobbies, and video breakouts.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowUrlEdit(!showUrlEdit)}
            style={{ fontSize: '12px' }}
          >
            {showUrlEdit ? 'Hide Config' : 'Configure URL'}
          </button>
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <ExternalLink size={15} />
            <span>Open Skill Swap Website</span>
          </a>
        </div>
      </div>

      {showUrlEdit && (
        <div
          style={{
            marginBottom: '24px',
            background: '#ffffff',
            border: '1px solid var(--empiria-border)',
            borderRadius: '14px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--empiria-text)', whiteSpace: 'nowrap' }}>
            Target Skill Swap Website URL:
          </label>
          <input
            type="url"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            className="form-input"
            style={{ flex: 1, borderRadius: '10px', height: '38px', fontSize: '13px' }}
            placeholder="https://skillswap-9de96.web.app/"
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              const clean = externalUrl.trim() || 'https://skillswap-9de96.web.app/'
              setExternalUrl(clean)
              localStorage.setItem('empiria_skillswap_url', clean)
              setShowUrlEdit(false)
              setStatusMsg({ type: 'success', text: `Skill Swap link saved: ${clean}` })
            }}
          >
            Save Link
          </button>
        </div>
      )}

      {/* Educational Explainer Banner */}
      <div className="explainer-banner" style={{ marginBottom: '24px' }}>
        <div className="explainer-icon-box">
          <ArrowRightLeft size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#2563eb', background: '#dbeafe', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
              Collaborative Peer Learning
            </span>
            <div className="explainer-title" style={{ margin: 0 }}>
              What is the Peer Skill Swap Network?
            </div>
          </div>
          <div className="explainer-text">
            Empiria matches you with fellow students based on complementary capabilities. If you know Python and want to learn UI/UX, you can trade 1-on-1 tutoring sessions using a zero-cost academic credit system — earning verified co-learning credentials along the way.
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className={`status-banner status-${statusMsg.type}`} style={{ marginBottom: '20px' }}>
          {statusMsg.text}
        </div>
      )}

      {/* Credit Ledger KPI Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div style={{ background: '#ffffff', border: '1px solid var(--empiria-border)', borderRadius: '20px', padding: '22px 24px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--empiria-text-muted)', fontSize: '13px', fontWeight: 600 }}>
            <span>Available Balance</span>
            <Coins size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#2563eb', marginTop: '6px', fontFamily: 'var(--font-heading)' }}>
            {account?.balance ?? 5} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--empiria-text-muted)' }}>Credits</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid var(--empiria-border)', borderRadius: '20px', padding: '22px 24px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--empiria-text-muted)', fontSize: '13px', fontWeight: 600 }}>
            <span>Total Earned</span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', marginTop: '6px', fontFamily: 'var(--font-heading)' }}>
            +{account?.total_earned ?? 0} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--empiria-text-muted)' }}>Credits</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid var(--empiria-border)', borderRadius: '20px', padding: '22px 24px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--empiria-text-muted)', fontSize: '13px', fontWeight: 600 }}>
            <span>Total Invested</span>
            <Clock size={18} color="#0ea5e9" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--empiria-text)', marginTop: '6px', fontFamily: 'var(--font-heading)' }}>
            {account?.total_spent ?? 0} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--empiria-text-muted)' }}>Credits</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid var(--empiria-border)', borderRadius: '20px', padding: '22px 24px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--empiria-text-muted)', fontSize: '13px', fontWeight: 600 }}>
            <span>Active Sessions</span>
            <Calendar size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--empiria-text)', marginTop: '6px', fontFamily: 'var(--font-heading)' }}>
            {sessions.filter((s) => s.status === 'scheduled').length} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--empiria-text-muted)' }}>Booked</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--empiria-border)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('listings')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'listings' ? '2px solid var(--empiria-primary)' : '2px solid transparent',
            color: activeTab === 'listings' ? 'var(--empiria-primary)' : 'var(--empiria-text-secondary)',
            fontWeight: activeTab === 'listings' ? 600 : 500,
            padding: '10px 18px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <BookOpen size={16} /> Peer Marketplace ({filteredListings.length})
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'sessions' ? '2px solid var(--empiria-primary)' : '2px solid transparent',
            color: activeTab === 'sessions' ? 'var(--empiria-primary)' : 'var(--empiria-text-secondary)',
            fontWeight: activeTab === 'sessions' ? 600 : 500,
            padding: '10px 18px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Calendar size={16} /> My Swap Sessions ({sessions.length})
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'ledger' ? '2px solid var(--empiria-primary)' : '2px solid transparent',
            color: activeTab === 'ledger' ? 'var(--empiria-primary)' : 'var(--empiria-text-secondary)',
            fontWeight: activeTab === 'ledger' ? 600 : 500,
            padding: '10px 18px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Shield size={16} /> Credit Ledger & Audit Trail ({transactions.length})
        </button>
      </div>

      {/* Tab 1: Marketplace Listings */}
      {activeTab === 'listings' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--empiria-text-secondary)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search skills (e.g. SQL, Python, UI Design, Vocal Support)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
            </div>
            <select
              className="form-control"
              style={{ width: '180px' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="academic">Academic & Core</option>
              <option value="technical">Technical & Code</option>
              <option value="creative">Creative & Arts</option>
              <option value="athletics">Sports & Motion</option>
            </select>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <RefreshCw size={24} className="spin" style={{ color: 'var(--empiria-primary)', margin: '0 auto 12px auto' }} />
              <p style={{ color: 'var(--empiria-text-secondary)', fontSize: '13px' }}>Loading Peer Listings...</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <Layers size={36} style={{ color: 'var(--empiria-accent)', margin: '0 auto 12px auto', opacity: 0.6 }} />
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', margin: '0 0 6px 0' }}>No Skill Listings Found</h3>
              <p style={{ color: 'var(--empiria-text-secondary)', fontSize: '14px', maxWidth: '440px', margin: '0 auto 18px auto' }}>
                Be the first to share your expertise or request peer coaching in a difficult competency!
              </p>
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                <Plus size={15} style={{ marginRight: '6px' }} /> Create First Listing
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '16px' }}>
              {filteredListings.map((l) => (
                <div
                  key={l.id}
                  style={{
                    background: 'var(--empiria-surface)',
                    border: '1px solid var(--empiria-border)',
                    borderRadius: '12px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: l.listing_type === 'offer' ? 'var(--badge-pass-bg)' : 'var(--badge-info-bg)',
                          color: l.listing_type === 'offer' ? 'var(--badge-pass-text)' : 'var(--badge-info-text)',
                          border: `1px solid ${l.listing_type === 'offer' ? 'var(--badge-pass-border)' : 'var(--badge-info-border)'}`,
                        }}
                      >
                        {l.listing_type === 'offer' ? 'Peer Offering' : 'Skill Request'}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)', textTransform: 'capitalize' }}>
                        {l.category} • {l.proficiency_level}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--empiria-text-primary)', margin: '0 0 8px 0', fontFamily: 'var(--font-heading)' }}>
                      {l.skill_name}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--empiria-text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                      {l.description || 'Dedicated peer mentoring and structured practice session focused on practical competency milestones.'}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid var(--empiria-border)', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--empiria-text-secondary)' }}>
                      Cost: <strong>1 Credit / hr</strong>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedListing(l)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Sparkles size={13} /> {l.listing_type === 'offer' ? 'Book Session' : 'Offer Help'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Active Swap Sessions */}
      {activeTab === 'sessions' && (
        <div style={{ background: 'var(--empiria-surface)', border: '1px solid var(--empiria-border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--empiria-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--empiria-text-primary)', fontFamily: 'var(--font-heading)' }}>
              Scheduled & Completed Peer Sessions
            </h3>
            <span className="badge badge-neutral">{sessions.length} total</span>
          </div>

          {sessions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--empiria-text-secondary)', fontSize: '14px' }}>
              No swap sessions booked yet. Book an offering from the marketplace to get started.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--empiria-surface-muted)', borderBottom: '1px solid var(--empiria-border)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Skill</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Duration</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Credit Cost</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Rating</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--empiria-border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--empiria-text-primary)' }}>{s.skill_name}</td>
                      <td style={{ padding: '12px 16px' }}>{s.duration_minutes} mins</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--empiria-accent)' }}>{s.credit_cost} Credit</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            background: s.status === 'completed' ? 'var(--badge-pass-bg)' : 'var(--badge-warn-bg)',
                            color: s.status === 'completed' ? 'var(--badge-pass-text)' : 'var(--badge-warn-text)',
                            border: `1px solid ${s.status === 'completed' ? 'var(--badge-pass-border)' : 'var(--badge-warn-border)'}`,
                          }}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {s.rating_score ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--empiria-accent)' }}>
                            <Star size={13} fill="currentColor" /> {s.rating_score.toFixed(1)}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--empiria-text-secondary)' }}>Pending</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {s.status === 'scheduled' ? (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setSessionToComplete(s)}
                          >
                            Complete & Release
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--badge-pass-text)', fontWeight: 600 }}>Settled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Ledger Transactions */}
      {activeTab === 'ledger' && (
        <div style={{ background: 'var(--empiria-surface)', border: '1px solid var(--empiria-border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--empiria-border)' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--empiria-text-primary)', fontFamily: 'var(--font-heading)' }}>
              Double-Entry Credit Ledger
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--empiria-text-secondary)' }}>
              Tamper-evident, zero-sum token transfers recorded across all completed swaps and allocations.
            </p>
          </div>

          {transactions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--empiria-text-secondary)', fontSize: '14px' }}>
              No ledger transactions recorded yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--empiria-surface-muted)', borderBottom: '1px solid var(--empiria-border)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Tx ID</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Amount</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Reason / Description</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--empiria-border)' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--empiria-text-secondary)' }}>
                        {tx.id.substring(0, 8)}...
                      </td>
                      <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{tx.transaction_type}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: tx.amount > 0 ? 'var(--badge-pass-text)' : 'var(--badge-fail-text)' }}>
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount} Credits
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--empiria-text-primary)' }}>{tx.reason || 'Peer learning exchange settlement'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--empiria-text-secondary)', fontSize: '12px' }}>
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Create Listing */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ maxWidth: '500px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                Publish Skill Listing
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateListing}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>Listing Type</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="listingType"
                      checked={listingType === 'offer'}
                      onChange={() => setListingType('offer')}
                    />
                    Offering (I can teach this)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="listingType"
                      checked={listingType === 'request'}
                      onChange={() => setListingType('request')}
                    />
                    Request (I want to learn this)
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>Skill Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Advanced SQL Queries & Window Functions"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>Category</label>
                  <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="academic">Academic</option>
                    <option value="technical">Technical</option>
                    <option value="creative">Creative Arts</option>
                    <option value="athletics">Sports & Motion</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>Proficiency</label>
                  <select className="form-control" value={proficiency} onChange={(e) => setProficiency(e.target.value)}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="proficient">Proficient</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>Description / Focus Details</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Outline what you can demonstrate or specific areas you want to practice together..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingListing}>
                  {savingListing ? 'Publishing...' : 'Publish Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Book Session */}
      {selectedListing && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                Book Swap: {selectedListing.skill_name}
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedListing(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleBookSession}>
              <p style={{ fontSize: '13px', color: 'var(--empiria-text-secondary)', marginBottom: '16px' }}>
                Booking this peer session will reserve <strong>{bookingCredits} credit</strong> in escrow until session completion and rating.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>Duration</label>
                  <select
                    className="form-control"
                    value={bookingMinutes}
                    onChange={(e) => setBookingMinutes(Number(e.target.value))}
                  >
                    <option value={30}>30 mins</option>
                    <option value={60}>60 mins (1 hr)</option>
                    <option value={90}>90 mins</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>Credit Escrow</label>
                  <input
                    type="number"
                    className="form-control"
                    min={1}
                    max={5}
                    value={bookingCredits}
                    onChange={(e) => setBookingCredits(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>Preparation Notes / Focus Question</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="e.g. Would like to review practice queries on window functions"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedListing(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={bookingSaving}>
                  {bookingSaving ? 'Reserving...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Complete Session */}
      {sessionToComplete && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                Verify & Complete Session
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setSessionToComplete(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCompleteSession}>
              <p style={{ fontSize: '13px', color: 'var(--empiria-text-secondary)', marginBottom: '16px' }}>
                Verifying session for <strong>{sessionToComplete.skill_name}</strong> will release <strong>{sessionToComplete.credit_cost} credit(s)</strong> from escrow to the peer mentor.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '6px' }}>Session Rating (1.0 - 5.0)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={0.5}
                    value={ratingScore}
                    onChange={(e) => setRatingScore(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--empiria-accent)' }}>
                    {ratingScore.toFixed(1)} ★
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--empiria-text-secondary)', marginBottom: '4px' }}>Peer Feedback & Endorsement</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="e.g. Excellent explanations, guided through query performance nuances very clearly!"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSessionToComplete(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={completingSession}>
                  {completingSession ? 'Releasing...' : 'Release Escrow & Settle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
