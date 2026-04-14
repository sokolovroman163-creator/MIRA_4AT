export type MessageType = 'text' | 'image' | 'audio' | 'gif' | 'sticker' | 'system'
export type ChatType = 'direct' | 'group'
export type MemberRole = 'owner' | 'admin' | 'member'

export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl: string
  bio: string
  lastSeen: string
  isOnline: boolean
  language: 'ru' | 'en'
  createdAt: string
}

export interface Message {
  id: string
  chatId: string
  senderId: string
  type: MessageType
  content: string
  fileUrl?: string
  fileName?: string
  fileSize?: number
  duration?: number
  linkPreview?: LinkPreview
  replyToId?: string
  forwardedFromId?: string
  forwardedFromChatId?: string
  isEdited: boolean
  isDeleted: boolean
  editedAt?: string
  createdAt: string
}

export interface LinkPreview {
  url: string
  title: string
  description: string
  imageUrl: string
  siteName: string
}

export interface SocketPayload {
  join_chat: { chatId: string }
  leave_chat: { chatId: string }
  send_message: {
    chatId: string
    content: string
    type: MessageType
    replyToId?: string
    forwardedFromId?: string
    forwardedFromChatId?: string
    localId?: string
  }
  typing_start: { chatId: string }
  typing_stop: { chatId: string }
  mark_read_batch: { chatId: string; lastMessageId: string }
  update_presence: Record<string, never>
}

export interface AuthenticatedUser {
  id: string
  email: string
  displayName: string
}
