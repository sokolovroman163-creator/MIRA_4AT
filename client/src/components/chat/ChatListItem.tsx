import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { isToday, isYesterday, format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { Chat } from '../../types'
import Avatar from '../ui/Avatar'

interface ChatListItemProps {
  chat: Chat
  isActive?: boolean
  /** Current user id — to show "You: " prefix on own messages */
  currentUserId?: string
}

function formatTime(dateStr: string, lang: string): string {
  const date = new Date(dateStr)
  const locale = lang.startsWith('ru') ? ru : undefined
  if (isToday(date)) {
    return format(date, 'HH:mm')
  }
  if (isYesterday(date)) {
    return lang.startsWith('ru') ? 'Вчера' : 'Yesterday'
  }
  const diff = Date.now() - date.getTime()
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return format(date, 'EEE', { locale })
  }
  return format(date, 'dd.MM.yy')
}

function getLastMessageText(
  chat: Chat,
  currentUserId: string | undefined,
  t: (key: string) => string
): string {
  const msg = chat.lastMessage
  if (!msg) return ''
  if (msg.type === 'system') return msg.content
  if (msg.type === 'image') return `📷 ${t('chats.photo')}`
  if (msg.type === 'audio') return `🎤 ${t('chats.voice')}`
  if (msg.type === 'gif') return `GIF`

  const isOwn = msg.senderId === currentUserId
  const prefix = isOwn ? (t('chats.you') + ': ') : ''
  return prefix + (msg.content || '')
}

const ChatListItem = memo(function ChatListItem({
  chat,
  isActive = false,
  currentUserId,
}: ChatListItemProps) {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const timeStr = chat.lastMessage?.createdAt
    ? formatTime(chat.lastMessage.createdAt, i18n.language)
    : chat.createdAt
    ? formatTime(chat.createdAt, i18n.language)
    : ''

  const lastMessageText = getLastMessageText(chat, currentUserId, t)
  const hasUnread = (chat.unreadCount ?? 0) > 0

  return (
    <motion.button
      whileTap={{ scale: 0.99, backgroundColor: 'var(--bg-tertiary)' }}
      onClick={() => navigate(`/chat/${chat.id}`)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        background: isActive ? 'rgba(0,122,255,0.08)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        position: 'relative',
        transition: 'background 0.15s',
      }}
    >
      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar
          src={chat.avatarUrl}
          name={chat.name}
          size={50}
          online={false}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Row 1: name + time */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span
            className="truncate"
            style={{
              color: 'var(--text-primary)',
              fontSize: 16,
              fontWeight: hasUnread ? 600 : 500,
              flex: 1,
              minWidth: 0,
            }}
          >
            {chat.name}
          </span>
          <span
            style={{
              color: hasUnread ? 'var(--accent)' : 'var(--text-tertiary)',
              fontSize: 12,
              fontWeight: hasUnread ? 600 : 400,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {timeStr}
          </span>
        </div>

        {/* Row 2: last message + unread badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span
            className="truncate"
            style={{
              color: hasUnread ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: 14,
              fontWeight: hasUnread ? 500 : 400,
              flex: 1,
              minWidth: 0,
              lineHeight: 1.3,
            }}
          >
            {lastMessageText || <span style={{ color: 'var(--text-tertiary)' }}>{t('chats.noChats')}</span>}
          </span>

          {/* Unread badge or muted icon */}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            {chat.isMuted && !hasUnread && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {hasUnread && (
              <div
                className="badge"
                style={{
                  background: chat.isMuted ? 'var(--text-tertiary)' : 'var(--accent)',
                  minWidth: 20,
                  height: 20,
                  borderRadius: 10,
                  fontSize: 12,
                }}
              >
                {(chat.unreadCount ?? 0) > 99 ? '99+' : chat.unreadCount}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  )
})

export default ChatListItem
