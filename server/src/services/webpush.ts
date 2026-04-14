import webpush from 'web-push'
import { getPB } from './pocketbase.js'

let initialized = false

export function initWebPush(): void {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@mira.local'

  if (!publicKey || !privateKey) {
    console.warn('[WebPush] VAPID keys not set — push notifications disabled')
    return
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  initialized = true
  console.log('[WebPush] Initialized successfully')
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: {
    chatId?: string
    messageId?: string
    [key: string]: unknown
  }
}

export async function sendPushToUser(
  recipientId: string,
  payload: PushPayload
): Promise<void> {
  if (!initialized) return

  const pb = getPB()

  let devices
  try {
    devices = await pb.collection('userDevices').getFullList({
      filter: `userId = "${recipientId}"`,
    })
  } catch {
    return
  }

  const payloadStr = JSON.stringify(payload)

  for (const device of devices) {
    try {
      const subscription = JSON.parse(device.pushSubscription as string)
      await webpush.sendNotification(subscription, payloadStr)
    } catch (err: unknown) {
      const error = err as { statusCode?: number }
      if (error.statusCode === 410) {
        // Subscription expired — remove device
        try {
          await pb.collection('userDevices').delete(device.id)
          console.log(`[WebPush] Removed stale device ${device.id}`)
        } catch {
          // ignore
        }
      } else {
        console.error(`[WebPush] Failed to send to device ${device.id}:`, err)
      }
    }
  }
}
