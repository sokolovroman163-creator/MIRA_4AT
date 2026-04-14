import { useState, useCallback, useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastState {
  toasts: ToastMessage[]
  show: (message: string, type?: ToastType, duration?: number) => void
  hide: (id: string) => void
}

// Simple singleton store (no Zustand needed for toasts)
let listeners: Array<(toasts: ToastMessage[]) => void> = []
let currentToasts: ToastMessage[] = []

function notify() {
  listeners.forEach(l => l([...currentToasts]))
}

export const toast = {
  show(message: string, type: ToastType = 'info', duration = 3000) {
    const id = Math.random().toString(36).slice(2)
    currentToasts = [...currentToasts, { id, message, type, duration }]
    notify()
    if (duration > 0) {
      setTimeout(() => toast.hide(id), duration)
    }
    return id
  },
  success(message: string, duration = 3000) {
    return toast.show(message, 'success', duration)
  },
  error(message: string, duration = 4000) {
    return toast.show(message, 'error', duration)
  },
  info(message: string, duration = 3000) {
    return toast.show(message, 'info', duration)
  },
  hide(id: string) {
    currentToasts = currentToasts.filter(t => t.id !== id)
    notify()
  },
}

export function useToasts(): ToastState {
  const [toasts, setToasts] = useState<ToastMessage[]>([...currentToasts])

  useEffect(() => {
    listeners.push(setToasts)
    return () => {
      listeners = listeners.filter(l => l !== setToasts)
    }
  }, [])

  const show = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    toast.show(message, type, duration)
  }, [])

  const hide = useCallback((id: string) => {
    toast.hide(id)
  }, [])

  return { toasts, show, hide }
}
