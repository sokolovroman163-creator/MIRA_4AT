import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { getPB } from '../services/pocketbase.js'
import { verifyJWT } from '../middleware/auth.js'

export async function userRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/users/me
  app.get('/api/users/me', { preHandler: verifyJWT }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const pb = getPB()
    try {
      const user = await pb.collection('users').getOne(userId)
      // PocketBase v0.26+: auth collections store files under _pb_users_auth_ path
      // Use public URL for file serving (via Nginx proxy)
      const pbUrl = process.env.POCKETBASE_FILES_URL || process.env.POCKETBASE_URL || 'http://localhost:8090'
      const avatarFullUrl = user.avatar
        ? `${pbUrl}/api/files/_pb_users_auth_/${user.id}/${user.avatar}`
        : (user.avatarUrl || '')

      return reply.send({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: avatarFullUrl,
        bio: user.bio,
        language: user.language,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.created,
      })
    } catch {
      return reply.status(404).send({ error: 'User not found' })
    }
  })

  // PATCH /api/users/me
  app.patch('/api/users/me', { preHandler: verifyJWT }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const body = request.body as { displayName?: string; bio?: string; language?: string }
    const pb = getPB()

    try {
      const updated = await pb.collection('users').update(userId, {
        ...(body.displayName && { displayName: body.displayName.slice(0, 50) }),
        ...(body.bio !== undefined && { bio: body.bio.slice(0, 70) }),
        ...(body.language && { language: body.language }),
      })
      console.log('[Users] Profile updated for:', userId)
      return reply.send({ id: updated.id, displayName: updated.displayName, bio: updated.bio, language: updated.language })
    } catch (err) {
      console.error('[Users] Update error:', err)
      return reply.status(500).send({ error: 'Update failed' })
    }
  })

  // GET /api/users/search?q=query
  app.get('/api/users/search', { preHandler: verifyJWT }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { q } = request.query as { q?: string }
    if (!q || q.length < 2) {
      return reply.send([])
    }

    const pb = getPB()
    // Use public URL for file serving (via Nginx proxy)
    const pbUrl = process.env.POCKETBASE_FILES_URL || process.env.POCKETBASE_URL || 'http://localhost:8090'
    try {
      const results = await pb.collection('users').getList(1, 20, {
        filter: `displayName ~ "${q}" || email ~ "${q}"`,
      })
      return reply.send(results.items.map(u => ({
        id: u.id,
        displayName: u.displayName,
        avatarUrl: u.avatar ? `${pbUrl}/api/files/_pb_users_auth_/${u.id}/${u.avatar}` : (u.avatarUrl || ''),
        email: u.email,
        isOnline: u.isOnline,
        lastSeen: u.lastSeen,
      })))
    } catch (err) {
      console.error('[Users] Search error:', err)
      return reply.status(500).send({ error: 'Search failed' })
    }
  })

  // POST /api/users/me/avatar — upload avatar image
  app.post('/api/users/me/avatar', { preHandler: verifyJWT }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const pb = getPB()

    try {
      console.log('[Users] Processing avatar upload for:', userId)
      const data = await request.file()
      if (!data) {
        console.warn('[Users] No file provided for avatar upload')
        return reply.status(400).send({ error: 'No file provided' })
      }

      // Validate mime type
      if (!data.mimetype.startsWith('image/')) {
        console.warn('[Users] Invalid mime type for avatar:', data.mimetype)
        return reply.status(400).send({ error: 'Only image files are allowed' })
      }

      console.log('[Users] Reading file buffer...')
      const buffer = await data.toBuffer()
      const blob = new Blob([new Uint8Array(buffer)], { type: data.mimetype })
      const formData = new FormData()
      // PocketBase file field name is 'avatar'
      formData.append('avatar', blob, data.filename)

      console.log('[Users] Updating PocketBase record...')
      const updated = await pb.collection('users').update(userId, formData)

      // Build the full avatar URL from PocketBase
      // PocketBase v0.26+: auth collections store files under _pb_users_auth_ path
      // Use public URL for file serving (via Nginx proxy)
      const pbUrl = process.env.POCKETBASE_FILES_URL || process.env.POCKETBASE_URL || 'http://localhost:8090'
      const avatarUrl = updated.avatar
        ? `${pbUrl}/api/files/_pb_users_auth_/${userId}/${updated.avatar}`
        : ''

      console.log('[Users] Avatar updated successfully:', avatarUrl)
      return reply.send({ avatarUrl })
    } catch (err) {
      console.error('[Users] Avatar upload error:', err)
      return reply.status(500).send({ error: 'Avatar upload failed' })
    }
  })

  // POST /api/devices — register push subscription
  app.post('/api/devices', { preHandler: verifyJWT }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const { pushSubscription, userAgent } = request.body as { pushSubscription: string; userAgent: string }

    if (!pushSubscription) {
      return reply.status(400).send({ error: 'pushSubscription required' })
    }

    const pb = getPB()
    try {
      // Check if same subscription already exists
      const existing = await pb.collection('userDevices').getList(1, 1, {
        filter: `userId = "${userId}" && pushSubscription = "${pushSubscription.replace(/"/g, '\\"')}"`,
      })

      if (existing.items.length === 0) {
        await pb.collection('userDevices').create({
          userId,
          pushSubscription,
          userAgent: userAgent || '',
          lastActiveAt: new Date().toISOString(),
        })
      } else {
        await pb.collection('userDevices').update(existing.items[0].id, {
          lastActiveAt: new Date().toISOString(),
        })
      }

      return reply.send({ ok: true })
    } catch (err) {
      console.error('[Devices] Register error:', err)
      return reply.status(500).send({ error: 'Failed to register device' })
    }
  })

  // DELETE /api/devices — unregister push subscription
  app.delete('/api/devices', { preHandler: verifyJWT }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string }
    const { pushSubscription } = request.body as { pushSubscription?: string }

    const pb = getPB()
    try {
      if (pushSubscription) {
        // Delete specific subscription
        const existing = await pb.collection('userDevices').getList(1, 1, {
          filter: `userId = "${userId}" && pushSubscription = "${pushSubscription.replace(/"/g, '\\"')}"`,
        })
        if (existing.items.length > 0) {
          await pb.collection('userDevices').delete(existing.items[0].id)
        }
      } else {
        // Delete ALL subscriptions for this user (full logout)
        const allDevices = await pb.collection('userDevices').getFullList({
          filter: `userId = "${userId}"`,
        })
        for (const device of allDevices) {
          await pb.collection('userDevices').delete(device.id)
        }
      }

      return reply.send({ ok: true })
    } catch (err) {
      console.error('[Devices] Delete error:', err)
      return reply.status(500).send({ error: 'Failed to unregister device' })
    }
  })
}
