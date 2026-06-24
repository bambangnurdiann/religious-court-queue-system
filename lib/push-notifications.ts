// Web Push Notifications helper functions

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[v0] Service workers not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })
    console.log('[v0] Service worker registered:', registration)
    return registration
  } catch (error) {
    console.error('[v0] Service worker registration failed:', error)
    return null
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('[v0] Notifications not supported')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission === 'denied') {
    console.warn('[v0] Notifications denied by user')
    return false
  }

  try {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  } catch (error) {
    console.error('[v0] Error requesting notification permission:', error)
    return false
  }
}

export async function subscribeToPushNotifications() {
  try {
    // Check if browser supports push notifications
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[v0] Push notifications not supported')
      return null
    }

    // Register service worker first
    const registration = await navigator.serviceWorker.ready

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // Subscribe to push notifications
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // Note: In production, you would include the public key for VAPID
        // applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
    }

    console.log('[v0] Push notification subscription:', subscription)
    return subscription
  } catch (error) {
    console.error('[v0] Error subscribing to push notifications:', error)
    return null
  }
}

export async function unsubscribeFromPushNotifications() {
  try {
    if (!('serviceWorker' in navigator)) {
      return
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      console.log('[v0] Unsubscribed from push notifications')
    }
  } catch (error) {
    console.error('[v0] Error unsubscribing from push notifications:', error)
  }
}

export function sendTestNotification(title: string, options?: NotificationOptions) {
  if ('serviceWorker' in navigator && 'Notification' in window) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        icon: '/icon.svg',
        badge: '/icon.svg',
        ...options,
      })
    })
  }
}

// Queue-related notifications
export async function notifyQueuePosition(
  queueNumber: string,
  positionAhead: number
) {
  const message = positionAhead === 0
    ? `It's your turn! Proceed to counter for ${queueNumber}`
    : `You are ${positionAhead} visitor${positionAhead > 1 ? 's' : ''} away (${queueNumber})`

  sendTestNotification('Queue Update', {
    body: message,
    tag: 'queue-position',
    requireInteraction: positionAhead === 0,
  })
}

export async function notifyCounterCalled(
  queueNumber: string,
  counterNumber: number
) {
  sendTestNotification('Your Turn!', {
    body: `Queue ${queueNumber} - Please proceed to Counter ${counterNumber}`,
    tag: 'queue-called',
    requireInteraction: true,
  })
}

export async function notifyQueueUpdated() {
  sendTestNotification('Queue Updated', {
    body: 'The queue has been updated. Check your position.',
    tag: 'queue-updated',
  })
}
