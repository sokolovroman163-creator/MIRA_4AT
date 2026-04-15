import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { getPB } from '../services/pocketbase.js'
import { verifyJWT } from '../middleware/auth.js'
import { sendPushToUser } from '../services/webpush.js'

export async function messageRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/messages/upload — create an image message with file
  app.post('/api/messages/upload', { preHandler: verifyJWT }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const pb = getPB()

    try {
      const parts = request.parts()
      let chatId = ''
      let localId = ''
      let fileBuffer: Buffer | null = null
      let fileName = 'upload'
      let mimeType = 'application/octet-stream'

      for await (const part of parts) {
        if (part.type === 'field') {
          if (part.fieldname === 'chatId') chatId = part.value as string
          if (part.fieldname === 'localId') localId = part.value as string
        } else if (part.type === 'file') {
          fileBuffer = await part.toBuffer()
          fileName = part.filename || 'upload'
          mimeType = part.mimetype || 'application/octet-stream'
        }
      }

      if (!chatId || !fileBuffer) {
        return reply.status(400).send({ error: 'chatId and file are required' })
      }

      // Verify membership
      await pb.collection('chatMembers').getFirstListItem(
        `chatId = "${chatId}" && userId = "${userId}"`
      )

      // Build FormData for PocketBase
      const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType })
      const formData = new FormData()
      formData.append('chatId', chatId)
      formData.append('senderId', userId)
      formData.append('type', 'image')
      formData.append('content', '')
      formData.append('isEdited', 'false')
      formData.append('isDeleted', 'false')
      formData.append('file', blob, fileName)

      const message = await pb.collection('messages').create(formData)

      // Get file URL from PocketBase and make it relative
      const pbUrl = new URL(pb.files.getURL(message, message.file as string))
      const fileUrl = pbUrl.pathname + pbUrl.search

      // Get sender info
      const sender = await pb.collection('users').getOne(userId)

      const messagePayload = {
        id: message.id,
        chatId: message.chatId as string,
        senderId: message.senderId as string,
        type: 'image',
        content: '',
        fileUrl,
        fileName,
        isEdited: false,
        isDeleted: false,
        createdAt: message.created as string,
        localId,
        sender: {
          id: sender.id,
          displayName: sender.displayName as string,
          avatarUrl: sender.avatarUrl as string,
        },
      }

      // Broadcast via Socket.IO — get io from app instance
      const io = (app as FastifyInstance & { io?: import('socket.io').Server }).io
      if (io) {
        // Emit to the specific chat room
        io.to(`chat:${chatId}`).emit('new_message', messagePayload)

        // Get members to emit to their personal rooms
        const allMembers = await pb.collection('chatMembers').getFullList({
          filter: `chatId = "${chatId}"`,
        })
        for (const member of allMembers) {
          if (member.userId !== userId) {
            io.to(`user:${member.userId}`).emit('new_message', messagePayload)
          }
        }
      }

      // Push notifications to other members
      const members = await pb.collection('chatMembers').getFullList({
        filter: `chatId = "${chatId}" && userId != "${userId}" && (isMuted = false || isMuted = null)`,
      })

      const chat = await pb.collection('chats').getOne(chatId)
      const isGroup = chat.type === 'group'
      const pushTitle = isGroup ? `${sender.displayName as string} в ${chat.name as string}` : sender.displayName as string

      for (const member of members) {
        if (io) {
          const sockets = await io.in(`chat:${chatId}`).fetchSockets()
          const memberConnected = sockets.some(s => s.data.userId === member.userId)
          if (memberConnected) continue
        }
        await sendPushToUser(member.userId as string, {
          title: pushTitle,
          body: '📷 Фото',
          icon: sender.avatarUrl as string || '/icons/icon-192.png',
          badge: '/icons/badge-72.png',
          data: { chatId, messageId: message.id },
        })
      }

      return reply.send(messagePayload)
    } catch (err) {
      console.error('[Messages] Upload error:', err)
      return reply.status(500).send({ error: 'Upload failed' })
    }
  })

  // POST /api/messages/upload-audio — create a voice message with audio file
  app.post('/api/messages/upload-audio', { preHandler: verifyJWT }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const pb = getPB()

    try {
      const parts = request.parts()
      let chatId = ''
      let localId = ''
      let duration = 0
      let fileBuffer: Buffer | null = null
      let fileName = 'voice.webm'
      let mimeType = 'audio/webm'

      for await (const part of parts) {
        if (part.type === 'field') {
          if (part.fieldname === 'chatId') chatId = part.value as string
          if (part.fieldname === 'localId') localId = part.value as string
          if (part.fieldname === 'duration') duration = parseInt(part.value as string) || 0
        } else if (part.type === 'file') {
          fileBuffer = await part.toBuffer()
          fileName = part.filename || 'voice.webm'
          mimeType = part.mimetype || 'audio/webm'
        }
      }

      if (!chatId || !fileBuffer) {
        return reply.status(400).send({ error: 'chatId and file are required' })
      }

      // Verify membership
      await pb.collection('chatMembers').getFirstListItem(
        `chatId = "${chatId}" && userId = "${userId}"`
      )

      const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType })
      const formData = new FormData()
      formData.append('chatId', chatId)
      formData.append('senderId', userId)
      formData.append('type', 'audio')
      formData.append('content', '')
      formData.append('duration', String(duration))
      formData.append('isEdited', 'false')
      formData.append('isDeleted', 'false')
      formData.append('file', blob, fileName)

      const message = await pb.collection('messages').create(formData)
      const pbUrl = new URL(pb.files.getURL(message, message.file as string))
      const fileUrl = pbUrl.pathname + pbUrl.search
      const sender = await pb.collection('users').getOne(userId)

      const messagePayload = {
        id: message.id,
        chatId: message.chatId as string,
        senderId: message.senderId as string,
        type: 'audio',
        content: '',
        fileUrl,
        fileName,
        duration,
        isEdited: false,
        isDeleted: false,
        createdAt: message.created as string,
        localId,
        sender: {
          id: sender.id,
          displayName: sender.displayName as string,
          avatarUrl: sender.avatarUrl as string,
        },
      }

      const io = (app as FastifyInstance & { io?: import('socket.io').Server }).io
      if (io) {
        // Emit to the specific chat room
        io.to(`chat:${chatId}`).emit('new_message', messagePayload)

        // Get members to emit to their personal rooms
        const allMembers = await pb.collection('chatMembers').getFullList({
          filter: `chatId = "${chatId}"`,
        })
        for (const member of allMembers) {
          if (member.userId !== userId) {
            io.to(`user:${member.userId}`).emit('new_message', messagePayload)
          }
        }
      }

      // Push to other members
      const members = await pb.collection('chatMembers').getFullList({
        filter: `chatId = "${chatId}" && userId != "${userId}" && (isMuted = false || isMuted = null)`,
      })
      const chat = await pb.collection('chats').getOne(chatId)
      const isGroup = chat.type === 'group'
      const pushTitle = isGroup
        ? `${sender.displayName as string} в ${chat.name as string}`
        : sender.displayName as string

      for (const member of members) {
        if (io) {
          const sockets = await io.in(`chat:${chatId}`).fetchSockets()
          const memberConnected = sockets.some(s => s.data.userId === member.userId)
          if (memberConnected) continue
        }
        await sendPushToUser(member.userId as string, {
          title: pushTitle,
          body: '🎤 Голосовое сообщение',
          icon: sender.avatarUrl as string || '/icons/icon-192.png',
          badge: '/icons/badge-72.png',
          data: { chatId, messageId: message.id },
        })
      }

      return reply.send(messagePayload)
    } catch (err) {
      console.error('[Messages] Audio upload error:', err)
      return reply.status(500).send({ error: 'Audio upload failed' })
    }
  })

  // GET /api/messages/:chatId — paginated messages
  app.get('/api/messages/:chatId', { preHandler: verifyJWT }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const { chatId } = request.params as { chatId: string }
    const { page = '1', perPage = '30', before } = request.query as {
      page?: string
      perPage?: string
      before?: string // messageId — load messages before this one
    }
    const pb = getPB()

    try {
      // Verify membership
      await pb.collection('chatMembers').getFirstListItem(
        `chatId = "${chatId}" && userId = "${userId}"`
      )

      let filter = `chatId = "${chatId}"`
      if (before) {
        const pivot = await pb.collection('messages').getOne(before)
        filter += ` && created < "${pivot.created}"`
      }

      const result = await pb.collection('messages').getList(
        parseInt(page), parseInt(perPage),
        { filter, sort: '-created', expand: 'senderId' }
      )

      // Collect unique replyToIds to batch-fetch reply previews
      const replyToIds = [...new Set(
        result.items
          .map(m => m.replyToId as string)
          .filter(id => id && id.length > 0)
      )]
      const replyMap: Record<string, { id: string; content: string; type: string; senderId: string }> = {}
      for (const rid of replyToIds) {
        try {
          const replyMsg = await pb.collection('messages').getOne(rid)
          replyMap[rid] = {
            id: replyMsg.id,
            content: replyMsg.content as string,
            type: replyMsg.type as string,
            senderId: replyMsg.senderId as string,
          }
        } catch { /* reply message may have been deleted */ }
      }

      const messages = result.items.map(msg => {
        // Build file URL from PocketBase file field, fallback to text fileUrl field
        let fileUrl = msg.fileUrl as string || ''
        if (msg.file) {
          const pbUrl = new URL(pb.files.getURL(msg, msg.file as string))
          fileUrl = pbUrl.pathname + pbUrl.search
        }

        return {
          id: msg.id,
          chatId: msg.chatId,
          senderId: msg.senderId,
          type: msg.type,
          content: msg.content,
          fileUrl,
          fileName: msg.fileName,
          fileSize: msg.fileSize,
          duration: msg.duration,
          linkPreview: msg.linkPreview
            ? (typeof msg.linkPreview === 'string' ? (() => { try { return JSON.parse(msg.linkPreview as string) } catch { return null } })() : msg.linkPreview)
            : null,
          replyToId: msg.replyToId,
          replyTo: replyMap[msg.replyToId as string] ?? null,
          forwardedFromId: msg.forwardedFromId,
          forwardedFromChatId: msg.forwardedFromChatId,
          isEdited: msg.isEdited,
          isDeleted: msg.isDeleted,
          editedAt: msg.editedAt,
          createdAt: msg.created,
          sender: msg.expand?.senderId ? {
            id: msg.expand.senderId.id,
            displayName: msg.expand.senderId.displayName,
            avatarUrl: msg.expand.senderId.avatarUrl,
          } : null,
        }
      })

      return reply.send({
        items: messages.reverse(), // oldest first
        page: result.page,
        perPage: result.perPage,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
      })
    } catch (err) {
      console.error('[Messages] List error:', err)
      return reply.status(500).send({ error: 'Failed to load messages' })
    }
  })

  // GET /api/messages/:chatId/search — search messages
  app.get('/api/messages/:chatId/search', { preHandler: verifyJWT }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const { chatId } = request.params as { chatId: string }
    const { q, page = '1' } = request.query as { q?: string; page?: string }

    if (!q || q.length < 2) {
      return reply.send({ items: [], totalItems: 0 })
    }

    const pb = getPB()
    try {
      await pb.collection('chatMembers').getFirstListItem(
        `chatId = "${chatId}" && userId = "${userId}"`
      )

      const result = await pb.collection('messages').getList(
        parseInt(page), 20,
        {
          filter: `chatId = "${chatId}" && content ~ "${q}" && isDeleted = false`,
          sort: '-created',
          expand: 'senderId',
        }
      )

      return reply.send({
        items: result.items.map(msg => ({
          id: msg.id,
          content: msg.content,
          type: msg.type,
          senderId: msg.senderId,
          createdAt: msg.created,
          sender: msg.expand?.senderId ? {
            id: msg.expand.senderId.id,
            displayName: msg.expand.senderId.displayName,
          } : null,
        })),
        totalItems: result.totalItems,
      })
    } catch (err) {
      console.error('[Messages] Search error:', err)
      return reply.status(500).send({ error: 'Search failed' })
    }
  })

  // PATCH /api/messages/:id — edit message
  app.patch('/api/messages/:id', { preHandler: verifyJWT }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    const { content } = request.body as { content: string }
    const pb = getPB()

    try {
      const msg = await pb.collection('messages').getOne(id)
      if (msg.senderId !== userId) {
        return reply.status(403).send({ error: 'Not your message' })
      }

      // 48 hour edit window
      const createdAt = new Date(msg.created).getTime()
      if (Date.now() - createdAt > 48 * 60 * 60 * 1000) {
        return reply.status(403).send({ error: 'Edit window expired' })
      }

      const updated = await pb.collection('messages').update(id, {
        content,
        isEdited: true,
        editedAt: new Date().toISOString(),
      })

      const io = (app as FastifyInstance & { io?: import('socket.io').Server }).io
      io?.to(`chat:${msg.chatId}`).emit('message_edited', {
        id: updated.id,
        chatId: msg.chatId,
        content: updated.content,
        isEdited: true,
      })

      return reply.send({ id: updated.id, content: updated.content, isEdited: true })
    } catch (err) {
      console.error('[Messages] Edit error:', err)
      return reply.status(500).send({ error: 'Edit failed' })
    }
  })

  // DELETE /api/messages/:id
  app.delete('/api/messages/:id', { preHandler: verifyJWT }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    const pb = getPB()

    try {
      const msg = await pb.collection('messages').getOne(id)

      // Check permissions: author or admin/owner
      if (msg.senderId !== userId) {
        const membership = await pb.collection('chatMembers').getFirstListItem(
          `chatId = "${msg.chatId}" && userId = "${userId}" && (role = "admin" || role = "owner")`
        )
        if (!membership) {
          return reply.status(403).send({ error: 'Permission denied' })
        }
      }

      await pb.collection('messages').update(id, {
        isDeleted: true,
        content: '',
        fileUrl: '',
      })

      const io = (app as FastifyInstance & { io?: import('socket.io').Server }).io
      io?.to(`chat:${msg.chatId}`).emit('message_deleted', {
        messageId: msg.id,
        chatId: msg.chatId,
      })

      return reply.send({ ok: true })
    } catch (err) {
      console.error('[Messages] Delete error:', err)
      return reply.status(500).send({ error: 'Delete failed' })
    }
  })

  // POST /api/messages/:id/reactions
  app.post('/api/messages/:id/reactions', { preHandler: verifyJWT }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const { id: messageId } = request.params as { id: string }
    const { emoji } = request.body as { emoji: string }
    const pb = getPB()

    try {
      // Get message to find chatId
      const msg = await pb.collection('messages').getOne(messageId)
      const io = (app as FastifyInstance & { io?: import('socket.io').Server }).io

      // Check if already reacted with same emoji
      const existing = await pb.collection('reactions').getList(1, 1, {
        filter: `messageId = "${messageId}" && userId = "${userId}" && emoji = "${emoji}"`,
      })

      if (existing.items.length > 0) {
        // Toggle off
        await pb.collection('reactions').delete(existing.items[0].id)
        
        io?.to(`chat:${msg.chatId}`).emit('reaction_removed', {
          messageId,
          reactionId: existing.items[0].id,
          userId,
          emoji,
        })
        
        return reply.send({ removed: true, reactionId: existing.items[0].id })
      }

      const reaction = await pb.collection('reactions').create({
        messageId,
        userId,
        emoji,
      })

      io?.to(`chat:${msg.chatId}`).emit('reaction_added', {
        id: reaction.id,
        messageId,
        userId,
        emoji,
      })

      return reply.send({ id: reaction.id, messageId, userId, emoji })
    } catch (err) {
      console.error('[Reactions] Error:', err)
      return reply.status(500).send({ error: 'Reaction failed' })
    }
  })
}
