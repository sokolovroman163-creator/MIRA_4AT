// Shared types for MIRA Messenger

export type MessageType = 'text' | 'image' | 'audio' | 'gif' | 'sticker' | 'system'
export type ChatType = 'direct' | 'group'
export type MemberRole = 'owner' | 'admin' | 'member'
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read'

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

export interface Chat {
  id: string
  type: ChatType
  name: string
  avatarUrl: string
  createdBy: string
  createdAt: string
  pinnedMessageId?: string
  description?: string
  isArchived: boolean
  // Computed fields from join
  lastMessage?: Message
  unreadCount?: number
  isMuted?: boolean
  members?: ChatMember[]
}

export interface ChatMember {
  id: string
  chatId: string
  userId: string
  role: MemberRole
  joinedAt: string
  isMuted: boolean
  notificationsEnabled: boolean
  user?: User
}

export interface LinkPreview {
  url: string
  title: string
  description: string
  imageUrl: string
  siteName: string
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
  replyTo?: Message
  forwardedFromId?: string
  forwardedFromChatId?: string
  isEdited: boolean
  isDeleted: boolean
  editedAt?: string
  createdAt: string
  // Computed
  sender?: User
  reactions?: Reaction[]
  status?: MessageStatus
  localId?: string // for optimistic updates
}

export interface Reaction {
  id: string
  messageId: string
  userId: string
  emoji: string
  createdAt: string
  user?: User
}

export interface MessageRead {
  id: string
  chatId: string
  userId: string
  lastReadMessageId: string
  readAt: string
}

export interface UserDevice {
  id: string
  userId: string
  pushSubscription: string
  userAgent: string
  createdAt: string
  lastActiveAt: string
}

export interface PendingMessage {
  localId: string
  chatId: string
  content: string
  type: MessageType
  replyToId?: string
  createdAt: string
  status: 'pending'
  fileData?: {
    base64: string
    mimeType: string
    fileName: string
  }
}

// Socket.IO event payloads
export interface SocketSendMessage {
  chatId: string
  content: string
  type: MessageType
  replyToId?: string
  forwardedFromId?: string
  forwardedFromChatId?: string
  localId?: string
}

export interface SocketMarkRead {
  chatId: string
  lastMessageId: string
}

export interface SocketTyping {
  chatId: string
}
