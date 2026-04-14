import type { Server, Socket } from 'socket.io'
import { getPB } from '../../services/pocketbase.js'

// Track typing timeouts per user per chat
const typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

export function registerTypingHandlers(io: Server, socket: Socket, userId: string): void {
  socket.on('typing_start', (data: { chatId: string }) => {
    socket.to(`chat:${data.chatId}`).emit('user_typing', {
      chatId: data.chatId,
      userId,
    })

    // Auto-stop after 3 seconds
    const key = `${userId}:${data.chatId}`
    if (typingTimeouts.has(key)) {
      clearTimeout(typingTimeouts.get(key)!)
    }
    typingTimeouts.set(
      key,
      setTimeout(() => {
        socket.to(`chat:${data.chatId}`).emit('user_stopped_typing', {
          chatId: data.chatId,
          userId,
        })
        typingTimeouts.delete(key)
      }, 3000)
    )
  })

  socket.on('typing_stop', (data: { chatId: string }) => {
    const key = `${userId}:${data.chatId}`
    if (typingTimeouts.has(key)) {
      clearTimeout(typingTimeouts.get(key)!)
      typingTimeouts.delete(key)
    }
    socket.to(`chat:${data.chatId}`).emit('user_stopped_typing', {
      chatId: data.chatId,
      userId,
    })
  })
}
