import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAuthStore } from './store/authStore'
import { useSocket } from './hooks/useSocket'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import { useOfflineStore } from './store/offlineStore'
import { usePushNotifications } from './hooks/usePushNotifications'
import { useChatStore } from './store/chatStore'
import { getSocket } from './services/socket'
import LoginPage from './pages/LoginPage'
import OnboardingScreen from './components/auth/OnboardingScreen'
import { useIsMobile } from './hooks/useIsMobile'
import DesktopLayout from './components/layout/DesktopLayout'
import MobileLayout from './components/layout/MobileLayout'
import ToastContainer from './components/ui/ToastContainer'
import NetworkBanner from './components/ui/NetworkBanner'
import InstallBanner from './components/pwa/InstallBanner'
import IOSInstallGuide from './components/pwa/IOSInstallGuide'
import type { PendingMessage } from './types'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isInitialized, isNewUser, clearNewUser } = useAuthStore()

  if (!isInitialized) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: '100dvh', background: 'var(--bg-primary)' }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Show onboarding for new users or users without a display name
  const needsOnboarding = isNewUser || !user.displayName || user.displayName.trim().length < 2

  return (
    <>
      {children}
      <AnimatePresence>
        {needsOnboarding && (
          <OnboardingScreen onComplete={clearNewUser} />
        )}
      </AnimatePresence>
    </>
  )
}

function AppContent() {
  const { isOnline } = useNetworkStatus()
  const { queue, processQueue } = useOfflineStore()
  const { subscribe, permission } = usePushNotifications()
  const chats = useChatStore(s => s.chats)

  // Wire up socket event listeners
  useSocket()

  // Auto-subscribe to push notifications after auth (if permission default or granted)
  useEffect(() => {
    if (permission === 'unsupported' || permission === 'denied') return

    // Small delay to let SW register fully
    const timer = setTimeout(() => {
      subscribe()
    }, 2000)
    return () => clearTimeout(timer)
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Badge management — set/clear app badge based on total unread count
  useEffect(() => {
    const totalUnread = chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0)

    if ('setAppBadge' in navigator) {
      if (totalUnread > 0) {
        navigator.setAppBadge(totalUnread).catch(() => {/* ignore */})
      } else {
        navigator.clearAppBadge().catch(() => {/* ignore */})
      }
    }
  }, [chats])

  // Presence heartbeat — ping server every 30s to stay "online"
  useEffect(() => {
    const interval = setInterval(() => {
      const socket = getSocket()
      if (socket?.connected) {
        socket.emit('update_presence')
      }
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Process offline queue when connection is restored
  useEffect(() => {
    if (!isOnline || queue.length === 0) return

    const socket = getSocket()
    if (!socket) return

    processQueue(async (msg: PendingMessage) => {
      return new Promise((resolve, reject) => {
        socket.emit(
          'send_message',
          {
            chatId: msg.chatId,
            content: msg.content,
            type: msg.type,
            replyToId: msg.replyToId,
            localId: msg.localId,
          },
          (ack: { error?: string }) => {
            if (ack?.error) reject(new Error(ack.error))
            else resolve()
          }
        )
      })
    })
  }, [isOnline, queue.length, processQueue])

  return null
}

function AppRoutes() {
  const isMobile = useIsMobile()

  return (
    <div className="flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
      {/* Network status banner — top of screen */}
      <NetworkBanner />

      <div className="flex-1 overflow-hidden relative">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <AppContent />
                {isMobile ? <MobileLayout /> : <DesktopLayout />}
              </RequireAuth>
            }
          />
        </Routes>
      </div>

      {/* PWA install prompts */}
      <InstallBanner />
      <IOSInstallGuide />

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  )
}

export default function App() {
  const initialize = useAuthStore(s => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  // Apply theme on startup and when system preference changes
  useEffect(() => {
    const theme = localStorage.getItem('mira_theme') || 'system'
    applyTheme(theme)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (localStorage.getItem('mira_theme') === 'system') {
        applyTheme('system')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

function applyTheme(theme: string) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark')
  } else if (theme === 'light') {
    root.removeAttribute('data-theme')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) root.setAttribute('data-theme', 'dark')
    else root.removeAttribute('data-theme')
  }
}
