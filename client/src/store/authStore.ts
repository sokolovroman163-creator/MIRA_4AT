import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'
import { api } from '../services/api'
import { auth } from '../services/firebase'
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { createSocket, disconnectSocket } from '../services/socket'

/* Google Identity Services typings */
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void
          prompt: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean; getNotDisplayedReason: () => string }) => void) => void
          renderButton: (parent: HTMLElement, config: Record<string, unknown>) => void
        }
      }
    }
  }
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isInitialized: boolean
  isNewUser: boolean

  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  initialize: () => Promise<void>
  updateProfile: (data: Partial<Pick<User, 'displayName' | 'bio' | 'language' | 'avatarUrl'>>) => Promise<void>
  clearNewUser: () => void
}

/** Helper: wait until GIS script is loaded */
function waitForGIS(timeout = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) { resolve(); return }
    const start = Date.now()
    const iv = setInterval(() => {
      if (window.google?.accounts?.id) { clearInterval(iv); resolve(); return }
      if (Date.now() - start > timeout) { clearInterval(iv); reject(new Error('Google Identity Services script failed to load')) }
    }, 100)
  })
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isInitialized: false,
      isNewUser: false,

      loginWithGoogle: async () => {
        set({ isLoading: true })
        try {
          await waitForGIS()

          // Use Google Identity Services to get credential via One Tap / button
          const idTokenFromGoogle = await new Promise<string>((resolve, reject) => {
            let settled = false

            window.google!.accounts.id.initialize({
              client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
              callback: (response: { credential?: string; error?: string }) => {
                if (settled) return
                settled = true
                if (response.credential) {
                  console.log('[Auth] GIS credential received')
                  resolve(response.credential)
                } else {
                  reject(new Error(response.error || 'No credential received'))
                }
              },
              auto_select: false,
              cancel_on_tap_outside: false,
            })

            window.google!.accounts.id.prompt((notification) => {
              if (settled) return
              // prompt callback fires for display/skip/dismiss moments
              if (notification.isNotDisplayed()) {
                const reason = notification.getNotDisplayedReason()
                console.warn('[Auth] GIS prompt not displayed:', reason)
                // Don't reject yet — user might still interact
                if (reason === 'opt_out_or_no_session') {
                  settled = true
                  reject(new Error('Нет активной сессии Google. Войдите в Google-аккаунт в браузере.'))
                }
              }
              if (notification.isSkippedMoment()) {
                console.warn('[Auth] GIS prompt skipped by user')
                settled = true
                reject(new Error('Авторизация Google была пропущена. Попробуйте ещё раз.'))
              }
            })

            // Safety timeout — GIS can silently fail
            setTimeout(() => {
              if (!settled) {
                settled = true
                reject(new Error('Google sign-in timed out. Please try again.'))
              }
            }, 60000)
          })

          console.log('[Auth] Exchanging Google token for Firebase credential...')
          // Exchange Google ID token for Firebase credential
          const credential = GoogleAuthProvider.credential(idTokenFromGoogle)
          const result = await signInWithCredential(auth, credential)
          const firebaseIdToken = await result.user.getIdToken()

          console.log('[Auth] Calling backend /api/auth/google...')
          const response = await api.post<{ token: string; user: User; isNewUser?: boolean }>(
            '/api/auth/google',
            { idToken: firebaseIdToken }
          )

          localStorage.setItem('mira_token', response.token)
          createSocket(response.token)

          console.log('[Auth] Login successful!')
          set({ user: response.user, token: response.token, isLoading: false, isNewUser: response.isNewUser ?? false })
        } catch (err) {
          console.error('[Auth] Google login error:', err)
          set({ isLoading: false })
          throw err
        }
      },

      logout: async () => {
        const { token } = get()
        try {
          // Unregister push subscription before logout
          if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
              const registration = await navigator.serviceWorker.ready
              const subscription = await registration.pushManager.getSubscription()
              if (subscription && token) {
                await api.delete('/api/devices', {
                  token,
                  body: JSON.stringify({ pushSubscription: JSON.stringify(subscription) }),
                  headers: { 'Content-Type': 'application/json' },
                })
                await subscription.unsubscribe()
              }
            } catch {
              // Push cleanup failed — continue logout anyway
            }
          }

          if (token) {
            await api.post('/api/auth/logout', {}, { token })
          }
          await auth.signOut()
        } catch { /* ignore */ }

        // Clear app badge on logout
        if ('clearAppBadge' in navigator) {
          (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge().catch(() => {/* ignore */})
        }

        disconnectSocket()
        localStorage.removeItem('mira_token')
        set({ user: null, token: null, isNewUser: false })
      },

      initialize: async () => {
        const token = localStorage.getItem('mira_token')
        if (!token) {
          set({ isInitialized: true })
          return
        }

        try {
          const response = await api.post<{ token: string; user: User }>(
            '/api/auth/refresh',
            {},
            { token }
          )

          localStorage.setItem('mira_token', response.token)
          createSocket(response.token)

          set({ user: response.user, token: response.token, isInitialized: true })
        } catch {
          localStorage.removeItem('mira_token')
          set({ user: null, token: null, isInitialized: true })
        }
      },

      updateProfile: async (data) => {
        // Only send fields that belong in the PATCH body
        const { avatarUrl, ...patchData } = data
        let response = {}
        if (Object.keys(patchData).length > 0) {
          response = await api.patch<User>('/api/users/me', patchData)
        }
        
        set(state => ({
          user: state.user ? { ...state.user, ...response, ...(avatarUrl ? { avatarUrl } : {}) } : null,
        }))
      },

      clearNewUser: () => set({ isNewUser: false }),
    }),
    {
      name: 'mira-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)
