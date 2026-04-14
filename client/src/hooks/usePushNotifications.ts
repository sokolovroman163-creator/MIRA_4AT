import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../services/api'

type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported'

interface PushState {
  permission: PushPermission
  isSubscribed: boolean
  isLoading: boolean
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

/**
 * Convert a base64 VAPID key to Uint8Array for pushManager.subscribe()
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) {
    arr[i] = raw.charCodeAt(i)
  }
  return arr as Uint8Array<ArrayBuffer>
}

export function usePushNotifications(): PushState & {
  requestPermission: () => Promise<boolean>
  subscribe: () => Promise<boolean>
  unsubscribe: () => Promise<void>
} {
  const [permission, setPermission] = useState<PushPermission>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    return Notification.permission as PushPermission
  })
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const checkedRef = useRef(false)

  // Check existing subscription on mount
  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true

    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC_KEY) {
      setPermission('unsupported')
      return
    }

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setIsSubscribed(!!sub)
    }).catch(() => {
      // ignore
    })
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      setPermission('unsupported')
      return false
    }

    if (Notification.permission === 'granted') {
      setPermission('granted')
      return true
    }

    if (Notification.permission === 'denied') {
      setPermission('denied')
      return false
    }

    const result = await Notification.requestPermission()
    setPermission(result as PushPermission)
    return result === 'granted'
  }, [])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!VAPID_PUBLIC_KEY || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false
    }

    setIsLoading(true)
    try {
      const granted = await requestPermission()
      if (!granted) {
        setIsLoading(false)
        return false
      }

      const registration = await navigator.serviceWorker.ready
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription()
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }

      // Register subscription on the backend
      await api.post('/api/devices', {
        pushSubscription: JSON.stringify(subscription),
        userAgent: navigator.userAgent,
      })

      setIsSubscribed(true)
      setIsLoading(false)
      return true
    } catch (err) {
      console.error('[Push] Subscribe error:', err)
      setIsLoading(false)
      return false
    }
  }, [requestPermission])

  const unsubscribe = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Unregister from backend
        await api.delete('/api/devices', {
          body: JSON.stringify({ pushSubscription: JSON.stringify(subscription) }),
          headers: { 'Content-Type': 'application/json' },
        })

        await subscription.unsubscribe()
      }

      setIsSubscribed(false)
    } catch (err) {
      console.error('[Push] Unsubscribe error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { permission, isSubscribed, isLoading, requestPermission, subscribe, unsubscribe }
}
