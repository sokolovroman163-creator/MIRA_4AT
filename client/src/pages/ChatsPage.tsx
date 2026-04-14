import { useEffect, useRef, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import ChatListItem from '../components/chat/ChatListItem'
import { ChatListSkeleton } from '../components/ui/Skeleton'
import NewChatModal from '../components/chat/NewChatModal'

export default function ChatsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const { chats, isLoading, hasMore, loadChats, loadMoreChats } = useChatStore()
  const [showNewChat, setShowNewChat] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY = useRef<number>(0)
  const touchDeltaY = useRef<number>(0)

  // Initial load
  useEffect(() => {
    if (chats.length === 0) {
      loadChats(true)
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMoreChats()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, isLoading, loadMoreChats])

  // Pull-to-refresh (touch)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scroll = scrollRef.current
    if (!scroll || scroll.scrollTop > 0) return
    touchStartY.current = e.touches[0].clientY
    touchDeltaY.current = 0
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const scroll = scrollRef.current
    if (!scroll || scroll.scrollTop > 0) return
    touchDeltaY.current = e.touches[0].clientY - touchStartY.current
  }, [])

  const handleTouchEnd = useCallback(async () => {
    if (touchDeltaY.current > 80 && !refreshing) {
      setRefreshing(true)
      await loadChats(true)
      setRefreshing(false)
    }
    touchDeltaY.current = 0
  }, [refreshing, loadChats])

  // Determine active chat from URL
  const activeChatId = location.pathname.startsWith('/chat/')
    ? location.pathname.split('/chat/')[1]
    : null

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--bg-secondary)' }}
    >
      {/* Header */}
      <div
        className="no-select"
        style={{
          paddingTop: `calc(12px + env(safe-area-inset-top))`,
          paddingLeft: 16,
          paddingRight: 12,
          paddingBottom: 8,
          flexShrink: 0,
          background: 'var(--bg-secondary)',
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
          <h1
            style={{
              color: 'var(--text-primary)',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.3px',
              margin: 0,
            }}
          >
            {t('chats.title')}
          </h1>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setShowNewChat(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: 'rgba(0,122,255,0.12)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label={t('chats.newChat')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </motion.button>
        </div>

        {/* Search bar — navigates to search page */}
        <motion.button
          whileTap={{ scale: 0.99 }}
          onClick={() => navigate('/search')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 36,
            borderRadius: 11,
            background: 'var(--bg-tertiary)',
            padding: '0 12px',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="var(--text-tertiary)" strokeWidth="1.8"/>
            <path d="M16.5 16.5L21 21" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
            {t('chats.search')}
          </span>
        </motion.button>
      </div>

      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {refreshing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 36, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <div
              className="animate-spin rounded-full border-2 border-t-transparent"
              style={{ width: 20, height: 20, borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat list */}
      <div
        ref={scrollRef}
        className="flex-1 scroll-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Loading skeleton */}
        {isLoading && chats.length === 0 && (
          <ChatListSkeleton />
        )}

        {/* Chat items */}
        {chats.length > 0 && (
          <AnimatePresence initial={false}>
            {chats.map((chat, i) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i < 10 ? i * 0.03 : 0, duration: 0.2 }}
              >
                <ChatListItem
                  chat={chat}
                  isActive={chat.id === activeChatId}
                  currentUserId={user?.id}
                />
                {/* Separator */}
                <div
                  style={{
                    height: 1,
                    background: 'var(--separator)',
                    marginLeft: 78,
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Empty state */}
        {!isLoading && chats.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 32px',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: 'rgba(0,122,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
                  fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, margin: 0 }}>
              {t('chats.noChats')}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center', margin: 0 }}>
              {t('chats.startConversation', 'Нажмите + чтобы начать новый чат')}
            </p>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowNewChat(true)}
              style={{
                marginTop: 8,
                height: 44,
                paddingLeft: 20,
                paddingRight: 20,
                borderRadius: 14,
                background: 'var(--accent)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t('chats.newChat')}
            </motion.button>
          </motion.div>
        )}

        {/* Load more sentinel */}
        <div ref={loadMoreRef} style={{ height: 1 }} />

        {/* Loading more indicator */}
        {isLoading && chats.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
            <div
              className="animate-spin rounded-full border-2 border-t-transparent"
              style={{ width: 20, height: 20, borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
            />
          </div>
        )}
      </div>

      {/* New chat modal */}
      <NewChatModal
        isOpen={showNewChat}
        onClose={() => setShowNewChat(false)}
      />
    </div>
  )
}
