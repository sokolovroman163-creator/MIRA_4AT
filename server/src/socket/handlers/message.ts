import type { Server, Socket } from 'socket.io'
import { getPB } from '../../services/pocketbase.js'
import { sendPushToUser } from '../../services/webpush.js'
import { extractUrls, fetchLinkPreview } from '../../services/linkPreview.js'

export function registerMessageHandlers(io: Server, socket: Socket, userId: string): void {
  // Send message
  socket.on('send_message', async (data: {
    chatId: string
    content: string
    type: string
    replyToId?: string
    forwardedFromId?: string
    forwardedFromChatId?: string
    localId?: string
  }) => {
    const pb = getPB()

    try {
      // Verify membership
      await pb.collection('chatMembers').getFirstListItem(
        `chatId = "${data.chatId}" && userId = "${userId}"`
      )

      const message = await pb.collection('messages').create({
        chatId: data.chatId,
        senderId: userId,
        type: data.type || 'text',
        content: data.content || '',
        replyToId: data.replyToId || '',
        forwardedFromId: data.forwardedFromId || '',
        forwardedFromChatId: data.forwardedFromChatId || '',
        isEdited: false,
        isDeleted: false,
      })

      // Get sender info
      const sender = await pb.collection('users').getOne(userId)

      // Use public URL for file serving (via Nginx proxy)
      const pbUrl = process.env.POCKETBASE_FILES_URL || process.env.POCKETBASE_URL || 'http://localhost:8090'
      const avatarFullUrl = sender.avatar
        ? `${pbUrl}/api/files/_pb_users_auth_/${sender.id}/${sender.avatar}`
        : (sender.avatarUrl || '')

      const messagePayload = {
        id: message.id,
        chatId: message.chatId,
        senderId: message.senderId,
        type: message.type,
        content: message.content,
        replyToId: message.replyToId,
        forwardedFromId: message.forwardedFromId,
        forwardedFromChatId: message.forwardedFromChatId,
        isEdited: false,
        isDeleted: false,
        createdAt: message.created,
        localId: data.localId,
        sender: {
          id: sender.id,
          displayName: sender.displayName,
          avatarUrl: avatarFullUrl,
        },
      }

      // Broadcast to all chat members via their personal rooms + the chat room
      const allMembers = await pb.collection('chatMembers').getFullList({
        filter: `chatId = "${data.chatId}"`,
      })
      
      // Using an array of rooms ensures each socket receives the message exactly once
      const targetRooms = [`chat:${data.chatId}`, ...allMembers.map(m => `user:${m.userId}`)]
      io.to(targetRooms).emit('new_message', messagePayload)

      // Send push to other members (not the sender)
      const members = await pb.collection('chatMembers').getFullList({
        filter: `chatId = "${data.chatId}" && userId != "${userId}" && (isMuted = false || isMuted = null)`,
      })

      // Get chat info for push title
      const chat = await pb.collection('chats').getOne(data.chatId)
      const isGroup = chat.type === 'group'

      for (const member of members) {
        // Don't push if member is currently in the chat (connected to room)
        const sockets = await io.in(`chat:${data.chatId}`).fetchSockets()
        const memberConnected = sockets.some(s => s.data.userId === member.userId)
        if (memberConnected) continue

        const pushTitle = isGroup ? `${sender.displayName} в ${chat.name}` : sender.displayName
        const pushBody = data.type === 'text'
          ? data.content.slice(0, 100)
          : data.type === 'image' ? '📷 Фото'
          : data.type === 'audio' ? '🎤 Голосовое сообщение'
          : data.type === 'gif' ? 'GIF'
          : data.content.slice(0, 100)

        await sendPushToUser(member.userId as string, {
          title: pushTitle,
          body: pushBody,
          icon: sender.avatarUrl || '/icons/icon-192.png',
          badge: '/icons/badge-72.png',
          data: { chatId: data.chatId, messageId: message.id },
        })
      }

      // Process link preview in background
      if (data.type === 'text' && data.content) {
        const urls = extractUrls(data.content)
        if (urls.length > 0) {
          fetchLinkPreview(urls[0]).then(async preview => {
            if (!preview) return
            try {
              await pb.collection('messages').update(message.id, {
                linkPreview: JSON.stringify(preview),
              })
              io.to(`chat:${data.chatId}`).emit('message_link_preview_ready', {
                messageId: message.id,
                chatId: data.chatId,
                linkPreview: preview,
              })
            } catch { /* ignore */ }
          })
        }
      }
    } catch (err) {
      console.error('[Socket] send_message error:', err)
      socket.emit('message_error', { localId: data.localId, error: 'Failed to send message' })
    }
  })

  // Mark messages as read
  socket.on('mark_read_batch', async (data: { chatId: string; lastMessageId: string }) => {
    const pb = getPB()
    try {
      const now = new Date().toISOString()

      // Upsert messageReads
      const existing = await pb.collection('messageReads').getList(1, 1, {
        filter: `chatId = "${data.chatId}" && userId = "${userId}"`,
      })

      if (existing.items.length > 0) {
        await pb.collection('messageReads').update(existing.items[0].id, {
          lastReadMessageId: data.lastMessageId,
          readAt: now,
        })
      } else {
        await pb.collection('messageReads').create({
          chatId: data.chatId,
          userId,
          lastReadMessageId: data.lastMessageId,
          readAt: now,
        })
      }

      // Notify message author(s) about read
      io.to(`chat:${data.chatId}`).emit('messages_read', {
        chatId: data.chatId,
        userId,
        lastMessageId: data.lastMessageId,
      })
    } catch (err) {
      console.error('[Socket] mark_read_batch error:', err)
    }
  })
}
