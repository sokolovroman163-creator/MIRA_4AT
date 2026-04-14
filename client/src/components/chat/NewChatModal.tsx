import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'
import Avatar from '../ui/Avatar'
import type { User } from '../../types'

type SearchUser = Pick<User, 'id' | 'displayName' | 'avatarUrl' | 'email' | 'isOnline'>

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

type Tab = 'direct' | 'group'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function NewChatModal({ isOpen, onClose }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()
  const { createDirectChat, createGroupChat } = useChatStore()

  const [tab, setTab] = useState<Tab>('direct')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Group specific state
  const [groupName, setGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<SearchUser[]>([])

  const [isCreating, setIsCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 350)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTab('direct')
      setQuery('')
      setResults([])
      setGroupName('')
      setSelectedMembers([])
      setIsCreating(false)
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  // Search users
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    api
      .get<SearchUser[]>(`/api/users/search?q=${encodeURIComponent(debouncedQuery.trim())}`)
      .then(data => setResults(data.filter(u => u.id !== currentUser?.id)))
      .catch(() => setResults([]))
      .finally(() => setIsSearching(false))
  }, [debouncedQuery, currentUser?.id])

  // Handle direct chat creation
  const handleDirectChat = useCallback(
    async (userId: string) => {
      if (isCreating) return
      setIsCreating(true)
      try {
        const chatId = await createDirectChat(userId)
        onClose()
        navigate(`/chat/${chatId}`)
      } catch (err) {
        console.error('[NewChatModal] Direct chat error:', err)
      } finally {
        setIsCreating(false)
      }
    },
    [createDirectChat, navigate, onClose, isCreating]
  )

  // Toggle member selection for group
  const toggleMember = useCallback((user: SearchUser) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.id === user.id)
      return exists ? prev.filter(m => m.id !== user.id) : [...prev, user]
    })
  }, [])

  // Handle group creation
  const handleCreateGroup = useCallback(async () => {
    if (isCreating || !groupName.trim() || selectedMembers.length === 0) return
    setIsCreating(true)
    try {
      const chatId = await createGroupChat(
        groupName.trim(),
        selectedMembers.map(m => m.id)
      )
      onClose()
      navigate(`/chat/${chatId}`)
    } catch (err) {
      console.error('[NewChatModal] Group chat error:', err)
    } finally {
      setIsCreating(false)
    }
  }, [createGroupChat, navigate, onClose, groupName, selectedMembers, isCreating])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const canCreateGroup = groupName.trim().length >= 1 && selectedMembers.length >= 1

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 200,
            }}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 201,
              background: 'var(--bg-primary)',
              borderRadius: '20px 20px 0 0',
              paddingBottom: `calc(24px + env(safe-area-inset-bottom))`,
              maxHeight: '85dvh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              // Desktop: centered modal
            }}
            // Prevent backdrop click propagation
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: 'var(--separator)',
                margin: '12px auto 0',
                flexShrink: 0,
              }}
            />

            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px 8px',
                flexShrink: 0,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.2px',
                }}
              >
                {tab === 'direct' ? t('chats.newChat') : t('chats.newGroup')}
              </h2>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  background: 'var(--bg-tertiary)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label={t('common.close')}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M1 1l10 10M11 1L1 11"
                    stroke="var(--text-secondary)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </motion.button>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                padding: '0 20px 12px',
                flexShrink: 0,
              }}
            >
              {(['direct', 'group'] as Tab[]).map(t_ => (
                <motion.button
                  key={t_}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setTab(t_)
                    setQuery('')
                    setResults([])
                    if (t_ === 'direct') setSelectedMembers([])
                    setTimeout(() => inputRef.current?.focus(), 100)
                  }}
                  style={{
                    height: 34,
                    paddingLeft: 16,
                    paddingRight: 16,
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    transition: 'background 0.15s, color 0.15s',
                    background: tab === t_ ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: tab === t_ ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {t_ === 'direct' ? t('chats.newChat') : t('chats.newGroup')}
                </motion.button>
              ))}
            </div>

            {/* Group name input (group tab only) */}
            <AnimatePresence initial={false}>
              {tab === 'group' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden', flexShrink: 0 }}
                >
                  <div style={{ padding: '0 20px 10px' }}>
                    <input
                      type="text"
                      value={groupName}
                      onChange={e => setGroupName(e.target.value)}
                      placeholder={t('group.name')}
                      maxLength={50}
                      style={{
                        width: '100%',
                        height: 44,
                        borderRadius: 12,
                        background: 'var(--bg-tertiary)',
                        border: '1.5px solid transparent',
                        padding: '0 14px',
                        fontSize: 15,
                        color: 'var(--text-primary)',
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Selected members chips (group tab) */}
            <AnimatePresence initial={false}>
              {tab === 'group' && selectedMembers.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ overflow: 'hidden', flexShrink: 0 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      padding: '0 20px 10px',
                    }}
                  >
                    {selectedMembers.map(m => (
                      <motion.button
                        key={m.id}
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => toggleMember(m)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          height: 30,
                          paddingLeft: 8,
                          paddingRight: 8,
                          borderRadius: 10,
                          background: 'rgba(0,122,255,0.12)',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        <Avatar src={m.avatarUrl} name={m.displayName} size={20} />
                        <span
                          style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)' }}
                        >
                          {m.displayName}
                        </span>
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M1 1l10 10M11 1L1 11"
                            stroke="var(--accent)"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search input */}
            <div style={{ padding: '0 20px 8px', flexShrink: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  height: 44,
                  borderRadius: 14,
                  background: 'var(--bg-tertiary)',
                  padding: '0 14px',
                  border: '1.5px solid transparent',
                  transition: 'border-color 0.15s',
                }}
                onFocusCapture={e =>
                  ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)')
                }
                onBlurCapture={e =>
                  ((e.currentTarget as HTMLDivElement).style.borderColor = 'transparent')
                }
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="7" stroke="var(--text-tertiary)" strokeWidth="1.8" />
                  <path
                    d="M16.5 16.5L21 21"
                    stroke="var(--text-tertiary)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={t('search.placeholder')}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: 15,
                    fontFamily: 'inherit',
                  }}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <AnimatePresence>
                  {query.length > 0 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.15 }}
                      onClick={() => {
                        setQuery('')
                        inputRef.current?.focus()
                      }}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        background: 'var(--text-tertiary)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M1 1l10 10M11 1L1 11"
                          stroke="white"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Results list */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
              }}
            >
              {/* Searching spinner */}
              {isSearching && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                  <div
                    className="animate-spin rounded-full border-2 border-t-transparent"
                    style={{
                      width: 22,
                      height: 22,
                      borderColor: 'var(--accent)',
                      borderTopColor: 'transparent',
                    }}
                  />
                </div>
              )}

              {/* User results */}
              <AnimatePresence initial={false}>
                {results.length > 0 && !isSearching && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    {results.map((u, i) => {
                      const isSelected =
                        tab === 'group' && selectedMembers.some(m => m.id === u.id)
                      return (
                        <motion.div
                          key={u.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.18 }}
                        >
                          <motion.button
                            whileTap={{ scale: 0.99, opacity: 0.8 }}
                            onClick={() => {
                              if (tab === 'direct') {
                                handleDirectChat(u.id)
                              } else {
                                toggleMember(u)
                              }
                            }}
                            disabled={isCreating && tab === 'direct'}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '10px 20px',
                              background: isSelected
                                ? 'rgba(0,122,255,0.06)'
                                : 'none',
                              border: 'none',
                              cursor: 'pointer',
                              textAlign: 'left',
                              fontFamily: 'inherit',
                              transition: 'background 0.12s',
                            }}
                          >
                            <Avatar
                              src={u.avatarUrl}
                              name={u.displayName}
                              size={46}
                              online={u.isOnline}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  color: 'var(--text-primary)',
                                  fontSize: 15,
                                  fontWeight: 500,
                                  marginBottom: 2,
                                }}
                                className="truncate"
                              >
                                {u.displayName}
                              </div>
                              <div
                                style={{ color: 'var(--text-secondary)', fontSize: 13 }}
                                className="truncate"
                              >
                                {u.isOnline ? t('common.online') : u.email}
                              </div>
                            </div>

                            {/* Right indicator */}
                            {tab === 'direct' ? (
                              isCreating ? (
                                <div
                                  className="animate-spin rounded-full border-2 border-t-transparent"
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderColor: 'var(--accent)',
                                    borderTopColor: 'transparent',
                                    flexShrink: 0,
                                  }}
                                />
                              ) : (
                                <svg
                                  width="7"
                                  height="12"
                                  viewBox="0 0 7 12"
                                  fill="none"
                                  style={{ flexShrink: 0 }}
                                >
                                  <path
                                    d="M1 1l5 5-5 5"
                                    stroke="var(--text-tertiary)"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )
                            ) : (
                              <div
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 12,
                                  border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--separator)'}`,
                                  background: isSelected ? 'var(--accent)' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  transition: 'all 0.15s',
                                }}
                              >
                                {isSelected && (
                                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                                    <path
                                      d="M1 5l3.5 3.5L11 1"
                                      stroke="white"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </div>
                            )}
                          </motion.button>
                          {i < results.length - 1 && (
                            <div
                              style={{
                                height: 1,
                                background: 'var(--separator)',
                                marginLeft: 78,
                              }}
                            />
                          )}
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Empty / hint state */}
              {!isSearching && results.length === 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '32px 24px',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: 'rgba(0,122,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" stroke="var(--accent)" strokeWidth="1.6" />
                      <path
                        d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
                        stroke="var(--accent)"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: 14,
                      textAlign: 'center',
                      margin: 0,
                    }}
                  >
                    {debouncedQuery.trim().length >= 2
                      ? t('search.noResults')
                      : t('search.hint', { defaultValue: 'Введите имя или email пользователя' })}
                  </p>
                </div>
              )}
            </div>

            {/* Create group button (group tab only) */}
            <AnimatePresence>
              {tab === 'group' && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.2 }}
                  style={{ padding: '12px 20px 0', flexShrink: 0 }}
                >
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleCreateGroup}
                    disabled={!canCreateGroup || isCreating}
                    style={{
                      width: '100%',
                      height: 50,
                      borderRadius: 14,
                      background: canCreateGroup ? 'var(--accent)' : 'var(--bg-tertiary)',
                      color: canCreateGroup ? '#fff' : 'var(--text-tertiary)',
                      fontSize: 16,
                      fontWeight: 600,
                      border: 'none',
                      cursor: canCreateGroup ? 'pointer' : 'not-allowed',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'background 0.2s, color 0.2s',
                    }}
                  >
                    {isCreating ? (
                      <div
                        className="animate-spin rounded-full border-2 border-t-transparent"
                        style={{
                          width: 20,
                          height: 20,
                          borderColor: '#fff',
                          borderTopColor: 'transparent',
                        }}
                      />
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M12 5v14M5 12h14"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                          />
                        </svg>
                        {t('chats.newGroup')}
                        {selectedMembers.length > 0 && ` (${selectedMembers.length})`}
                      </>
                    )}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
