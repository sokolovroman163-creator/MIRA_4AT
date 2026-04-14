import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { getPB } from '../services/pocketbase.js'
import { verifyJWT } from '../middleware/auth.js'

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/chats — paginated list of user's chats
  app.get('/api/chats', { preHandler: verifyJWT }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const { page = '1', perPage = '20' } = request.query as { page?: string; perPage?: string }
    const pb = getPB()

    try {
      // Get chats where user is member
      console.log('[Chats] Loading chats for userId:', userId)
      const memberships = await pb.collection('chatMembers').getList(
        parseInt(page), parseInt(perPage),
        {
          filter: `userId = "${userId}"`,
          sort: '-updated',
          expand: 'chatId',
        }
      )

      const chats = []
      for (const membership of memberships.items) {
        const chat = membership.expand?.chatId
        if (!chat) continue

        // Get last message
        let lastMessage = null
        try {
          const msgs = await pb.collection('messages').getList(1, 1, {
            filter: `chatId = "${chat.id}" && isDeleted = false`,
            sort: '-created',
          })
          if (msgs.items.length > 0) {
            const msg = msgs.items[0]
            lastMessage = {
              id: msg.id,
              type: msg.type,
              content: msg.content,
              senderId: msg.senderId,
              createdAt: msg.created,
            }
          }
        } catch { /* no messages yet */ }

        // Count unread
        let unreadCount = 0
        try {
          const readRecord = await pb.collection('messageReads').getFirstListItem(
            `chatId = "${chat.id}" && userId = "${userId}"`
          )
          if (readRecord && lastMessage) {
            const allAfter = await pb.collection('messages').getList(1, 1, {
              filter: `chatId = "${chat.id}" && created > "${readRecord.readAt}" && senderId != "${userId}" && isDeleted = false`,
            })
            unreadCount = allAfter.totalItems
          }
        } catch {
          // No read record = all unread
          try {
            const total = await pb.collection('messages').getList(1, 1, {
              filter: `chatId = "${chat.id}" && senderId != "${userId}" && isDeleted = false`,
            })
            unreadCount = total.totalItems
          } catch { /* ignore */ }
        }

        chats.push({
          id: chat.id,
          type: chat.type,
          name: chat.name,
          avatarUrl: chat.avatarUrl,
          description: chat.description,
          isArchived: chat.isArchived,
          createdAt: chat.created,
          isMuted: membership.isMuted,
          lastMessage,
          unreadCount,
        })
      }

      return reply.send({
        items: chats,
        page: memberships.page,
        perPage: memberships.perPage,
        totalItems: memberships.totalItems,
        totalPages: memberships.totalPages,
      })
    } catch (err) {
      console.error('[Chats] List error:', err)
      return reply.status(500).send({ error: 'Failed to load chats' })
    }
  })

  // POST /api/chats — create direct or group chat
  app.post('/api/chats', { preHandler: verifyJWT }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const body = request.body as {
      type: 'direct' | 'group'
      memberIds: string[]
      name?: string
      description?: string
    }

    const pb = getPB()

    try {
      // For direct chats: check if already exists
      if (body.type === 'direct') {
        const targetId = body.memberIds.find(id => id !== userId)
        if (!targetId) {
          return reply.status(400).send({ error: 'Target user required' })
        }

        // Find existing direct chat between these two users
        const existingMemberships = await pb.collection('chatMembers').getFullList({
          filter: `userId = "${userId}"`,
          expand: 'chatId',
        })

        for (const m of existingMemberships) {
          const chat = m.expand?.chatId
          if (!chat || chat.type !== 'direct') continue

          const otherMembers = await pb.collection('chatMembers').getList(1, 5, {
            filter: `chatId = "${chat.id}" && userId = "${targetId}"`,
          })
          if (otherMembers.items.length > 0) {
            return reply.send({ id: chat.id, existing: true })
          }
        }

        // Create new direct chat
        const targetUser = await pb.collection('users').getOne(targetId)
        const chat = await pb.collection('chats').create({
          type: 'direct',
          name: targetUser.displayName,
          avatarUrl: targetUser.avatarUrl,
          createdBy: userId,
          isArchived: false,
        })

        await pb.collection('chatMembers').create({ chatId: chat.id, userId, role: 'member', isMuted: false, notificationsEnabled: true, joinedAt: new Date().toISOString() })
        await pb.collection('chatMembers').create({ chatId: chat.id, userId: targetId, role: 'member', isMuted: false, notificationsEnabled: true, joinedAt: new Date().toISOString() })

        // System message
        await pb.collection('messages').create({
          chatId: chat.id,
          senderId: userId,
          type: 'system',
          content: 'Чат создан',
          isEdited: false,
          isDeleted: false,
        })

        return reply.send({ id: chat.id, existing: false })
      }

      // Group chat
      if (!body.name) {
        return reply.status(400).send({ error: 'Group name required' })
      }

      const chat = await pb.collection('chats').create({
        type: 'group',
        name: body.name.slice(0, 100),
        description: body.description?.slice(0, 200) || '',
        createdBy: userId,
        isArchived: false,
      })

      // Add creator as owner
      await pb.collection('chatMembers').create({ chatId: chat.id, userId, role: 'owner', isMuted: false, notificationsEnabled: true, joinedAt: new Date().toISOString() })

      // Add other members
      const uniqueMembers = [...new Set(body.memberIds.filter(id => id !== userId))]
      for (const memberId of uniqueMembers.slice(0, 499)) {
        await pb.collection('chatMembers').create({ chatId: chat.id, userId: memberId, role: 'member', isMuted: false, notificationsEnabled: true, joinedAt: new Date().toISOString() })
      }

      // System message
      await pb.collection('messages').create({
        chatId: chat.id,
        senderId: userId,
        type: 'system',
        content: 'Группа создана',
        isEdited: false,
        isDeleted: false,
      })

      return reply.send({ id: chat.id, existing: false })
    } catch (err) {
      console.error('[Chats] Create error:', err)
      return reply.status(500).send({ error: 'Failed to create chat' })
    }
  })

  // GET /api/chats/:id — get single chat info
  app.get('/api/chats/:id', { preHandler: verifyJWT }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }
    const pb = getPB()

    try {
      // Verify membership
      const membership = await pb.collection('chatMembers').getFirstListItem(
        `chatId = "${id}" && userId = "${userId}"`
      )
      if (!membership) {
        return reply.status(403).send({ error: 'Not a member' })
      }

      const chat = await pb.collection('chats').getOne(id)
      const members = await pb.collection('chatMembers').getFullList({
        filter: `chatId = "${id}"`,
        expand: 'userId',
      })

      return reply.send({
        id: chat.id,
        type: chat.type,
        name: chat.name,
        avatarUrl: chat.avatarUrl,
        description: chat.description,
        isArchived: chat.isArchived,
        pinnedMessageId: chat.pinnedMessageId,
        createdAt: chat.created,
        members: members.map(m => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          isMuted: m.isMuted,
          joinedAt: m.joinedAt,
          user: m.expand?.userId ? {
            id: m.expand.userId.id,
            displayName: m.expand.userId.displayName,
            avatarUrl: m.expand.userId.avatarUrl,
            isOnline: m.expand.userId.isOnline,
            lastSeen: m.expand.userId.lastSeen,
          } : null,
        })),
      })
    } catch (err) {
      console.error('[Chats] Get error:', err)
      return reply.status(404).send({ error: 'Chat not found' })
    }
  })
}
