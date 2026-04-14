import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'
import Avatar from '../ui/Avatar'
import type { Message } from '../../types'

interface Props {
  isOpen: boolean
  message: Message | null
  onClose: () => void
  onForward: (chatId: string) => void
}

export default function ForwardMessageModal({ isOpen, message, onClose, onForward }: Props) {
  const { t } = useTranslation()
  const { chats } = useChatStore()
  const { user: currentUser } = useAuthStore()
  const [search, setSearch] = useState('')

  const filteredChats = useMemo(() => {
    if (!search.trim()) return chats

    const q = search.toLowerCase()
    return chats.filter(c => {
      // Search by chat name
      if (c.name?.toLowerCase().includes(q)) return true
      // Search by member displayName (for direct chats)
      if (c.members?.some(m =>
        m.userId !== currentUser?.id &&
        m.user?.displayName.toLowerCase().includes(q)
      )) return true
      return false
    })
  }, [chats, search, currentUser])

  // Reset search on close
  const handleClose = () => {
    setSearch('')
    onClose()
  }

  const handleSelect = (chatId: string) => {
    setSearch('')
    onForward(chatId)
  }

  const getChatDisplayName = (chat: typeof chats[0]): string => {
    if (chat.type === 'group') return chat.name || t('chats.newGroup')
    const other = chat.members?.find(m => m.userId !== currentUser?.id)
    return other?.user?.displayName || chat.name || '...'
  }

  const getChatAvatar = (chat: typeof chats[0]): string | undefined => {
    if (chat.type === 'group') return chat.avatarUrl
    const other = chat.members?.find(m => m.userId !== currentUser?.id)
    return other?.user?.avatarUrl || chat.avatarUrl
  }

  const getPreviewText = (): string => {
    if (!message) return ''
    if (message.type === 'text') return message.content.slice(0, 80)
    if (message.type === 'image') return t('chats.photo')
    if (message.type === 'gif') return t('chats.gif')
    if (message.type === 'audio') return t('chats.voice')
    return message.content.slice(0, 80)
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="forward-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              zIndex: 1100,
            }}
          />

          {/* Modal */}
          <motion.div
            key="forward-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(400px, calc(100vw - 32px))',
              maxHeight: 'min(520px, 80vh)',
              background: 'var(--bg-secondary)',
              borderRadius: 16,
              boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
              border: '1px solid var(--separator)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: 1101,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: '1px solid var(--separator)',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                {t('messages.forwardTo')}
              </span>
              <button
                onClick={handleClose}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  background: 'var(--bg-tertiary)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Message preview */}
            {message && (
              <div
                style={{
                  padding: '10px 16px',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  borderBottom: '1px solid var(--separator)',
                  flexShrink: 0,
                }}
              >
                <div style={{ width: 3, height: 28, background: 'var(--accent)', borderRadius: 2, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                    {message.sender?.displayName}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {getPreviewText()}
                  </div>
                </div>
              </div>
            )}

            {/* Search */}
            <div style={{ padding: '10px 16px', flexShrink: 0 }}>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('messages.forwardSearch')}
                autoFocus
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            {/* Chat list */}
            <div
              className="scroll-container"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '0 8px 8px',
              }}
            >
              {filteredChats.length === 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 80,
                    color: 'var(--text-tertiary)',
                    fontSize: 14,
                  }}
                >
                  {t('search.noResults')}
                </div>
              )}

              {filteredChats.map(chat => {
                const name = getChatDisplayName(chat)
                const avatar = getChatAvatar(chat)

                return (
                  <button
                    key={chat.id}
                    onClick={() => handleSelect(chat.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '10px 8px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      borderRadius: 10,
                      textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Avatar src={avatar} name={name} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {name}
                      </div>
                      {chat.type === 'group' && chat.members && (
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                          {chat.members.length} {t('chats.members')}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
