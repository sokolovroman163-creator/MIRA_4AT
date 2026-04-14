import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { verifyFirebaseToken } from '../services/firebase-admin.js'
import { getPB } from '../services/pocketbase.js'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production'

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/auth/google — verify Firebase token, upsert user, return JWT
  app.post('/api/auth/google', async (request: FastifyRequest, reply: FastifyReply) => {
    const { idToken } = request.body as { idToken: string }

    if (!idToken) {
      return reply.status(400).send({ error: 'idToken required' })
    }

    try {
      console.log('[Auth] Received idToken (first 50 chars):', idToken.substring(0, 50))
      const decoded = await verifyFirebaseToken(idToken)
      console.log('[Auth] Firebase token verified for:', decoded.email)
      const pb = getPB()

      // Upsert user in PocketBase
      let user
      let isNewUser = false
      const existingUsers = await pb.collection('users').getList(1, 1, {
        filter: `email = "${decoded.email}"`,
      })

      if (existingUsers.items.length > 0) {
        user = existingUsers.items[0]
        // Update lastSeen and isOnline
        await pb.collection('users').update(user.id, {
          lastSeen: new Date().toISOString(),
          isOnline: true,
        })
      } else {
        // Create new user — PocketBase auth collections require password
        const randomPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
        user = await pb.collection('users').create({
          email: decoded.email,
          password: randomPassword,
          passwordConfirm: randomPassword,
          displayName: decoded.name || decoded.email?.split('@')[0] || 'User',
          avatarUrl: decoded.picture || '',
          bio: '',
          lastSeen: new Date().toISOString(),
          isOnline: true,
          language: 'ru',
        })
        isNewUser = true
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '30d' }
      )

      return reply.send({
        token,
        isNewUser,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          language: user.language,
          lastSeen: user.lastSeen,
          isOnline: user.isOnline,
          createdAt: user.created,
        },
      })
    } catch (err) {
      console.error('[Auth] Google auth error:', err)
      return reply.status(401).send({ error: 'Invalid token' })
    }
  })

  // POST /api/auth/refresh — validate existing JWT, return fresh one
  app.post('/api/auth/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'No token' })
    }

    const token = authHeader.slice(7)
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string }
      const pb = getPB()
      const user = await pb.collection('users').getOne(decoded.userId)

      const newToken = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '30d' }
      )

      return reply.send({
        token: newToken,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          language: user.language,
          lastSeen: user.lastSeen,
          isOnline: user.isOnline,
          createdAt: user.created,
        },
      })
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired token' })
    }
  })

  // POST /api/auth/logout — mark user offline
  app.post('/api/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(200).send({ ok: true })
    }

    const token = authHeader.slice(7)
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
      const pb = getPB()
      await pb.collection('users').update(decoded.userId, {
        isOnline: false,
        lastSeen: new Date().toISOString(),
      })
    } catch {
      // ignore
    }

    return reply.send({ ok: true })
  })
}
