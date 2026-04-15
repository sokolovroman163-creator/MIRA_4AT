import { useEffect } from 'react'
import { getSocket } from '../services/socket'
import { useMessageStore } from '../store/messageStore'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import type { Message, LinkPreview } from '../types'

export function useSocket(token: string | null): void {
  const addMessage = useMessageStore(s => s.addMessage)
  const updateMessage = useMessageStore(s => s.updateMessage)
  const deleteMessage = useMessageStore(s => s.deleteMessage)
  const setLinkPreview = useMessageStore(s => s.setLinkPreview)
  const setTyping = useMessageStore(s => s.setTyping)
  const replaceOptimistic = useMessageStore(s => s.replaceOptimisticMessage)
  const addReaction = useMessageStore(s => s.addReaction)
  const removeReaction = useMessageStore(s => s.removeReaction)
  const markMessagesRead = useMessageStore(s => s.markMessagesRead)
  const updateChatLastMessage = useChatStore(s => s.updateChatLastMessage)
  const incrementUnread = useChatStore(s => s.incrementUnread)
  const updateUserPresence = useChatStore(s => s.updateUserPresence)
  const userId = useAuthStore(s => s.user?.id)

  useEffect(() => {
    // We explicitly depend on token to ensure we re-register if socket is recreated
    const socket = getSocket()
    if (!socket || !token) return

    const onNewMessage = (message: Message) => {
      // If it's our own message with localId, update the optimistic entry
      if (message.localId) {
        replaceOptimistic(message.chatId, message.localId, { ...message, status: 'sent' })
      }
      
      // Always try to add (duplicate check is inside addMessage)
      // This ensures recipients (who don't have the sender's localId) get the message
      addMessage(message.chatId, message)

      updateChatLastMessage(message.chatId, {
        id: message.id,
        type: message.type,
        content: message.content,
        senderId: message.senderId,
        createdAt: message.createdAt,
      })

      // Read active chat from store directly to avoid stale closure
      const currentActiveChatId = useChatStore.getState().activeChat?.id
      if (message.chatId !== currentActiveChatId) {
        incrementUnread(message.chatId)
      }
    }

    const onMessageEdited = (data: { id: string, chatId: string, content: string, isEdited: boolean }) => {
      updateMessage(data.chatId, data.id, { content: data.content, isEdited: data.isEdited })
    }
 
    const onMessageDeleted = (data: { messageId: string, chatId: string }) => {
      deleteMessage(data.chatId, data.messageId)
    }

    const onReactionAdded = (data: {
      id: string
      messageId: string
      userId: string
      emoji: string
      chatId: string
    }) => {
      addReaction(data.chatId, data.messageId, {
        id: data.id,
        messageId: data.messageId,
        userId: data.userId,
        emoji: data.emoji,
        createdAt: new Date().toISOString(),
      })
    }

    const onReactionRemoved = (data: {
      messageId: string
      reactionId: string
      userId: string
      emoji: string
      chatId: string
    }) => {
      removeReaction(data.chatId, data.messageId, data.reactionId)
    }

    const onLinkPreviewReady = (data: {
      messageId: string
      linkPreview: LinkPreview
      chatId: string
    }) => {
      setLinkPreview(data.chatId, data.messageId, data.linkPreview)
    }

    const onUserTyping = (data: { chatId: string; userId: string }) => {
      setTyping(data.chatId, data.userId, true)
    }

    const onUserStoppedTyping = (data: { chatId: string; userId: string }) => {
      setTyping(data.chatId, data.userId, false)
    }

    const onMessageError = (data: { localId?: string; chatId?: string; error: string }) => {
      console.error('[Socket] message_error:', data.error)
      if (data.localId && data.chatId) {
        updateMessage(data.chatId, data.localId, { status: 'pending' })
      }
    }

    const onMessagesRead = (data: {
      chatId: string
      userId: string
      lastMessageId: string
    }) => {
      markMessagesRead(data.chatId, data.lastMessageId)
    }

    const onUserOnline = (data: { userId: string }) => {
      updateUserPresence(data.userId, true)
    }

    const onUserOffline = (data: { userId: string; lastSeen: string }) => {
      updateUserPresence(data.userId, false, data.lastSeen)
    }

    const attach = () => {
      detach()
      console.log('[Socket] Attaching listeners...')
      
      if (userId) {
        socket.emit('join_user_room', { userId })
      }
      
      socket.on('new_message', (msg) => {
        console.log('[Socket] New message received:', msg.id, 'for chat:', msg.chatId)
        onNewMessage(msg)
      })
      socket.on('message_edited', onMessageEdited)
      socket.on('message_deleted', onMessageDeleted)
      socket.on('reaction_added', onReactionAdded)
      socket.on('reaction_removed', onReactionRemoved)
      socket.on('message_link_preview_ready', onLinkPreviewReady)
      socket.on('user_typing', onUserTyping)
      socket.on('user_stopped_typing', onUserStoppedTyping)
      socket.on('message_error', onMessageError)
      socket.on('messages_read', onMessagesRead)
      socket.on('user_online', onUserOnline)
      socket.on('user_offline', onUserOffline)
    }

    const detach = () => {
      socket.off('new_message')
      socket.off('message_edited', onMessageEdited)
      socket.off('message_deleted', onMessageDeleted)
      socket.off('reaction_added', onReactionAdded)
      socket.off('reaction_removed', onReactionRemoved)
      socket.off('message_link_preview_ready', onLinkPreviewReady)
      socket.off('user_typing', onUserTyping)
      socket.off('user_stopped_typing', onUserStoppedTyping)
      socket.off('message_error', onMessageError)
      socket.off('messages_read', onMessagesRead)
      socket.off('user_online', onUserOnline)
      socket.off('user_offline', onUserOffline)
    }

    // Attach immediately; socket.io-client listeners persist across reconnects,
    // but if the socket object itself is different, this effect re-runs.
    attach()
    
    // We also re-attach on connect just in case the server logic requires room rejoins
    // (though rooms are handled in ChatPage.tsx)
    socket.on('connect', attach)

    return () => {
      socket.off('connect', attach)
      detach()
    }
  }, [token, addMessage, updateMessage, deleteMessage, setLinkPreview, setTyping,
      replaceOptimistic, markMessagesRead, updateChatLastMessage, incrementUnread, updateUserPresence])
}
