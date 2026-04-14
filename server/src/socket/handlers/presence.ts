import type { Server, Socket } from 'socket.io'
import { getPB } from '../../services/pocketbase.js'

export function registerPresenceHandlers(io: Server, socket: Socket, userId: string): void {
  // Mark user online on connect
  const setOnline = async () => {
    const pb = getPB()
    try {
      await pb.collection('users').update(userId, {
        isOnline: true,
        lastSeen: new Date().toISOString(),
      })
      io.emit('user_online', { userId })
    } catch { /* ignore */ }
  }

  setOnline()

  // Handle update_presence (heartbeat every 30s)
  socket.on('update_presence', async () => {
    const pb = getPB()
    try {
      await pb.collection('users').update(userId, {
        isOnline: true,
        lastSeen: new Date().toISOString(),
      })
    } catch { /* ignore */ }
  })

  // On disconnect — mark offline
  socket.on('disconnect', async () => {
    const pb = getPB()
    try {
      // Check if user has other active connections
      const sockets = await io.fetchSockets()
      const otherConnections = sockets.filter(s => s.data.userId === userId && s.id !== socket.id)

      if (otherConnections.length === 0) {
        const lastSeen = new Date().toISOString()
        await pb.collection('users').update(userId, {
          isOnline: false,
          lastSeen,
        })
        io.emit('user_offline', { userId, lastSeen })
      }
    } catch { /* ignore */ }
  })
}
