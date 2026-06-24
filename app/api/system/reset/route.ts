import { db } from '@/lib/db'
import { counters, queue_sessions, daily_logs } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { getSocketIO } from '@/lib/socket-server'

export async function POST() {
  try {
    const today = new Date().toISOString().slice(0, 10)

    // 1. Archive today's stats to daily_logs before resetting
    const allCounters = await db.select().from(counters)

    for (const counter of allCounters) {
      const code = counter.code

      // Count total, served, skipped for today
      const totalResult = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(queue_sessions)
        .where(
          and(
            eq(queue_sessions.counter_code, code),
            eq(queue_sessions.session_date, today)
          )
        )

      const servedResult = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(queue_sessions)
        .where(
          and(
            eq(queue_sessions.counter_code, code),
            eq(queue_sessions.session_date, today),
            eq(queue_sessions.status, 'done')
          )
        )

      const skippedResult = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(queue_sessions)
        .where(
          and(
            eq(queue_sessions.counter_code, code),
            eq(queue_sessions.session_date, today),
            eq(queue_sessions.status, 'skipped')
          )
        )

      // Average wait time (activated_at → called_at difference for done/skipped)
      const waitResult = await db
        .select({
          avg: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${queue_sessions.called_at} - ${queue_sessions.activated_at}))), 0)`,
        })
        .from(queue_sessions)
        .where(
          and(
            eq(queue_sessions.counter_code, code),
            eq(queue_sessions.session_date, today),
            eq(queue_sessions.status, 'done')
          )
        )

      // Average service time (called_at → done_at difference for done)
      const svcResult = await db
        .select({
          avg: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${queue_sessions.done_at} - ${queue_sessions.called_at}))), 0)`,
        })
        .from(queue_sessions)
        .where(
          and(
            eq(queue_sessions.counter_code, code),
            eq(queue_sessions.session_date, today),
            eq(queue_sessions.status, 'done')
          )
        )

      // Peak hour from done sessions
      const peakResult = await db
        .select({
          hour: sql<number>`EXTRACT(HOUR FROM ${queue_sessions.done_at})`,
        })
        .from(queue_sessions)
        .where(
          and(
            eq(queue_sessions.counter_code, code),
            eq(queue_sessions.session_date, today),
            eq(queue_sessions.status, 'done')
          )
        )

      // Simple peak hour detection
      const hourCounts: Record<number, number> = {}
      for (const row of peakResult) {
        const h = row.hour
        hourCounts[h] = (hourCounts[h] || 0) + 1
      }
      let peakHour: number | null = null
      let maxCount = 0
      for (const [h, c] of Object.entries(hourCounts)) {
        if (c > maxCount) {
          maxCount = c
          peakHour = parseInt(h, 10)
        }
      }

      // Upsert daily_log
      const existingLog = await db
        .select()
        .from(daily_logs)
        .where(
          and(
            eq(daily_logs.date, today),
            eq(daily_logs.counter_code, code)
          )
        )
        .limit(1)

      const logData = {
        userId: counter.userId,
        date: today,
        counter_code: code,
        total_visitors: totalResult[0]?.count ?? 0,
        served: servedResult[0]?.count ?? 0,
        skipped: skippedResult[0]?.count ?? 0,
        average_wait_seconds: Math.round(waitResult[0]?.avg ?? 0),
        average_service_seconds: Math.round(svcResult[0]?.avg ?? 0),
        peak_hour: peakHour,
      }

      if (existingLog.length) {
        await db
          .update(daily_logs)
          .set(logData)
          .where(eq(daily_logs.id, existingLog[0].id))
      } else {
        await db.insert(daily_logs).values(logData)
      }
    }

    // 2. Reset counter current_numbers to 0
    await db.update(counters).set({ current_number: 0, updatedAt: new Date() })

    // 3. Mark any remaining non-terminal sessions as expired
    await db
      .update(queue_sessions)
      .set({ status: 'expired' })
      .where(
        and(
          eq(queue_sessions.session_date, today),
          eq(queue_sessions.status, 'waiting')
        )
      )

    // 4. Emit reset event to all rooms
    const io = getSocketIO()
    if (io) {
      for (const counter of allCounters) {
        io.to(`counter:${counter.code}`).emit('queue_update', {
          counter_code: counter.code,
          action: 'reset',
        })
      }
      io.emit('daily_reset', {
        date: today,
        message: 'Reset harian selesai.',
      })
    }

    return Response.json({
      message: 'Reset harian berhasil.',
      date: today,
      counters_reset: allCounters.length,
    })
  } catch (error) {
    console.error('[API] POST /api/system/reset error:', error)
    return Response.json(
      { error: 'Gagal melakukan reset harian.' },
      { status: 500 }
    )
  }
}
