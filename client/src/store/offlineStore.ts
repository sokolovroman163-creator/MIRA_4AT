import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PendingMessage } from '../types'

interface OfflineState {
  queue: PendingMessage[]
  isProcessing: boolean

  addToQueue: (msg: PendingMessage) => void
  removeFromQueue: (localId: string) => void
  processQueue: (sendFn: (msg: PendingMessage) => Promise<void>) => Promise<void>
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      queue: [],
      isProcessing: false,

      addToQueue: (msg) => {
        set(state => ({ queue: [...state.queue, msg] }))
      },

      removeFromQueue: (localId) => {
        set(state => ({ queue: state.queue.filter(m => m.localId !== localId) }))
      },

      processQueue: async (sendFn) => {
        const { queue, isProcessing } = get()
        if (isProcessing || queue.length === 0) return

        set({ isProcessing: true })
        const toProcess = [...queue]

        for (const msg of toProcess) {
          try {
            await sendFn(msg)
            get().removeFromQueue(msg.localId)
          } catch (err) {
            console.error('[Offline] Failed to send queued message:', err)
            break // stop on first failure, retry later
          }
        }

        set({ isProcessing: false })
      },
    }),
    {
      name: 'mira-offline-queue',
    }
  )
)
