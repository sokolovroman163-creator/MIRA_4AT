// Custom push notification handlers — imported by Workbox-generated SW via importScripts

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'MIRA', body: event.data.text() }
  }

  const title = data.title || 'MIRA'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-72.png',
    tag: data.data?.chatId ? `mira-chat-${data.data.chatId}` : 'mira-message',
    renotify: true,
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'dismiss', title: 'Закрыть' },
    ],
  }

  event.waitUntil(
    // Check if a MIRA window has the chat open — skip notification if so
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const chatId = data.data?.chatId
      if (chatId) {
        const chatOpen = windowClients.some(
          (client) => client.focused && client.url.includes(`/chat/${chatId}`)
        )
        if (chatOpen) return // Chat is visible — don't show notification
      }

      return self.registration.showNotification(title, options)
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const chatId = event.notification.data?.chatId
  const targetUrl = chatId ? `/chat/${chatId}` : '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Try to focus an existing MIRA window
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      // No window open — open a new one
      return self.clients.openWindow(targetUrl)
    })
  )
})
