import { db } from '@/lib/db'
import { counters, queue_sessions, daily_logs } from '@/lib/db/schema'
import { eq, and, sql, asc } from 'drizzle-orm'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const counterId = parseInt(id, 10)

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const targetDate = dateParam || new Date().toISOString().slice(0, 10)

    // Verify counter exists
    const counter = await db
      .select()
      .from(counters)
      .where(eq(counters.id, counterId))
      .limit(1)

    if (!counter.length) {
      return Response.json(
        { error: 'Loket tidak ditemukan.' },
        { status: 404 }
      )
    }

    const code = counter[0].code

    // Get the daily log for this counter and date
    const log = await db
      .select()
      .from(daily_logs)
      .where(
        and(
          eq(daily_logs.date, targetDate),
          eq(daily_logs.counter_code, code)
        )
      )
      .limit(1)

    // Live stats from queue_sessions
    const totalResult = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(queue_sessions)
      .where(
        and(
          eq(queue_sessions.counter_code, code),
          eq(queue_sessions.session_date, targetDate)
        )
      )

    const servedResult = await db
      .select({ served: sql<number>`COUNT(*)` })
      .from(queue_sessions)
      .where(
        and(
          eq(queue_sessions.counter_code, code),
          eq(queue_sessions.session_date, targetDate),
          eq(queue_sessions.status, 'done')
        )
      )

    const skippedResult = await db
      .select({ skipped: sql<number>`COUNT(*)` })
      .from(queue_sessions)
      .where(
        and(
          eq(queue_sessions.counter_code, code),
          eq(queue_sessions.session_date, targetDate),
          eq(queue_sessions.status, 'skipped')
        )
      )

    const waitingResult = await db
      .select({ waiting: sql<number>`COUNT(*)` })
      .from(queue_sessions)
      .where(
        and(
          eq(queue_sessions.counter_code, code),
          eq(queue_sessions.session_date, targetDate),
          eq(queue_sessions.status, 'waiting')
        )
      )

    // Average wait time for done sessions
    const waitAvg = await db
      .select({
        avg: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${queue_sessions.called_at} - ${queue_sessions.activated_at}))), 0)`,
      })
      .from(queue_sessions)
      .where(
        and(
          eq(queue_sessions.counter_code, code),
          eq(queue_sessions.session_date, targetDate),
          eq(queue_sessions.status, 'done')
        )
      )

    // Average service time for done sessions
    const svcAvg = await db
      .select({
        avg: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${queue_sessions.done_at} - ${queue_sessions.called_at}))), 0)`,
      })
      .from(queue_sessions)
      .where(
        and(
          eq(queue_sessions.counter_code, code),
          eq(queue_sessions.session_date, targetDate),
          eq(queue_sessions.status, 'done')
        )
      )

    // Sessions list for this counter
    const sessions = await db
      .select({
        id: queue_sessions.id,
        queue_position: queue_sessions.queue_position,
        status: queue_sessions.status,
        activated_at: queue_sessions.activated_at,
        called_at: queue_sessions.called_at,
        done_at: queue_sessions.done_at,
      })
      .from(queue_sessions)
      .where(
        and(
          eq(queue_sessions.counter_code, code),
          eq(queue_sessions.session_date, targetDate)
        )
      )
      .orderBy(asc(queue_sessions.queue_position))

    return Response.json({
      counter: counter[0],
      date: targetDate,
      log: log[0] || null,
      live: {
        total: totalResult[0]?.total ?? 0,
        served: servedResult[0]?.served ?? 0,
        skipped: skippedResult[0]?.skipped ?? 0,
        waiting: waitingResult[0]?.waiting ?? 0,
        average_wait_seconds: Math.round(waitAvg[0]?.avg ?? 0),
        average_service_seconds: Math.round(svcAvg[0]?.avg ?? 0),
      },
      sessions,
    })
  } catch (error) {
    console.error('[API] GET /api/stats/counter/[id] error:', error)
    return Response.json(
      { error: 'Gagal mengambil statistik loket.' },
      { status: 500 }
    )
  }
}
