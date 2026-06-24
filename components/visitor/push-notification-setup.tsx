'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  notifyQueueUpdated,
} from '@/lib/push-notifications'
import { subscribeToPushNotifications as subscribeDb } from '@/app/actions/queue'
import { toast } from 'sonner'

interface PushNotificationSetupProps {
  cardId?: string
}

export default function PushNotificationSetup({
  cardId,
}: PushNotificationSetupProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check browser support
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window

    setIsSupported(supported)

    if (supported) {
      checkSubscriptionStatus()
    }
  }, [])

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error('[v0] Error checking subscription status:', error)
    }
  }

  const handleSubscribe = async () => {
    setIsLoading(true)
    try {
      // Request permission first
      const permissionGranted = await requestNotificationPermission()

      if (!permissionGranted) {
        toast.error('Notification permission denied')
        return
      }

      // Register service worker
      const registration = await registerServiceWorker()

      if (!registration) {
        toast.error('Service worker registration failed')
        return
      }

      // Subscribe to push notifications
      const subscription = await subscribeToPushNotifications()

      if (!subscription) {
        toast.error('Failed to subscribe to push notifications')
        return
      }

      // Save subscription to database if cardId is available
      if (cardId) {
        try {
          await subscribeDb(parseInt(cardId), subscription as any)
        } catch (error) {
          console.error('[v0] Error saving subscription:', error)
        }
      }

      setIsSubscribed(true)
      toast.success('Push notifications enabled')
      notifyQueueUpdated()
    } catch (error) {
      console.error('[v0] Error subscribing to notifications:', error)
      toast.error('Error enabling push notifications')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    setIsLoading(true)
    try {
      await unsubscribeFromPushNotifications()
      setIsSubscribed(false)
      toast.success('Push notifications disabled')
    } catch (error) {
      console.error('[v0] Error unsubscribing:', error)
      toast.error('Error disabling push notifications')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
        <p className="text-xs text-yellow-700">
          Push notifications are not supported in your browser
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-blue-700">
          {isSubscribed
            ? 'Push notifications are enabled'
            : 'Get notified when it is your turn'}
        </p>
        <Button
          onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
          disabled={isLoading}
          size="sm"
          variant={isSubscribed ? 'outline' : 'default'}
        >
          {isLoading ? 'Loading...' : isSubscribed ? 'Disable' : 'Enable'}
        </Button>
      </div>
    </div>
  )
}
