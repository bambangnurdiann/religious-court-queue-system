'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getTodaySession, getVisitorQueuePosition } from '@/app/actions/queue'
import {
  initializeSocket,
  onQueuePositionUpdate,
  offQueuePositionUpdate,
} from '@/lib/socket'
import PushNotificationSetup from './push-notification-setup'
import { toast } from 'sonner'

export default function VisitorQueue() {
  const [session, setSession] = useState<any>(null)
  const [queuePosition, setQueuePosition] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [cardId, setCardId] = useState<string>('')
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!cardId) return

    // Initialize Socket.io
    try {
      initializeSocket()

      // Listen for real-time position updates from Socket.io
      onQueuePositionUpdate((data: any) => {
        if (data.cardId === parseInt(cardId)) {
          setQueuePosition({
            entry: data.entry,
            aheadCount: data.aheadCount,
          })
        }
      })
    } catch (error) {
      console.error('[v0] Socket initialization error:', error)
    }

    const fetchPosition = async () => {
      try {
        const sessionData = await getTodaySession()
        if (sessionData.length > 0) {
          setSession(sessionData[0])
          const position = await getVisitorQueuePosition(
            parseInt(cardId),
            sessionData[0].id
          )
          setQueuePosition(position)
        }
      } catch (error) {
        console.error('Error fetching position:', error)
      }
    }

    // Initial fetch
    fetchPosition()

    // Poll every 5 seconds as fallback
    const interval = setInterval(fetchPosition, 5000)
    setPollInterval(interval)

    return () => {
      if (interval) clearInterval(interval)
      offQueuePositionUpdate()
    }
  }, [cardId])

  const loadData = async () => {
    setIsLoading(false)
  }

  const handleCheckPosition = async () => {
    if (!cardId.trim()) {
      toast.error('Please enter your card ID')
      return
    }

    setIsLoading(true)
    try {
      const sessionData = await getTodaySession()
      if (sessionData.length === 0) {
        toast.info('Queue not active today')
        return
      }

      setSession(sessionData[0])
      const position = await getVisitorQueuePosition(
        parseInt(cardId),
        sessionData[0].id
      )

      if (!position) {
        toast.warning('Card not found in queue')
        setCardId('')
        return
      }

      setQueuePosition(position)
    } catch (error) {
      toast.error('Error checking position')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Push Notifications Setup */}
      <PushNotificationSetup cardId={cardId} />

      {/* Card Input */}
      <Card>
        <CardHeader>
          <CardTitle>Enter Your Card ID</CardTitle>
          <CardDescription>Enter your queue card number to check your position</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <input
              type="text"
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
              placeholder="Enter card number..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleCheckPosition}
              disabled={isLoading}
              className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? 'Checking...' : 'Check Position'}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Queue Status Display */}
      {queuePosition && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900">Your Queue Position</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Position */}
            <div className="rounded-lg bg-white p-6 text-center">
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Visitors ahead of you
              </p>
              <p className="text-6xl font-bold font-mono text-green-600">
                {queuePosition.aheadCount}
              </p>
            </div>

            {/* Queue Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-white p-4">
                <p className="text-xs font-medium text-muted-foreground">Your Queue Number</p>
                <p className="mt-1 text-2xl font-bold font-mono">
                  {queuePosition.entry.queueNumber}
                </p>
              </div>
              <div className="rounded-lg bg-white p-4">
                <p className="text-xs font-medium text-muted-foreground">Counter</p>
                <p className="mt-1 text-2xl font-bold">
                  Counter {queuePosition.entry.counterId}
                </p>
              </div>
              <div className="rounded-lg bg-white p-4">
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <p className="mt-1 text-sm font-semibold capitalize">
                  <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-blue-700">
                    {queuePosition.entry.status}
                  </span>
                </p>
              </div>
              <div className="rounded-lg bg-white p-4">
                <p className="text-xs font-medium text-muted-foreground">Arrival Time</p>
                <p className="mt-1 text-sm font-semibold">
                  {new Date(queuePosition.entry.arrivalTime).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-lg border border-green-200 bg-white p-4">
              <p className="text-xs font-medium text-muted-foreground">💡 Tip</p>
              <p className="mt-2 text-sm text-green-900">
                {queuePosition.aheadCount === 0
                  ? 'You are next! Please go to your counter.'
                  : queuePosition.aheadCount === 1
                    ? 'Just one person ahead. Get ready to go to your counter soon.'
                    : `There are ${queuePosition.aheadCount} people ahead of you. Please wait for your turn.`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
