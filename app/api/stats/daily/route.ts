import { db } from '@/lib/db'
import { counters, queue_sessions, daily_logs } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const targetDate = dateParam || new Date().toISOString().slice(0, 10)

    // Get aggregated logs for that date
    const logs = await db
      .select()
      .from(daily_logs)
      .where(eq(daily_logs.date, targetDate))

    // If no logs yet, compute live from queue_sessions
    const liveTotalResult = await db
      .select({
        total: sql<number>`COUNT(*)`,
      })
      .from(queue_sessions)
      .where(eq(queue_sessions.session_date, targetDate))

    const liveServedResult = await db
      .select({
        served: sql<number>`COUNT(*)`,
      })
      .from(queue_sessions)
      .where(
        and(
          eq(queue_sessions.session_date, targetDate),
          eq(queue_sessions.status, 'done')
        )
      )

    const liveSkippedResult = await db
      .select({
        skipped: sql<number>`COUNT(*)`,
      })
      .from(queue_sessions)
      .where(
        and(
          eq(queue_sessions.session_date, targetDate),
          eq(queue_sessions.status, 'skipped')
        )
      )

    const liveWaitingResult = await db
      .select({
        waiting: sql<number>`COUNT(*)`,
      })
      .from(queue_sessions)
      .where(
        and(
          eq(queue_sessions.session_date, targetDate),
          eq(queue_sessions.status, 'waiting')
        )
      )

    const allCounters = await db.select().from(counters)

    return Response.json({
      date: targetDate,
      logs,
      live: {
        total: liveTotalResult[0]?.total ?? 0,
        served: liveServedResult[0]?.served ?? 0,
        skipped: liveSkippedResult[0]?.skipped ?? 0,
        waiting: liveWaitingResult[0]?.waiting ?? 0,
      },
      counters: allCounters.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        is_open: c.is_open,
        current_number: c.current_number,
      })),
    })
  } catch (error) {
    console.error('[API] GET /api/stats/daily error:', error)
    return Response.json(
      { error: 'Gagal mengambil statistik harian.' },
      { status: 500 }
    )
  }
}
