import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { getSocket } from '../../services/socket'
import EmojiPicker from './EmojiPicker'
import GifPicker from './GifPicker'
import VoiceRecorder from './VoiceRecorder'
import type { Message } from '../../types'

interface Props {
  chatId: string
  replyingTo: Message | null
  editingMessage: Message | null
  onClearReply: () => void
  onCancelEdit: () => void
  onSend: (text: string) => void
  onSendImage: (file: File) => void
  onSendGif: (gifUrl: string) => void
  onSendAudio: (blob: Blob, duration: number) => void
  disabled?: boolean
}

const TYPING_THROTTLE_MS = 2000

export default function MessageInput({ chatId, replyingTo, editingMessage, onClearReply, onCancelEdit, onSend, onSendImage, onSendGif, onSendAudio, disabled }: Props) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [gifOpen, setGifOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emojiBtnRef = useRef<HTMLButtonElement>(null)
  const gifBtnRef = useRef<HTMLButtonElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  // When entering edit mode, populate the textarea with existing content
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content)
      textareaRef.current?.focus()
    }
  }, [editingMessage])

  // Auto-resize textarea
  const resize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [])

  useEffect(() => {
    resize()
  }, [text, resize])

  // Emit typing events
  const emitTyping = useCallback(() => {
    const socket = getSocket()
    if (!socket) return

    if (!isTypingRef.current) {
      isTypingRef.current = true
      socket.emit('typing_start', { chatId })
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false
      socket.emit('typing_stop', { chatId })
    }, TYPING_THROTTLE_MS)
  }, [chatId])

  const stopTyping = useCallback(() => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    if (isTypingRef.current) {
      isTypingRef.current = false
      getSocket()?.emit('typing_stop', { chatId })
    }
  }, [chatId])

  useEffect(() => {
    return () => { stopTyping() }
  }, [chatId, stopTyping])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value)
      if (e.target.value.trim()) {
        emitTyping()
      } else {
        stopTyping()
      }
    },
    [emitTyping, stopTyping]
  )

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || disabled || isUploading) return
    stopTyping()
    onSend(trimmed)
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    textareaRef.current?.focus()
  }, [text, disabled, isUploading, onSend, stopTyping])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Escape cancels reply/edit
      if (e.key === 'Escape') {
        if (editingMessage) {
          onCancelEdit()
          setText('')
          return
        }
        if (replyingTo) {
          onClearReply()
          return
        }
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend, editingMessage, replyingTo, onCancelEdit, onClearReply]
  )

  // Insert emoji at cursor position
  const handleEmojiSelect = useCallback((emoji: string) => {
    const el = textareaRef.current
    if (!el) {
      setText(prev => prev + emoji)
      return
    }
    const start = el.selectionStart ?? text.length
    const end = el.selectionEnd ?? text.length
    const newText = text.slice(0, start) + emoji + text.slice(end)
    setText(newText)
    // Restore cursor after emoji
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + emoji.length
      el.setSelectionRange(pos, pos)
    })
  }, [text])

  // File attach
  const handleAttachClick = useCallback(() => {
    setEmojiOpen(false)
    setGifOpen(false)
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      // Reset input so same file can be selected again
      e.target.value = ''
      setIsUploading(true)
      try {
        await onSendImage(file)
      } finally {
        setIsUploading(false)
      }
    },
    [onSendImage]
  )

  // GIF select
  const handleGifSelect = useCallback(
    (gifUrl: string) => {
      onSendGif(gifUrl)
    },
    [onSendGif]
  )

  const toggleEmoji = useCallback(() => {
    setGifOpen(false)
    setEmojiOpen(v => !v)
  }, [])

  const toggleGif = useCallback(() => {
    setEmojiOpen(false)
    setGifOpen(v => !v)
  }, [])

  const handleCancelEdit = useCallback(() => {
    onCancelEdit()
    setText('')
  }, [onCancelEdit])

  const hasText = text.trim().length > 0
  const isEditing = !!editingMessage

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Emoji Picker portal */}
      <EmojiPicker
        isOpen={emojiOpen}
        anchorRef={emojiBtnRef}
        onEmojiSelect={handleEmojiSelect}
        onClose={() => setEmojiOpen(false)}
      />

      {/* GIF Picker portal */}
      <GifPicker
        isOpen={gifOpen}
        anchorRef={gifBtnRef}
        onGifSelect={handleGifSelect}
        onClose={() => setGifOpen(false)}
      />

      {/* Edit indicator */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--separator)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                {t('messages.editing')}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {editingMessage.content}
              </span>
            </div>
            <button
              onClick={handleCancelEdit}
              style={{
                width: 28, height: 28, borderRadius: 14,
                background: 'var(--bg-tertiary)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply indicator */}
      <AnimatePresence>
        {replyingTo && !isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--separator)',
            }}
          >
            <div style={{ width: 2, height: 32, background: 'var(--accent)', borderRadius: 2 }} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                {replyingTo.sender?.displayName || t('messages.replyTo')}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {replyingTo.type === 'text' ? replyingTo.content :
                 replyingTo.type === 'image' ? t('chats.photo') :
                 replyingTo.type === 'gif' ? t('chats.gif') :
                 replyingTo.type === 'audio' ? t('chats.voice') :
                 t('messages.replyTo')}
              </span>
            </div>
            <button
              onClick={onClearReply}
              style={{
                width: 28, height: 28, borderRadius: 14,
                background: 'var(--bg-tertiary)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 6,
          padding: `10px 12px calc(10px + env(safe-area-inset-bottom))`,
          borderTop: '1px solid var(--separator)',
          background: 'var(--glass)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          flexShrink: 0,
        }}
      >
        {/* Attach button (hidden during edit) */}
        {!isEditing && (
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleAttachClick}
            disabled={disabled || isUploading}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: 'var(--bg-tertiary)',
              border: 'none',
              cursor: disabled || isUploading ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginBottom: 1,
              opacity: isUploading ? 0.5 : 1,
            }}
            aria-label={t('common.attach')}
          >
            {isUploading ? (
              <div
                className="animate-spin rounded-full border-2 border-t-transparent"
                style={{
                  width: 16,
                  height: 16,
                  borderColor: 'var(--accent)',
                  borderTopColor: 'transparent',
                }}
              />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                  stroke="var(--text-secondary)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </motion.button>
        )}

        {/* Text input wrapper */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            borderRadius: 20,
            background: 'var(--bg-tertiary)',
            padding: '8px 10px 8px 14px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: 4,
            ...(isEditing ? { borderColor: 'var(--accent)', border: '1px solid var(--accent)' } : {}),
          }}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={isEditing ? t('messages.editPlaceholder') : t('messages.inputPlaceholder')}
            disabled={disabled}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: 15,
              lineHeight: 1.45,
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              maxHeight: 120,
              overflow: 'auto',
              padding: 0,
            }}
          />

          {/* Emoji button — inside input */}
          <motion.button
            ref={emojiBtnRef}
            whileTap={{ scale: 0.85 }}
            onClick={toggleEmoji}
            disabled={disabled}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              border: 'none',
              background: emojiOpen ? 'rgba(0,122,255,0.12)' : 'none',
              cursor: disabled ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
            aria-label={t('common.emoji')}
            aria-pressed={emojiOpen}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke={emojiOpen ? 'var(--accent)' : 'var(--text-secondary)'} strokeWidth="1.8" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke={emojiOpen ? 'var(--accent)' : 'var(--text-secondary)'} strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="9" cy="10" r="1" fill={emojiOpen ? 'var(--accent)' : 'var(--text-secondary)'} />
              <circle cx="15" cy="10" r="1" fill={emojiOpen ? 'var(--accent)' : 'var(--text-secondary)'} />
            </svg>
          </motion.button>

          {/* GIF button — inside input (hidden during edit) */}
          {!isEditing && (
            <motion.button
              ref={gifBtnRef}
              whileTap={{ scale: 0.85 }}
              onClick={toggleGif}
              disabled={disabled}
              style={{
                height: 28,
                paddingLeft: 6,
                paddingRight: 6,
                borderRadius: 8,
                border: 'none',
                background: gifOpen ? 'rgba(0,122,255,0.12)' : 'none',
                cursor: disabled ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
              aria-label={t('common.gif')}
              aria-pressed={gifOpen}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  color: gifOpen ? 'var(--accent)' : 'var(--text-secondary)',
                  lineHeight: 1,
                }}
              >
                GIF
              </span>
            </motion.button>
          )}
        </div>

        {/* Send / Mic button */}
        <AnimatePresence mode="wait" initial={false}>
          {hasText || isEditing ? (
            <motion.button
              key="send"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.15 }}
              whileTap={{ scale: 0.88 }}
              onClick={handleSend}
              disabled={disabled || isUploading || !hasText}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                background: isEditing ? '#34C759' : 'var(--accent)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginBottom: 1,
                opacity: hasText ? 1 : 0.5,
              }}
              aria-label={isEditing ? t('common.save') : t('common.send')}
            >
              {isEditing ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </motion.button>
          ) : (
            <motion.div
              key="mic"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <VoiceRecorder onSend={onSendAudio} disabled={disabled} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
