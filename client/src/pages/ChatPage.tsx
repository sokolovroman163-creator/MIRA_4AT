import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { isSameDay } from 'date-fns'
import { useIsMobile } from '../hooks/useIsMobile'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { useMessageStore } from '../store/messageStore'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { useOfflineStore } from '../store/offlineStore'
import { getSocket } from '../services/socket'
import { api } from '../services/api'
import NavigationBar from '../components/layout/NavigationBar'
import MessageInput from '../components/chat/MessageInput'
import MessageContextMenu from '../components/chat/MessageContextMenu'
import ForwardMessageModal from '../components/chat/ForwardMessageModal'
import VirtualizedMessageList from '../components/chat/VirtualizedMessageList'
import type { ListItem } from '../components/chat/VirtualizedMessageList'
import Avatar from '../components/ui/Avatar'
import { MessageSkeleton } from '../components/ui/Skeleton'
import type { Message } from '../types'

const EMPTY_ARRAY: string[] = []
const EMPTY_MESSAGES: Message[] = []

export default function ChatPage() {
  const { id: chatId } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const { isOnline } = useNetworkStatus()
  const { addToQueue } = useOfflineStore()

  const { user: currentUser } = useAuthStore()
  const { chats, setActiveChat, clearUnread, deleteChat } = useChatStore()
  const navigate = useNavigate()
  const [showChatMenu, setShowChatMenu] = useState(false)
  const [deletingChat, setDeletingChat] = useState(false)
  
  // Narrow selectors to specific chatId — avoids re-renders from other chats
  const messages = useMessageStore(s => (chatId ? s.messages[chatId] : undefined)) ?? EMPTY_MESSAGES
  const isLoading = useMessageStore(s => (chatId ? !!s.isLoading[chatId] : false))
  const hasMore = useMessageStore(s => (chatId ? !!s.hasMore[chatId] : false))
  const loadMessages = useMessageStore(s => s.loadMessages)
  const loadMoreMessages = useMessageStore(s => s.loadMoreMessages)
  const addMessage = useMessageStore(s => s.addMessage)
  const updateMessage = useMessageStore(s => s.updateMessage)
  const deleteMessageInStore = useMessageStore(s => s.deleteMessage)
  const replaceOptimisticMessage = useMessageStore(s => s.replaceOptimisticMessage)
  const addReaction = useMessageStore(s => s.addReaction)
  const removeReaction = useMessageStore(s => s.removeReaction)

  const chat = useMemo(
    () => chats.find(c => c.id === chatId) ?? null,
    [chats, chatId]
  )

  const typingUsersRaw = useMessageStore(s => chatId ? s.typingUsers[chatId] : undefined)
  const typingUsers = typingUsersRaw ?? EMPTY_ARRAY

  const scrollRef = useRef<HTMLDivElement>(null)
  const contextMenuAnchorRef = useRef<HTMLElement | null>(null)
  const [listSize, setListSize] = useState({ width: 0, height: 0 })

  // ─── Interaction states ───────────────────────────────────
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    message: Message | null
    isOpen: boolean
    isOwn: boolean
  }>({ message: null, isOpen: false, isOwn: false })

  // Reset interaction states when changing chats
  useEffect(() => {
    setReplyingTo(null)
    setEditingMessage(null)
    setForwardingMessage(null)
    setContextMenu({ message: null, isOpen: false, isOwn: false })
  }, [chatId])

  // Register active chat + socket room membership
  useEffect(() => {
    if (!chatId) return
    const found = chats.find(c => c.id === chatId) ?? null
    setActiveChat(found)
    
    if (found) {
      clearUnread(chatId)
    }

    const socket = getSocket()
    if (!socket) return

    // Join room immediately if already connected
    if (socket.connected) {
      socket.emit('join_chat', { chatId })
    }

    // Rejoin on (re)connect — handles the case where socket connects after mount
    const handleConnect = () => {
      socket.emit('join_chat', { chatId })
    }
    socket.on('connect', handleConnect)

    return () => {
      setActiveChat(null)
      socket.off('connect', handleConnect)
      socket.emit('leave_chat', { chatId })
    }
  }, [chatId, chats.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load messages on mount
  useEffect(() => {
    if (!chatId) return
    loadMessages(chatId, true)
  }, [chatId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Measure the list container for react-window
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setListSize({ width, height })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Load more handler for VirtualizedMessageList
  const handleLoadMore = useCallback(() => {
    if (chatId) loadMoreMessages(chatId)
  }, [chatId, loadMoreMessages])

  // Mark messages as read when viewing chat
  useEffect(() => {
    if (!chatId || !messages.length) return
    const socket = getSocket()
    if (!socket) return

    // Find the last non-pending, non-own message to mark as read
    const lastMsg = [...messages]
      .reverse()
      .find(m => m.senderId !== currentUser?.id && m.status !== 'pending' && !m.localId?.startsWith('local_'))

    if (lastMsg) {
      socket.emit('mark_read_batch', { chatId, lastMessageId: lastMsg.id })
    }
  }, [chatId, messages.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Message interactions are now handled globally in useSocket hook

  // ─── Context menu handler ─────────────────────────────────
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, message: Message) => {
      e.preventDefault()
      contextMenuAnchorRef.current = e.currentTarget as HTMLElement
      setContextMenu({
        message,
        isOpen: true,
        isOwn: message.senderId === currentUser?.id,
      })
    },
    [currentUser]
  )

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }))
  }, [])

  // ─── Action handlers from context menu ────────────────────
  const handleReply = useCallback((msg: Message) => {
    setEditingMessage(null)
    setReplyingTo(msg)
  }, [])

  const handleForward = useCallback((msg: Message) => {
    setForwardingMessage(msg)
  }, [])

  const handleEdit = useCallback((msg: Message) => {
    setReplyingTo(null)
    setEditingMessage(msg)
  }, [])

  const handleDelete = useCallback(
    async (msg: Message) => {
      if (!chatId) return
      try {
        await api.delete(`/api/messages/${msg.id}`)
        // Socket broadcast will update the store for all clients
      } catch (err) {
        console.error('[ChatPage] Delete failed:', err)
      }
    },
    [chatId]
  )

  const handleReact = useCallback(
    async (emoji: string) => {
      const msg = contextMenu.message
      if (!msg || !chatId) return
      try {
        await api.post(`/api/messages/${msg.id}/reactions`, { emoji })
        // Socket broadcast will update the store for all clients
      } catch (err) {
        console.error('[ChatPage] React failed:', err)
      }
    },
    [chatId, contextMenu.message]
  )

  // ─── Forward to chat ──────────────────────────────────────
  const handleForwardToChat = useCallback(
    (targetChatId: string) => {
      if (!forwardingMessage || !currentUser) return

      const socket = getSocket()
      if (!socket) return

      const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`

      socket.emit('send_message', {
        chatId: targetChatId,
        content: forwardingMessage.content,
        type: forwardingMessage.type,
        forwardedFromId: forwardingMessage.senderId,
        forwardedFromChatId: forwardingMessage.chatId,
        localId,
      })

      setForwardingMessage(null)
    },
    [forwardingMessage, currentUser]
  )

  // ─── Delete / Leave chat ──────────────────────────────────
  const handleDeleteChat = useCallback(async () => {
    if (!chatId || deletingChat) return
    const chatIsGroup = chat?.type === 'group'
    const confirmMsg = chatIsGroup
      ? t('chats.confirmLeaveGroup', { defaultValue: 'Покинуть группу?' })
      : t('chats.confirmDeleteChat', { defaultValue: 'Удалить этот чат?' })
    if (!window.confirm(confirmMsg)) return
    setDeletingChat(true)
    setShowChatMenu(false)
    try {
      await deleteChat(chatId)
      navigate('/', { replace: true })
    } catch {
      setDeletingChat(false)
    }
  }, [chatId, deletingChat, chat?.type, t, deleteChat, navigate])

  // ─── Send text message (with reply/edit support) ──────────
  const handleSend = useCallback(

    async (text: string) => {
      if (!chatId || !currentUser) return

      // If editing, send PATCH instead
      if (editingMessage) {
        try {
          await api.patch(`/api/messages/${editingMessage.id}`, { content: text })
          // Socket broadcast will update for all clients
        } catch (err) {
          console.error('[ChatPage] Edit failed:', err)
        }
        setEditingMessage(null)
        return
      }

      const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`

      // Optimistic message
      const optimistic: Message = {
        id: localId,
        localId,
        chatId,
        senderId: currentUser.id,
        type: 'text',
        content: text,
        replyToId: replyingTo?.id,
        replyTo: replyingTo ?? undefined,
        isEdited: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        status: 'pending',
        sender: currentUser,
      }
      addMessage(chatId, optimistic)

      // If offline — queue for later delivery
      if (!isOnline) {
        addToQueue({
          localId,
          chatId,
          content: text,
          type: 'text',
          replyToId: replyingTo?.id,
          createdAt: new Date().toISOString(),
          status: 'pending',
        })
      } else {
        // Emit via socket
        const socket = getSocket()
        if (socket) {
          socket.emit('send_message', {
            chatId,
            content: text,
            type: 'text',
            replyToId: replyingTo?.id,
            localId,
          })
        }
      }

      setReplyingTo(null)
    },
    [chatId, currentUser, addMessage, replyingTo, editingMessage, isOnline, addToQueue]
  )

  // Send image message via REST (file upload)
  const handleSendImage = useCallback(
    async (file: File) => {
      if (!chatId || !currentUser) return

      const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const previewUrl = URL.createObjectURL(file)

      // Optimistic message with local blob preview
      const optimistic: Message = {
        id: localId,
        localId,
        chatId,
        senderId: currentUser.id,
        type: 'image',
        content: previewUrl,
        fileUrl: previewUrl,
        isEdited: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        status: 'pending',
        sender: currentUser,
      }
      addMessage(chatId, optimistic)

      try {
        const formData = new FormData()
        formData.append('chatId', chatId)
        formData.append('localId', localId)
        formData.append('file', file)

        const result = await api.uploadFile('/api/messages/upload', formData) as Message & { fileUrl: string }

        replaceOptimisticMessage(chatId, localId, {
          ...result,
          fileUrl: result.fileUrl,
          content: result.fileUrl,
          status: 'sent',
        })

        URL.revokeObjectURL(previewUrl)
      } catch (err) {
        console.error('[ChatPage] Image upload failed:', err)
        replaceOptimisticMessage(chatId, localId, {
          id: localId,
          localId,
          chatId,
          senderId: currentUser.id,
          type: 'image',
          content: previewUrl,
          fileUrl: previewUrl,
          isEdited: false,
          isDeleted: false,
          createdAt: new Date().toISOString(),
          status: 'pending',
          sender: currentUser,
        })
      }
    },
    [chatId, currentUser, addMessage, replaceOptimisticMessage]
  )

  // Send GIF message via socket (external URL, no upload)
  const handleSendGif = useCallback(
    (gifUrl: string) => {
      if (!chatId || !currentUser) return

      const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`

      const optimistic: Message = {
        id: localId,
        localId,
        chatId,
        senderId: currentUser.id,
        type: 'gif',
        content: gifUrl,
        isEdited: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        status: 'pending',
        sender: currentUser,
      }
      addMessage(chatId, optimistic)

      const socket = getSocket()
      if (socket) {
        socket.emit('send_message', {
          chatId,
          content: gifUrl,
          type: 'gif',
          localId,
        })
      }
    },
    [chatId, currentUser, addMessage]
  )

  // Send voice/audio message via REST (file upload)
  const handleSendAudio = useCallback(
    async (blob: Blob, duration: number) => {
      if (!chatId || !currentUser) return

      const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const previewUrl = URL.createObjectURL(blob)

      const optimistic: Message = {
        id: localId,
        localId,
        chatId,
        senderId: currentUser.id,
        type: 'audio',
        content: previewUrl,
        fileUrl: previewUrl,
        duration,
        isEdited: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        status: 'pending',
        sender: currentUser,
      }
      addMessage(chatId, optimistic)

      try {
        const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : 'webm'
        const file = new File([blob], `voice.${ext}`, { type: blob.type })

        const formData = new FormData()
        formData.append('chatId', chatId)
        formData.append('localId', localId)
        formData.append('duration', String(duration))
        formData.append('file', file)

        const result = await api.uploadFile('/api/messages/upload-audio', formData) as Message & { fileUrl: string }

        replaceOptimisticMessage(chatId, localId, {
          ...result,
          fileUrl: result.fileUrl,
          content: result.fileUrl,
          status: 'sent',
        })

        URL.revokeObjectURL(previewUrl)
      } catch (err) {
        console.error('[ChatPage] Audio upload failed:', err)
      }
    },
    [chatId, currentUser, addMessage, replaceOptimisticMessage]
  )

  // Build chat title and avatar for header
  const isGroup = chat?.type === 'group'
  const otherMember = !isGroup
    ? chat?.members?.find(m => m.userId !== currentUser?.id)
    : undefined
  const chatTitle = isGroup
    ? chat?.name ?? t('common.loading')
    : otherMember?.user?.displayName ?? chat?.name ?? t('common.loading')
  const chatAvatarUrl = isGroup
    ? chat?.avatarUrl
    : otherMember?.user?.avatarUrl ?? chat?.avatarUrl
  const chatIsOnline = !isGroup && (otherMember?.user?.isOnline ?? false)

  // Typing subtitle
  const isTyping = typingUsers.length > 0

  // Group messages by same sender for bubble grouping + date dividers
  const renderedItems: ListItem[] = useMemo(() => {
    const items: ListItem[] = []
    let prevDate: Date | null = null
    let prevSenderId: string | null = null

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      const msgDate = new Date(msg.createdAt)

      // Date divider
      if (!prevDate || !isSameDay(prevDate, msgDate)) {
        const dateKey = msgDate.toISOString().split('T')[0]
        items.push({ kind: 'divider', date: msgDate, key: `divider_${dateKey}` })
        prevDate = msgDate
        prevSenderId = null // reset grouping on new day
      }

      const nextMsg = messages[i + 1]
      const isFirstInGroup = prevSenderId !== msg.senderId
      const isLastInGroup =
        !nextMsg ||
        nextMsg.senderId !== msg.senderId ||
        !isSameDay(new Date(nextMsg.createdAt), msgDate)

      items.push({
        kind: 'message',
        message: msg,
        isFirstInGroup,
        isLastInGroup,
        key: msg.id,
      })

      prevSenderId = msg.senderId
    }

    return items
  }, [messages])

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Mobile navigation bar */}
      {isMobile && (
        <NavigationBar
          title={chatTitle}
          avatarUrl={chatAvatarUrl}
          avatarName={chatTitle}
          isOnline={chatIsOnline}
          isTyping={isTyping}
          rightActions={
            <div style={{ position: 'relative' }}>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setShowChatMenu(v => !v)}
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                aria-label="Меню чата"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="5" r="1.3" fill="var(--text-secondary)"/>
                  <circle cx="12" cy="12" r="1.3" fill="var(--text-secondary)"/>
                  <circle cx="12" cy="19" r="1.3" fill="var(--text-secondary)"/>
                </svg>
              </motion.button>
              <AnimatePresence>
                {showChatMenu && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 299 }}
                      onClick={() => setShowChatMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -4 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: 'absolute', top: 48, right: 4,
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--separator)',
                        borderRadius: 14, overflow: 'hidden',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                        zIndex: 300, minWidth: 200,
                      }}
                    >
                      <button
                        onClick={handleDeleteChat}
                        disabled={deletingChat}
                        style={{
                          width: '100%', padding: '14px 16px',
                          background: 'none', border: 'none',
                          cursor: 'pointer', textAlign: 'left',
                          color: '#FF3B30', fontSize: 15, fontWeight: 500,
                          display: 'flex', alignItems: 'center', gap: 10,
                          fontFamily: 'inherit',
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <polyline points="3 6 5 6 21 6" stroke="#FF3B30" strokeWidth="1.8" strokeLinecap="round"/>
                          <path d="M19 6l-1 14H6L5 6" stroke="#FF3B30" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M10 11v6M14 11v6" stroke="#FF3B30" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                        {isGroup ? 'Покинуть группу' : 'Удалить чат'}
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          }
        />
      )}

      {/* Desktop header */}
      {!isMobile && (
        <div
          className="flex items-center gap-3 no-select"
          style={{
            position: 'relative',
            zIndex: 50,
            height: 'var(--nav-height)',
            paddingLeft: 16,
            paddingRight: 8,
            borderBottom: '1px solid var(--separator)',
            flexShrink: 0,
            background: 'var(--glass)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <Avatar
            src={chatAvatarUrl}
            name={chatTitle}
            size={34}
            online={chatIsOnline}
          />
          <div className="flex-1 min-w-0">
            <div
              className="font-semibold truncate"
              style={{ color: 'var(--text-primary)', fontSize: 15 }}
            >
              {chatTitle}
            </div>
            <div
              style={{
                fontSize: 12,
                color: isTyping ? 'var(--accent)' : 'var(--text-secondary)',
                lineHeight: 1.3,
              }}
            >
              {isTyping
                ? t('chats.typing')
                : chatIsOnline
                ? t('common.online')
                : isGroup && chat?.members
                ? `${chat.members.length} ${t('chats.members')}`
                : null}
            </div>
          </div>
          {/* ⋮ menu for desktop */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => setShowChatMenu(v => !v)}
              style={{
                width: 36, height: 36, borderRadius: 18,
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label="Меню чата"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="5" r="1.3" fill="var(--text-secondary)"/>
                <circle cx="12" cy="12" r="1.3" fill="var(--text-secondary)"/>
                <circle cx="12" cy="19" r="1.3" fill="var(--text-secondary)"/>
              </svg>
            </motion.button>
            <AnimatePresence>
              {showChatMenu && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 299 }}
                    onClick={() => setShowChatMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -4 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute', top: 44, right: 0,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--separator)',
                      borderRadius: 14, overflow: 'hidden',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                      zIndex: 300, minWidth: 200,
                    }}
                  >
                    <button
                      onClick={handleDeleteChat}
                      disabled={deletingChat}
                      style={{
                        width: '100%', padding: '14px 16px',
                        background: 'none', border: 'none',
                        cursor: 'pointer', textAlign: 'left',
                        color: '#FF3B30', fontSize: 15, fontWeight: 500,
                        display: 'flex', alignItems: 'center', gap: 10,
                        fontFamily: 'inherit',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <polyline points="3 6 5 6 21 6" stroke="#FF3B30" strokeWidth="1.8" strokeLinecap="round"/>
                        <path d="M19 6l-1 14H6L5 6" stroke="#FF3B30" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 11v6M14 11v6" stroke="#FF3B30" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                      {isGroup ? 'Покинуть группу' : 'Удалить чат'}
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Messages scroll area */}
      <div
        ref={scrollRef}
        className="flex-1"
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        {/* Initial skeleton */}
        {isLoading && messages.length === 0 && <MessageSkeleton />}

        {/* Empty state */}
        {!isLoading && messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 10,
              padding: '40px 32px',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                background: 'rgba(0,122,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 4,
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
                  stroke="var(--accent)"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
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
              {t('messages.inputPlaceholder')}
            </p>
          </motion.div>
        )}

        {/* Virtualized message list */}
        {renderedItems.length > 0 && listSize.height > 0 && (
          <VirtualizedMessageList
            key={chatId}
            items={renderedItems}
            currentUserId={currentUser?.id}
            isGroup={isGroup}
            onContextMenu={handleContextMenu}
            onLoadMore={handleLoadMore}
            isLoadingMore={isLoading}
            hasMore={hasMore}
            height={listSize.height}
            width={listSize.width}
            chatId={chatId}
          />
        )}

        {/* Typing indicator bubble — rendered below the virtual list */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              key="typing-bubble"
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                display: 'flex',
                alignItems: 'flex-end',
                paddingLeft: 12,
                paddingRight: 48,
                paddingBottom: 6,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  borderRadius: '18px 18px 18px 4px',
                  background: 'var(--bubble-in)',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    animate={{ y: [0, -4, 0] }}
                    transition={{
                      duration: 0.7,
                      repeat: Infinity,
                      delay: i * 0.18,
                      ease: 'easeInOut',
                    }}
                    style={{
                      display: 'inline-block',
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: 'var(--text-tertiary)',
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input bar */}
      <MessageInput
        chatId={chatId ?? ''}
        replyingTo={replyingTo}
        editingMessage={editingMessage}
        onClearReply={() => setReplyingTo(null)}
        onCancelEdit={() => setEditingMessage(null)}
        onSend={handleSend}
        onSendImage={handleSendImage}
        onSendGif={handleSendGif}
        onSendAudio={handleSendAudio}
        disabled={!chatId}
      />

      {/* Context menu */}
      <MessageContextMenu
        message={contextMenu.message}
        anchorRef={contextMenuAnchorRef as React.RefObject<HTMLElement | null>}
        isOpen={contextMenu.isOpen}
        isOwn={contextMenu.isOwn}
        onClose={closeContextMenu}
        onReply={handleReply}
        onForward={handleForward}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReact={handleReact}
      />

      {/* Forward modal */}
      <ForwardMessageModal
        isOpen={!!forwardingMessage}
        message={forwardingMessage}
        onClose={() => setForwardingMessage(null)}
        onForward={handleForwardToChat}
      />
    </div>
  )
}
