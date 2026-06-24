// Service Worker for Pengadilan Agama Queue System

const CACHE_NAME = 'queue-system-v1'
const urlsToCache = [
  '/',
  '/satpam',
  '/counter',
  '/visitor',
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((error) => {
        console.log('[SW] Cache addAll error:', error)
        // Don't fail install if some URLs can't be cached
      })
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip API calls and socket connections
  if (url.pathname.startsWith('/api/') || url.pathname.includes('socket')) {
    return
  }

  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response
      }

      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response
        }

        const responseToCache = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache)
        })

        return response
      })
    }).catch(() => {
      // Return offline page if available
      return caches.match('/')
    })
  )
})

// Push event - handle incoming push messages
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event)
  
  let notificationData = {
    title: 'Queue System Notification',
    body: 'You have a new notification',
    icon: '/icon.svg',
    badge: '/icon.svg',
  }

  if (event.data) {
    try {
      notificationData = event.data.json()
    } catch (e) {
      notificationData.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag)
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// Background sync event (optional - for offline queue updates)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)
  
  if (event.tag === 'sync-queue-updates') {
    event.waitUntil(
      // Send any pending updates when connection is restored
      fetch('/api/queue/sync', { method: 'POST' })
        .catch((error) => console.log('[SW] Sync error:', error))
    )
  }
})
