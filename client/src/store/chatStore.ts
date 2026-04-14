import { create } from 'zustand'
import type { Chat } from '../types'
import { api } from '../services/api'

interface ChatState {
  chats: Chat[]
  activeChat: Chat | null
  isLoading: boolean
  page: number
  totalPages: number
  hasMore: boolean

  loadChats: (reset?: boolean) => Promise<void>
  loadMoreChats: () => Promise<void>
  setActiveChat: (chat: Chat | null) => void
  createDirectChat: (userId: string) => Promise<string>
  createGroupChat: (name: string, memberIds: string[], description?: string) => Promise<string>
  updateChatLastMessage: (chatId: string, message: { id: string; type: string; content: string; senderId: string; createdAt: string }) => void
  decrementUnread: (chatId: string) => void
  incrementUnread: (chatId: string) => void
  clearUnread: (chatId: string) => void
  updateUserPresence: (userId: string, isOnline: boolean, lastSeen?: string) => void
  deleteChat: (chatId: string) => Promise<void>
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChat: null,
  isLoading: false,
  page: 1,
  totalPages: 1,
  hasMore: false,

  loadChats: async () => {
    set({ isLoading: true })
    try {
      const response = await api.get<{
        items: Chat[]
        page: number
        totalPages: number
      }>('/api/chats?page=1&perPage=20')

      set({
        chats: response.items,
        page: 1,
        totalPages: response.totalPages,
        hasMore: response.totalPages > 1,
        isLoading: false,
      })
    } catch (err) {
      console.error('[Chats] Load error:', err)
      set({ isLoading: false })
    }
  },

  loadMoreChats: async () => {
    const { page, totalPages, isLoading, chats } = get()
    if (isLoading || page >= totalPages) return

    const nextPage = page + 1
    set({ isLoading: true })
    try {
      const response = await api.get<{
        items: Chat[]
        page: number
        totalPages: number
      }>(`/api/chats?page=${nextPage}&perPage=20`)

      set({
        chats: [...chats, ...response.items],
        page: nextPage,
        hasMore: nextPage < response.totalPages,
        isLoading: false,
      })
    } catch (err) {
      console.error('[Chats] Load more error:', err)
      set({ isLoading: false })
    }
  },

  setActiveChat: (chat) => set({ activeChat: chat }),

  createDirectChat: async (userId) => {
    const response = await api.post<{ id: string }>('/api/chats', {
      type: 'direct',
      memberIds: [userId],
    })
    await get().loadChats(true)
    return response.id
  },

  createGroupChat: async (name, memberIds, description) => {
    const response = await api.post<{ id: string }>('/api/chats', {
      type: 'group',
      name,
      memberIds,
      description,
    })
    await get().loadChats(true)
    return response.id
  },

  updateChatLastMessage: (chatId, message) => {
    set(state => ({
      chats: state.chats
        .map(c => c.id === chatId ? { ...c, lastMessage: message as Chat['lastMessage'] } : c)
        .sort((a, b) => {
          const aTime = a.lastMessage?.createdAt || a.createdAt
          const bTime = b.lastMessage?.createdAt || b.createdAt
          return new Date(bTime).getTime() - new Date(aTime).getTime()
        }),
    }))
  },

  incrementUnread: (chatId) => {
    set(state => ({
      chats: state.chats.map(c =>
        c.id === chatId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c
      ),
    }))
  },

  clearUnread: (chatId) => {
    set(state => ({
      chats: state.chats.map(c =>
        c.id === chatId ? { ...c, unreadCount: 0 } : c
      ),
    }))
  },

  decrementUnread: (chatId) => {
    set(state => ({
      chats: state.chats.map(c =>
        c.id === chatId ? { ...c, unreadCount: Math.max(0, (c.unreadCount || 0) - 1) } : c
      ),
    }))
  },

  // Update online/offline status of a user across all direct chats
  updateUserPresence: (userId, isOnline, lastSeen) => {
    set(state => ({
      chats: state.chats.map(c => {
        if (!c.members) return c
        const hasMember = c.members.some(m => m.userId === userId)
        if (!hasMember) return c
        return {
          ...c,
          members: c.members.map(m =>
            m.userId === userId
              ? {
                  ...m,
                  user: m.user
                    ? { ...m.user, isOnline, ...(lastSeen ? { lastSeen } : {}) }
                    : m.user,
                }
              : m
          ),
        }
      }),
    }))
  },

  // Leave or delete a chat/group
  deleteChat: async (chatId) => {
    await api.delete(`/api/chats/${chatId}`)
    // Remove from local state immediately
    set(state => ({
      chats: state.chats.filter(c => c.id !== chatId),
      activeChat: state.activeChat?.id === chatId ? null : state.activeChat,
    }))
  },
}))
