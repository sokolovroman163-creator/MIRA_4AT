import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { createServer, type IncomingMessage, type ServerResponse, type Server as HTTPServer } from 'http'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'

import { initPocketBase, getPB } from './services/pocketbase.js'
import { initFirebaseAdmin } from './services/firebase-admin.js'
import { initWebPush } from './services/webpush.js'

import { authRoutes } from './routes/auth.js'
import { userRoutes } from './routes/users.js'
import { chatRoutes } from './routes/chats.js'
import { messageRoutes } from './routes/messages.js'

import { registerMessageHandlers } from './socket/handlers/message.js'
import { registerTypingHandlers } from './socket/handlers/typing.js'
import { registerPresenceHandlers } from './socket/handlers/presence.js'

const PORT = parseInt(process.env.PORT || '3000')
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production'

async function main() {
  // Initialize services
  initFirebaseAdmin()
  initWebPush()

  try {
    await initPocketBase()
  } catch (err) {
    console.error('Failed to connect to PocketBase. Make sure it is running on', process.env.POCKETBASE_URL)
    console.error(err)
    process.exit(1)
  }

  // Create shared HTTP server via serverFactory so both Fastify and Socket.IO share it
  let httpServer!: HTTPServer
  const app = Fastify({
    logger: false,
    serverFactory: (handler) => {
      httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
        handler(req, res)
      })
      return httpServer
    },
  })

  // Socket.IO attaches to the same httpServer
  const io = new Server(httpServer, {
    cors: {
      origin: CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  // CORS
  await app.register(cors, {
    origin: CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  // Multipart (file uploads)
  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  })

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // Decorate fastify with io so routes can broadcast
  app.decorate('io', io)

  // Register routes
  await app.register(authRoutes)
  await app.register(userRoutes)
  await app.register(chatRoutes)
  await app.register(messageRoutes)

  // File upload endpoint — proxy to PocketBase
  app.post('/api/upload/:collection/:recordId', async (request, reply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const token = authHeader.slice(7)
    let userId: string
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
      userId = decoded.userId
    } catch {
      return reply.status(401).send({ error: 'Invalid token' })
    }

    const { collection, recordId } = request.params as { collection: string; recordId: string }
    const pb = getPB()

    try {
      const data = await request.file()
      if (!data) return reply.status(400).send({ error: 'No file' })

      const buffer = await data.toBuffer()
      const blob = new Blob([new Uint8Array(buffer)], { type: data.mimetype })
      const formData = new FormData()
      formData.append('file', blob, data.filename)

      const updated = await pb.collection(collection).update(recordId, formData)
      return reply.send({ fileUrl: updated.fileUrl || updated.file })
    } catch (err) {
      console.error('[Upload] Error:', err)
      return reply.status(500).send({ error: 'Upload failed' })
    }
  })

  // Socket.IO authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string
    if (!token) {
      return next(new Error('Authentication required'))
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string }
      socket.data.userId = decoded.userId
      socket.data.email = decoded.email
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  // Socket.IO connection handler
  io.on('connection', (socket) => {
    const userId = socket.data.userId as string
    console.log(`[Socket] User ${userId} connected (${socket.id})`)

    // Join personal room for user-targeted events (e.g. new messages in any chat)
    socket.join(`user:${userId}`)

    // Join/leave chat rooms
    socket.on('join_chat', (data: { chatId: string }) => {
      socket.join(`chat:${data.chatId}`)
    })

    socket.on('leave_chat', (data: { chatId: string }) => {
      socket.leave(`chat:${data.chatId}`)
    })

    // Register event handlers
    registerMessageHandlers(io, socket, userId)
    registerTypingHandlers(io, socket, userId)
    registerPresenceHandlers(io, socket, userId)
  })

  // Start server
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`\n🚀 MIRA Server running on http://localhost:${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/health`)
  console.log(`   Client: ${CLIENT_URL}\n`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
