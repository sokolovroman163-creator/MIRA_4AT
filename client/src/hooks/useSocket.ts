import { useEffect } from 'react'
import { getSocket } from '../services/socket'
import { useMessageStore } from '../store/messageStore'
import { useChatStore } from '../store/chatStore'
import type { Message, LinkPreview } from '../types'

export function useSocket(token: string | null): void {
  const addMessage = useMessageStore(s => s.addMessage)
  const updateMessage = useMessageStore(s => s.updateMessage)
  const deleteMessage = useMessageStore(s => s.deleteMessage)
  const setLinkPreview = useMessageStore(s => s.setLinkPreview)
  const setTyping = useMessageStore(s => s.setTyping)
  const replaceOptimistic = useMessageStore(s => s.replaceOptimisticMessage)
  const markMessagesRead = useMessageStore(s => s.markMessagesRead)
  const updateChatLastMessage = useChatStore(s => s.updateChatLastMessage)
  const incrementUnread = useChatStore(s => s.incrementUnread)
  const updateUserPresence = useChatStore(s => s.updateUserPresence)

  useEffect(() => {
    // We explicitly depend on token to ensure we re-register if socket is recreated
    const socket = getSocket()
    if (!socket || !token) return

    const onNewMessage = (message: Message) => {
      if (message.localId) {
        replaceOptimistic(message.chatId, message.localId, { ...message, status: 'sent' })
      } else {
        addMessage(message.chatId, message)
      }

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

    const onMessageUpdated = (message: Message) => {
      updateMessage(message.chatId, message.id, message)
    }

    const onMessageDeleted = (data: { messageId: string; chatId: string }) => {
      deleteMessage(data.chatId, data.messageId)
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
      // Remove existing to be safe if attach is called multiple times
      detach()
      socket.on('new_message', onNewMessage)
      socket.on('message_updated', onMessageUpdated)
      socket.on('message_deleted', onMessageDeleted)
      socket.on('message_link_preview_ready', onLinkPreviewReady)
      socket.on('user_typing', onUserTyping)
      socket.on('user_stopped_typing', onUserStoppedTyping)
      socket.on('message_error', onMessageError)
      socket.on('messages_read', onMessagesRead)
      socket.on('user_online', onUserOnline)
      socket.on('user_offline', onUserOffline)
    }

    const detach = () => {
      socket.off('new_message', onNewMessage)
      socket.off('message_updated', onMessageUpdated)
      socket.off('message_deleted', onMessageDeleted)
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
