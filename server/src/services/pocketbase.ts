import PocketBase from 'pocketbase'

const POCKETBASE_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090'
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || ''
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || ''

// Admin PocketBase instance (server-side full access)
export const pb = new PocketBase(POCKETBASE_URL)

let isAuthenticated = false

export async function initPocketBase(): Promise<void> {
  try {
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
    isAuthenticated = true
    console.log('[PocketBase] Admin authenticated successfully')

    // Auto-refresh token
    setInterval(async () => {
      try {
        await pb.admins.authRefresh()
      } catch {
        try {
          await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD)
        } catch (err) {
          console.error('[PocketBase] Re-auth failed:', err)
        }
      }
    }, 14 * 60 * 1000) // refresh every 14 minutes
  } catch (err) {
    console.error('[PocketBase] Admin auth failed:', err)
    throw err
  }
}

export function getPB(): PocketBase {
  if (!isAuthenticated) {
    throw new Error('PocketBase not authenticated. Call initPocketBase() first.')
  }
  return pb
}
