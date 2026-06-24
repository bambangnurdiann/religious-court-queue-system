'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  counters,
  queueCards,
  dailyQueueSessions,
  queueEntries,
  visitorSubscriptions,
  queueStatistics,
} from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

// Counter Management
export async function createCounter(data: {
  counterNumber: number
  name: string
  colorClass: string
}) {
  const userId = await getUserId()
  const result = await db
    .insert(counters)
    .values({
      userId,
      counterNumber: data.counterNumber,
      name: data.name,
      colorClass: data.colorClass,
    })
    .returning()
  revalidatePath('/counter')
  return result[0]
}

export async function getCounters() {
  const userId = await getUserId()
  return db.select().from(counters).where(eq(counters.userId, userId))
}

export async function updateCounterPosition(
  counterId: number,
  position: number
) {
  const userId = await getUserId()
  const result = await db
    .update(counters)
    .set({ currentQueuePosition: position, updatedAt: new Date() })
    .where(and(eq(counters.id, counterId), eq(counters.userId, userId)))
    .returning()
  revalidatePath('/counter')
  return result[0]
}

// Queue Card Management
export async function createQueueCard(data: { qrCode: string; cardNumber: string }) {
  const userId = await getUserId()
  const result = await db
    .insert(queueCards)
    .values({
      userId,
      qrCode: data.qrCode,
      cardNumber: data.cardNumber,
    })
    .returning()
  revalidatePath('/satpam')
  return result[0]
}

export async function activateQueueCard(cardId: number) {
  const userId = await getUserId()
  const result = await db
    .update(queueCards)
    .set({
      isActivated: true,
      activatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(queueCards.id, cardId), eq(queueCards.userId, userId)))
    .returning()
  revalidatePath('/satpam')
  return result[0]
}

export async function getQueueCardByQR(qrCode: string) {
  const userId = await getUserId()
  return db
    .select()
    .from(queueCards)
    .where(and(eq(queueCards.qrCode, qrCode), eq(queueCards.userId, userId)))
    .limit(1)
}

// Daily Queue Session Management
export async function createDailySession() {
  const userId = await getUserId()
  const result = await db
    .insert(dailyQueueSessions)
    .values({
      userId,
      sessionDate: new Date(),
    })
    .returning()
  revalidatePath('/counter')
  return result[0]
}

export async function getTodaySession() {
  const userId = await getUserId()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return db
    .select()
    .from(dailyQueueSessions)
    .where(
      and(
        eq(dailyQueueSessions.userId, userId),
        eq(dailyQueueSessions.isActive, true)
      )
    )
    .orderBy(desc(dailyQueueSessions.createdAt))
    .limit(1)
}

// Queue Entry Management
export async function addQueueEntry(data: {
  sessionId: number
  counterId: number
  queueCardId: number
  queueNumber: string
  visitorName?: string
  positionInQueue: number
}) {
  const userId = await getUserId()
  const result = await db
    .insert(queueEntries)
    .values({
      userId,
      sessionId: data.sessionId,
      counterId: data.counterId,
      queueCardId: data.queueCardId,
      queueNumber: data.queueNumber,
      visitorName: data.visitorName,
      status: 'waiting',
      positionInQueue: data.positionInQueue,
    })
    .returning()
  revalidatePath('/visitor')
  revalidatePath('/counter')
  return result[0]
}

export async function getQueueEntriesBySession(sessionId: number) {
  const userId = await getUserId()
  return db
    .select()
    .from(queueEntries)
    .where(
      and(
        eq(queueEntries.userId, userId),
        eq(queueEntries.sessionId, sessionId)
      )
    )
    .orderBy(queueEntries.positionInQueue)
}

export async function getQueueEntriesByCounter(sessionId: number, counterId: number) {
  const userId = await getUserId()
  return db
    .select()
    .from(queueEntries)
    .where(
      and(
        eq(queueEntries.userId, userId),
        eq(queueEntries.sessionId, sessionId),
        eq(queueEntries.counterId, counterId)
      )
    )
    .orderBy(queueEntries.positionInQueue)
}

export async function updateQueueEntryStatus(
  entryId: number,
  status: 'waiting' | 'in_service' | 'completed' | 'skipped'
) {
  const userId = await getUserId()
  const updateData: any = {
    status,
    updatedAt: new Date(),
  }

  if (status === 'in_service') {
    updateData.callTime = new Date()
  } else if (status === 'completed' || status === 'skipped') {
    updateData.completionTime = new Date()
  }

  const result = await db
    .update(queueEntries)
    .set(updateData)
    .where(and(eq(queueEntries.id, entryId), eq(queueEntries.userId, userId)))
    .returning()

  revalidatePath('/visitor')
  revalidatePath('/counter')
  return result[0]
}

export async function getNextQueueEntry(counterId: number, sessionId: number) {
  const userId = await getUserId()
  return db
    .select()
    .from(queueEntries)
    .where(
      and(
        eq(queueEntries.userId, userId),
        eq(queueEntries.counterId, counterId),
        eq(queueEntries.sessionId, sessionId),
        eq(queueEntries.status, 'waiting')
      )
    )
    .orderBy(queueEntries.positionInQueue)
    .limit(1)
}

export async function getVisitorQueuePosition(cardId: number, sessionId: number) {
  const userId = await getUserId()
  const entry = await db
    .select()
    .from(queueEntries)
    .where(
      and(
        eq(queueEntries.userId, userId),
        eq(queueEntries.queueCardId, cardId),
        eq(queueEntries.sessionId, sessionId)
      )
    )
    .limit(1)

  if (!entry.length) return null

  const ahead = await db
    .select()
    .from(queueEntries)
    .where(
      and(
        eq(queueEntries.userId, userId),
        eq(queueEntries.sessionId, sessionId),
        eq(queueEntries.counterId, entry[0].counterId),
        eq(queueEntries.status, 'waiting'),
        (e) => e.positionInQueue < entry[0].positionInQueue
      )
    )

  return {
    entry: entry[0],
    aheadCount: ahead.length,
  }
}

// Push Notification Subscriptions
export async function subscribeToPushNotifications(
  cardId: number,
  subscription: PushSubscription
) {
  const userId = await getUserId()
  const result = await db
    .insert(visitorSubscriptions)
    .values({
      userId,
      queueCardId: cardId,
      pushSubscription: JSON.stringify(subscription),
    })
    .returning()
  return result[0]
}

// Statistics
export async function getCounterStats(sessionId: number, counterId: number) {
  const userId = await getUserId()
  return db
    .select()
    .from(queueStatistics)
    .where(
      and(
        eq(queueStatistics.userId, userId),
        eq(queueStatistics.sessionId, sessionId),
        eq(queueStatistics.counterId, counterId)
      )
    )
    .limit(1)
}

export async function updateCounterStats(
  sessionId: number,
  counterId: number,
  data: {
    totalVisitors?: number
    completedVisitors?: number
    averageWaitTime?: number
    averageServiceTime?: number
  }
) {
  const userId = await getUserId()

  const existing = await getCounterStats(sessionId, counterId)

  if (existing.length > 0) {
    const result = await db
      .update(queueStatistics)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(queueStatistics.userId, userId),
          eq(queueStatistics.sessionId, sessionId),
          eq(queueStatistics.counterId, counterId)
        )
      )
      .returning()
    return result[0]
  } else {
    const result = await db
      .insert(queueStatistics)
      .values({
        userId,
        sessionId,
        counterId,
        ...data,
      })
      .returning()
    return result[0]
  }
}
