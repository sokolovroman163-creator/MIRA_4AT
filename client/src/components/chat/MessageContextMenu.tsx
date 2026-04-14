import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { Message } from '../../types'
import { useIsMobile } from '../../hooks/useIsMobile'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'

interface Props {
  message: Message | null
  anchorRef?: React.RefObject<HTMLElement | null>
  isOpen: boolean
  isOwn: boolean
  onClose: () => void
  onReply: (msg: Message) => void
  onForward: (msg: Message) => void
  onEdit?: (msg: Message) => void
  onDelete?: (msg: Message) => void
  onReact: (emoji: string) => void
}

const QUICK_REACTIONS = ['👍', '👎', '❤️', '🔥', '😂', '😢', '😮']

export default function MessageContextMenu({
  message,
  anchorRef,
  isOpen,
  isOwn,
  onClose,
  onReply,
  onForward,
  onEdit,
  onDelete,
  onReact,
}: Props) {
  const { t, i18n } = useTranslation()
  const isMobile = useIsMobile()
  const menuRef = useRef<HTMLDivElement>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})

  // Compute menu position when opening (desktop only)
  useEffect(() => {
    if (!isOpen || isMobile || !anchorRef?.current) {
      setMenuStyle({})
      return
    }
    const rect = anchorRef.current.getBoundingClientRect()
    const menuHeight = 320 // estimated max menu height
    const menuWidth = 220

    // Vertical: prefer below, flip above if not enough space
    let top = rect.bottom + 4
    if (top + menuHeight > window.innerHeight - 16) {
      top = rect.top - menuHeight - 4
      if (top < 16) top = 16
    }

    // Horizontal: own messages align right, others align left
    let left = isOwn ? rect.right - menuWidth : rect.left
    if (left < 16) left = 16
    if (left + menuWidth > window.innerWidth - 16) left = window.innerWidth - menuWidth - 16

    setMenuStyle({ position: 'fixed', top, left, maxHeight: window.innerHeight - 32, overflowY: 'auto' as const })
  }, [isOpen, isMobile, isOwn, anchorRef])

  // Close on outside click or scroll
  useEffect(() => {
    if (!isOpen) {
      setShowEmojiPicker(false)
      return
    }

    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleScroll = (e: Event) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    // Capture true to trigger before React's synthetic events
    document.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen, onClose])

  if (!message || !isOpen) return null

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content)
    }
    onClose()
  }

  // Common wrapper for actions
  const handleAction = (action: () => void) => {
    action()
    onClose()
  }

  const content = (
    <motion.div
      ref={menuRef}
      key="context-menu"
      initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
      animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
      exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        ...(isMobile ? {
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--bg-secondary)',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: '16px 16px calc(16px + env(safe-area-inset-bottom))',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.1)',
        } : {
          ...menuStyle,
          background: 'var(--bg-secondary)',
          borderRadius: 14,
          padding: 8,
          width: 220,
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          border: '1px solid var(--separator)',
        }),
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Quick Reactions */}
      <div style={{ display: 'flex', gap: 6, padding: '4px 8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        {QUICK_REACTIONS.map(emoji => (
          <button
            key={emoji}
            onClick={() => handleAction(() => onReact(emoji))}
            style={{
              fontSize: 24,
              padding: '6px 10px',
              background: 'var(--bg-tertiary)',
              borderRadius: 16,
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {emoji}
          </button>
        ))}
        {/* Open full picker */}
        <button
          onClick={() => setShowEmojiPicker(v => !v)}
          style={{
            fontSize: 20,
            padding: '8px 12px',
            background: showEmojiPicker ? 'rgba(0,122,255,0.1)' : 'var(--bg-tertiary)',
            color: showEmojiPicker ? 'var(--accent)' : 'var(--text-secondary)',
            borderRadius: 16,
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
             <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Full Emoji Picker (Desktop drops down, mobile pushes content up) */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', alignSelf: 'center', marginTop: 8 }}
          >
            <Picker
              data={data}
              locale={i18n.language}
              theme="auto"
              set="native"
              skinTonePosition="search"
              previewPosition="none"
              onEmojiSelect={(emoji: { native: string }) => handleAction(() => onReact(emoji.native))}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ height: 1, background: 'var(--separator)', margin: '4px 0' }} />

      {/* Menu Actions */}
      <MenuButton
        icon={<path d="M3 10h10a5 5 0 015 5v2m0-7l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
        label={t('messages.reply')}
        onClick={() => handleAction(() => onReply(message))}
      />
      
      {message.type === 'text' && (
        <MenuButton
          icon={<><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></>}
          label={t('messages.copy')}
          onClick={handleCopy}
        />
      )}

      <MenuButton
        icon={<path d="M21 10H11a5 5 0 00-5 5v2m0-7l4-4m-4 4l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
        label={t('messages.forward')}
        onClick={() => handleAction(() => onForward(message))}
      />

      {isOwn && onEdit && message.type === 'text' && (
        <MenuButton
          icon={<path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
          label={t('messages.edit')}
          onClick={() => handleAction(() => onEdit(message))}
        />
      )}

      {((isOwn && onDelete) || (!isOwn && onDelete /* Check for admin later */)) && (
        <MenuButton
          icon={<path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2m-6 5v6m4-6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
          label={t('messages.delete')}
          onClick={() => handleAction(() => onDelete(message))}
          destructive
        />
      )}
    </motion.div>
  )

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile Overlay */}
          {isMobile && (
            <motion.div
              key="context-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                zIndex: 999,
              }}
            />
          )}
          {content}
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

function MenuButton({ icon, label, onClick, destructive }: { icon: React.ReactNode, label: string, onClick: () => void, destructive?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        width: '100%',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: destructive ? '#FF3B30' : 'var(--text-primary)',
        fontSize: 15,
        fontWeight: 500,
        textAlign: 'left',
        borderRadius: 8,
        transition: 'background 0.1s',
      }}
      onMouseOver={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        {icon}
      </svg>
      {label}
    </button>
  )
}
