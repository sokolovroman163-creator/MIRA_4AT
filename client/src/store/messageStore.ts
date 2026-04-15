import { create } from 'zustand'
import type { Message, LinkPreview, Reaction } from '../types'
import { api } from '../services/api'

interface MessageState {
  messages: Record<string, Message[]> // chatId -> messages[]
  isLoading: Record<string, boolean>
  hasMore: Record<string, boolean>
  typingUsers: Record<string, string[]> // chatId -> userIds[]

  loadMessages: (chatId: string, reset?: boolean) => Promise<void>
  loadMoreMessages: (chatId: string) => Promise<void>
  addMessage: (chatId: string, message: Message) => void
  updateMessage: (chatId: string, messageId: string, data: Partial<Message>) => void
  deleteMessage: (chatId: string, messageId: string) => void
  setLinkPreview: (chatId: string, messageId: string, linkPreview: LinkPreview) => void
  setTyping: (chatId: string, userId: string, isTyping: boolean) => void
  replaceOptimisticMessage: (chatId: string, localId: string, message: Message) => void
  markMessagesRead: (chatId: string, lastReadMessageId: string) => void
  addReaction: (chatId: string, messageId: string, reaction: Reaction) => void
  removeReaction: (chatId: string, messageId: string, reactionId: string) => void
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: {},
  isLoading: {},
  hasMore: {},
  typingUsers: {},

  loadMessages: async (chatId) => {
    set(state => ({ isLoading: { ...state.isLoading, [chatId]: true } }))
    try {
      const response = await api.get<{
        items: Message[]
        totalPages: number
      }>(`/api/messages/${chatId}?perPage=30`)

      set(state => ({
        messages: { ...state.messages, [chatId]: response.items },
        hasMore: { ...state.hasMore, [chatId]: response.totalPages > 1 },
        isLoading: { ...state.isLoading, [chatId]: false },
      }))
    } catch (err) {
      console.error('[Messages] Load error:', err)
      set(state => ({ isLoading: { ...state.isLoading, [chatId]: false } }))
    }
  },

  loadMoreMessages: async (chatId) => {
    const current = get().messages[chatId]
    if (!current?.length || !get().hasMore[chatId]) return

    const oldest = current[0]
    set(state => ({ isLoading: { ...state.isLoading, [chatId]: true } }))

    try {
      const response = await api.get<{
        items: Message[]
        totalPages: number
      }>(`/api/messages/${chatId}?perPage=30&before=${oldest.id}`)

      set(state => ({
        messages: {
          ...state.messages,
          [chatId]: [...response.items, ...(state.messages[chatId] || [])],
        },
        hasMore: { ...state.hasMore, [chatId]: response.totalPages > 1 },
        isLoading: { ...state.isLoading, [chatId]: false },
      }))
    } catch (err) {
      console.error('[Messages] Load more error:', err)
      set(state => ({ isLoading: { ...state.isLoading, [chatId]: false } }))
    }
  },

  addMessage: (chatId, message) => {
    set(state => {
      const current = state.messages[chatId] || []
      // Prevent duplicates by id or localId
      const exists = current.some(m => m.id === message.id || (message.localId && m.localId === message.localId))
      if (exists) return state

      return {
        messages: {
          ...state.messages,
          [chatId]: [...current, message],
        },
      }
    })
  },

  updateMessage: (chatId, messageId, data) => {
    set(state => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map(m =>
          m.id === messageId ? { ...m, ...data } : m
        ),
      },
    }))
  },

  deleteMessage: (chatId, messageId) => {
    set(state => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map(m =>
          m.id === messageId ? { ...m, isDeleted: true, content: '' } : m
        ),
      },
    }))
  },

  setLinkPreview: (chatId, messageId, linkPreview) => {
    set(state => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map(m =>
          m.id === messageId ? { ...m, linkPreview } : m
        ),
      },
    }))
  },

  setTyping: (chatId, userId, isTyping) => {
    set(state => {
      const current = state.typingUsers[chatId] || []
      return {
        typingUsers: {
          ...state.typingUsers,
          [chatId]: isTyping
            ? current.includes(userId) ? current : [...current, userId]
            : current.filter(id => id !== userId),
        },
      }
    })
  },

  replaceOptimisticMessage: (chatId, localId, message) => {
    set(state => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map(m =>
          m.localId === localId ? message : m
        ),
      },
    }))
  },

  markMessagesRead: (chatId, lastReadMessageId) => {
    set(state => {
      const msgs = state.messages[chatId] || []
      const index = msgs.findIndex(m => m.id === lastReadMessageId)
      if (index === -1) return state

      const newMsgs = [...msgs]
      for (let i = 0; i <= index; i++) {
        if (newMsgs[i].status !== 'read' && !newMsgs[i].localId) {
          newMsgs[i] = { ...newMsgs[i], status: 'read' }
        }
      }

      return {
        messages: {
          ...state.messages,
          [chatId]: newMsgs,
        },
      }
    })
  },

  addReaction: (chatId, messageId, reaction) => {
    set(state => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map(m =>
          m.id === messageId
            ? { ...m, reactions: [...(m.reactions || []), reaction] }
            : m
        ),
      },
    }))
  },

  removeReaction: (chatId, messageId, reactionId) => {
    set(state => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map(m =>
          m.id === messageId
            ? { ...m, reactions: (m.reactions || []).filter((r: Reaction) => r.id !== reactionId) }
            : m
        ),
      },
    }))
  },
}))
