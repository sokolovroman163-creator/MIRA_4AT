import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import Avatar from '../components/ui/Avatar'
import type { User } from '../types'

type SearchUser = Pick<User, 'id' | 'displayName' | 'avatarUrl' | 'email' | 'isOnline' | 'lastSeen'>

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function SearchPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()
  const { createDirectChat } = useChatStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [startingChatId, setStartingChatId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 350)

  // Auto-focus on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(t)
  }, [])

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    api.get<SearchUser[]>(`/api/users/search?q=${encodeURIComponent(debouncedQuery.trim())}`)
      .then(data => {
        // Exclude current user from results
        setResults(data.filter(u => u.id !== currentUser?.id))
      })
      .catch(() => setResults([]))
      .finally(() => setIsSearching(false))
  }, [debouncedQuery, currentUser?.id])

  const handleStartChat = useCallback(async (userId: string) => {
    if (startingChatId === userId) return
    setStartingChatId(userId)
    try {
      const chatId = await createDirectChat(userId)
      navigate(`/chat/${chatId}`, { replace: false })
    } catch (err) {
      console.error('[Search] Start chat error:', err)
    } finally {
      setStartingChatId(null)
    }
  }, [createDirectChat, navigate, startingChatId])

  const showEmpty = debouncedQuery.trim().length >= 2 && !isSearching && results.length === 0
  const showResults = results.length > 0

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--bg-secondary)' }}
    >
      {/* Header */}
      <div
        style={{
          paddingTop: `calc(12px + env(safe-area-inset-top))`,
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 12,
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            color: 'var(--text-primary)',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.3px',
            marginBottom: 12,
          }}
        >
          {t('search.title')}
        </h1>

        {/* Search input */}
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
          onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)' }}
          onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="7" stroke="var(--text-tertiary)" strokeWidth="1.8"/>
            <path d="M16.5 16.5L21 21" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round"/>
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
              fontSize: 16,
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
                onClick={() => { setQuery(''); inputRef.current?.focus() }}
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
                  <path d="M1 1l10 10M11 1L1 11" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 scroll-container">
        {/* Searching indicator */}
        {isSearching && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <div
              className="animate-spin rounded-full border-2 border-t-transparent"
              style={{ width: 22, height: 22, borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {/* Results */}
        <AnimatePresence initial={false}>
          {showResults && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div
                style={{
                  padding: '4px 16px 8px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {t('search.users')}
              </div>
              {results.map((u, i) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                >
                  <motion.button
                    whileTap={{ scale: 0.99, opacity: 0.8 }}
                    onClick={() => handleStartChat(u.id)}
                    disabled={startingChatId === u.id}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 16px',
                      background: 'none',
                      border: 'none',
                      cursor: startingChatId === u.id ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      opacity: startingChatId === u.id ? 0.6 : 1,
                    }}
                  >
                    <Avatar src={u.avatarUrl} name={u.displayName} size={46} online={u.isOnline} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: 'var(--text-primary)',
                          fontSize: 16,
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
                        {u.isOnline
                          ? t('common.online')
                          : u.email}
                      </div>
                    </div>
                    {startingChatId === u.id ? (
                      <div
                        className="animate-spin rounded-full border-2 border-t-transparent"
                        style={{ width: 18, height: 18, borderColor: 'var(--accent)', borderTopColor: 'transparent', flexShrink: 0 }}
                      />
                    ) : (
                      <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M1 1l5 5-5 5" stroke="var(--text-tertiary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </motion.button>
                  {i < results.length - 1 && (
                    <div style={{ height: 1, background: 'var(--separator)', marginLeft: 74 }} />
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        <AnimatePresence>
          {showEmpty && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '48px 32px',
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: 'var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 4,
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="var(--text-tertiary)" strokeWidth="1.6"/>
                  <path d="M16.5 16.5L21 21" stroke="var(--text-tertiary)" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </div>
              <p style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, margin: 0 }}>
                {t('search.noResults')}
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center', margin: 0 }}>
                «{debouncedQuery}»
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hint when input is empty */}
        {query.trim().length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '48px 32px',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: 'rgba(0,122,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="var(--accent)" strokeWidth="1.6"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center', margin: 0 }}>
              {t('search.hint', 'Введите имя или email пользователя')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
