import type { MessageType, ChatType, MemberRole } from './index'

export type { MessageType, ChatType, MemberRole }

export interface PocketBaseUser {
  id: string
  email: string
  displayName: string
  avatarUrl: string
  bio: string
  lastSeen: string
  isOnline: boolean
  language: 'ru' | 'en'
  created: string
  updated: string
}

export interface PocketBaseChat {
  id: string
  type: ChatType
  name: string
  avatarUrl: string
  createdBy: string
  pinnedMessageId: string
  description: string
  isArchived: boolean
  created: string
  updated: string
}

export interface PocketBaseChatMember {
  id: string
  chatId: string
  userId: string
  role: MemberRole
  isMuted: boolean
  notificationsEnabled: boolean
  joinedAt: string
  created: string
  updated: string
}

export interface PocketBaseMessage {
  id: string
  chatId: string
  senderId: string
  type: MessageType
  content: string
  fileUrl: string
  fileName: string
  fileSize: number
  duration: number
  linkPreview: string // JSON string
  replyToId: string
  forwardedFromId: string
  forwardedFromChatId: string
  isEdited: boolean
  isDeleted: boolean
  editedAt: string
  created: string
  updated: string
}
