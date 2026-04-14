import { useState, useEffect, useCallback } from 'react'

interface PWAInstallState {
  canInstall: boolean
  isInstalled: boolean
  isIOS: boolean
  isInStandalone: boolean
  promptInstall: () => Promise<void>
  dismissBanner: () => void
  showIOSGuide: boolean
}

const DISMISS_KEY = 'mira_install_dismissed'
const DISMISS_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 days

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let deferredPrompt: any = null

export function usePWAInstall(): PWAInstallState {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream
  const isInStandalone = window.matchMedia('(display-mode: standalone)').matches

  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(isInStandalone)

  const isDismissed = () => {
    const ts = localStorage.getItem(DISMISS_KEY)
    if (!ts) return false
    return Date.now() - parseInt(ts) < DISMISS_DURATION
  }

  useEffect(() => {
    // Already installed — nothing to listen for
    if (isInStandalone) return

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt = e
      if (!isDismissed()) {
        setCanInstall(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setCanInstall(false)
      deferredPrompt = null
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [isInStandalone])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setCanInstall(false)
    }
    deferredPrompt = null
  }, [])

  const dismissBanner = useCallback(() => {
    setCanInstall(false)
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
  }, [])

  // iOS: show guide if on iOS Safari and not installed
  const showIOSGuide = isIOS && !isInStandalone && !isDismissed()

  return {
    canInstall,
    isInstalled,
    isIOS,
    isInStandalone,
    promptInstall,
    dismissBanner,
    showIOSGuide,
  }
}
