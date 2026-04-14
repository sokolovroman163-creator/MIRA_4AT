import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, isToday, isYesterday } from 'date-fns'
import { ru, enUS } from 'date-fns/locale'
import { motion } from 'framer-motion'
import type { Message } from '../../types'
import ImageMessage from './ImageMessage'
import MediaLightbox from './MediaLightbox'
import AudioMessage from './AudioMessage'
import LinkPreviewCard from './LinkPreviewCard'

interface Props {
  message: Message
  isOwn: boolean
  /** Show avatar + name (for group chats, non-own messages) */
  showSender: boolean
  senderName?: string
  senderAvatarUrl?: string
  /** Whether this is the last in a consecutive run from the same sender */
  isLastInGroup: boolean
  /** Whether this is the first in a consecutive run */
  isFirstInGroup: boolean
  onContextMenu?: (e: React.MouseEvent, message: Message) => void
}

function formatTime(dateStr: string, lang: string): string {
  try {
    const d = new Date(dateStr)
    const locale = lang === 'ru' ? ru : enUS
    if (isToday(d)) return format(d, 'HH:mm')
    if (isYesterday(d)) return format(d, 'HH:mm')
    return format(d, 'd MMM, HH:mm', { locale })
  } catch {
    return ''
  }
}

const MessageBubble = memo(function MessageBubble({
  message,
  isOwn,
  showSender,
  senderName,
  isLastInGroup,
  isFirstInGroup,
  onContextMenu,
}: Props) {
  const { i18n, t } = useTranslation()
  const lang = i18n.language
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const time = formatTime(message.createdAt, lang)
  const isPending = message.status === 'pending'
  const isDeleted = message.isDeleted

  const isImage = message.type === 'image'
  const isGif = message.type === 'gif'
  const isAudio = message.type === 'audio'
  const isMedia = isImage || isGif

  // Media uses a slightly different bubble shape (no text padding at top)
  const ownRadius = isLastInGroup ? '18px 18px 4px 18px' : '18px 18px 18px 18px'
  const inRadius = isLastInGroup ? '18px 18px 18px 4px' : '18px 18px 18px 18px'

  // The URL for the media
  const mediaSrc = isMedia ? (message.fileUrl || message.content) : ''
  const audioSrc = isAudio ? (message.fileUrl || message.content) : ''

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isOwn ? 'flex-end' : 'flex-start',
          paddingLeft: isOwn ? 48 : 12,
          paddingRight: isOwn ? 12 : 48,
          marginBottom: isLastInGroup ? 6 : 2,
        }}
      >
        {/* Sender name in group chats */}
        {showSender && isFirstInGroup && senderName && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--accent)',
              marginBottom: 2,
              paddingLeft: 4,
            }}
          >
            {senderName}
          </div>
        )}

        {/* Bubble */}
        <div
          onContextMenu={(e) => {
            if (onContextMenu) {
              e.preventDefault()
              onContextMenu(e, message)
            }
          }}
          style={{
            maxWidth: isMedia ? 'min(280px, 75vw)' : isAudio ? 'min(300px, 80vw)' : '75%',
            borderRadius: isOwn ? ownRadius : inRadius,
            background: isMedia ? 'transparent' : isOwn ? 'var(--bubble-out)' : 'var(--bubble-in)',
            color: isOwn ? 'var(--bubble-out-text)' : 'var(--bubble-in-text)',
            padding: isDeleted ? '7px 12px' : isMedia ? 0 : isAudio ? '10px 12px' : '8px 12px',
            wordBreak: 'break-word',
            position: 'relative',
            opacity: isPending ? 0.72 : 1,
            transition: 'opacity 0.2s',
            overflow: isMedia ? 'hidden' : 'visible',
            cursor: onContextMenu ? 'context-menu' : 'default',
            WebkitUserSelect: 'none', // helps mobile long-press
          }}
        >
          {/* Deleted message */}
          {isDeleted ? (
            <span style={{ fontStyle: 'italic', opacity: 0.6, fontSize: 14 }}>
              {t('messages.deleted')}
            </span>
          ) : (
            <>
              {/* Forwarded Header */}
              {message.forwardedFromId && (
                <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M21 10H11a5 5 0 00-5 5v2m0-7l4-4m-4 4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  {t('messages.forwardedFrom')}
                </div>
              )}

              {/* Reply Block */}
              {message.replyTo && (
                <div
                  style={{
                    display: 'flex',
                    background: 'rgba(0,0,0,0.06)',
                    borderRadius: 6,
                    overflow: 'hidden',
                    marginBottom: 6,
                    padding: '4px 8px 4px 6px',
                    borderLeft: '2px solid var(--accent)',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    // In a real app we would scroll to it
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', lineHeight: 1.2 }}>
                      {message.replyTo.senderId === message.senderId ? (isOwn ? t('chats.you') : senderName) : t('messages.replyTo')}
                    </span>
                    <span style={{ fontSize: 13, opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {message.replyTo.type === 'text' ? message.replyTo.content :
                       message.replyTo.type === 'image' ? t('chats.photo') :
                       message.replyTo.type === 'gif' ? t('chats.gif') :
                       message.replyTo.type === 'audio' ? t('chats.voice') :
                       ''}
                    </span>
                  </div>
                </div>
              )}

              {isMedia ? (
                /* ── Media bubble (image / gif) ── */
                <div style={{ position: 'relative', borderRadius: isOwn ? ownRadius : inRadius, overflow: 'hidden' }}>
                  <ImageMessage
                    src={mediaSrc}
                    alt={isGif ? 'GIF' : 'Photo'}
                    onExpand={() => setLightboxOpen(true)}
                  />
                  {/* Time overlay on media */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 6,
                      right: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      background: 'rgba(0,0,0,0.45)',
                      borderRadius: 8,
                      padding: '2px 5px',
                    }}
                  >
                    <span style={{ fontSize: 11, color: 'white', lineHeight: 1 }}>{time}</span>
                    {isOwn && <MessageStatus status={message.status} isPending={isPending} white />}
                  </div>
                </div>
              ) : isAudio ? (
                /* ── Audio / voice message bubble ── */
                <>
                  <AudioMessage
                    src={audioSrc}
                    duration={message.duration}
                    isOwn={isOwn}
                  />
                  {/* Time + status row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 3,
                      marginTop: 4,
                      marginBottom: -2,
                    }}
                  >
                    <span style={{ fontSize: 11, opacity: 0.65, letterSpacing: '0.1px', lineHeight: 1 }}>
                      {time}
                    </span>
                    {isOwn && <MessageStatus status={message.status} isPending={isPending} />}
                  </div>
                </>
              ) : (
                /* ── Text bubble ── */
                <>
                  <span
                    style={{
                      fontSize: 15,
                      lineHeight: 1.45,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {message.content}
                  </span>

                  {/* Link preview */}
                  {message.linkPreview && (
                    <LinkPreviewCard preview={message.linkPreview} isOwn={isOwn} />
                  )}

                  {/* Time + status row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 3,
                      marginTop: 3,
                      marginBottom: -2,
                    }}
                  >
                    {message.isEdited && (
                      <span style={{ fontSize: 11, opacity: 0.65, marginRight: 2 }}>
                        {t('messages.edited')}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        opacity: 0.65,
                        letterSpacing: '0.1px',
                        lineHeight: 1,
                      }}
                    >
                      {time}
                    </span>
                    {isOwn && <MessageStatus status={message.status} isPending={isPending} />}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Reactions row */}
        {message.reactions && message.reactions.length > 0 && !isDeleted && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            marginTop: -6,
            marginBottom: 4,
            marginLeft: isOwn ? 0 : 8,
            marginRight: isOwn ? 8 : 0,
            zIndex: 1,
            justifyContent: isOwn ? 'flex-end' : 'flex-start',
            maxWidth: '75%',
          }}>
            {/* Group identical emojis */}
            {Object.entries(
              message.reactions.reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1
                return acc
              }, {} as Record<string, number>)
            ).map(([emoji, count]) => (
              <div
                key={emoji}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--separator)',
                  padding: '2px 6px',
                  borderRadius: 12,
                  fontSize: 12,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <span>{emoji}</span>
                {count > 1 && <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{count}</span>}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Lightbox for full-screen view */}
      {isMedia && (
        <MediaLightbox
          src={mediaSrc}
          alt={isGif ? 'GIF' : 'Photo'}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  )
})

function MessageStatus({
  status,
  isPending,
  white,
}: {
  status?: string
  isPending: boolean
  white?: boolean
}) {
  const color = white ? 'white' : 'currentColor'

  if (isPending) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.75, flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" />
        <path d="M12 7v5l3 3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (status === 'read') {
    return (
      <svg width="16" height="10" viewBox="0 0 16 10" fill="none" style={{ flexShrink: 0 }}>
        <path d="M1 5l3.5 3.5L11.5 1" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 5l3.5 3.5L16 1" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (status === 'delivered') {
    return (
      <svg width="16" height="10" viewBox="0 0 16 10" fill="none" style={{ opacity: 0.65, flexShrink: 0 }}>
        <path d="M1 5l3.5 3.5L11.5 1" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 5l3.5 3.5L16 1" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <svg width="11" height="10" viewBox="0 0 12 10" fill="none" style={{ opacity: 0.65, flexShrink: 0 }}>
      <path d="M1 5l3.5 3.5L11 1" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default MessageBubble
