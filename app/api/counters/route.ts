import { db } from '@/lib/db'
import { counters, queue_sessions, cards } from '@/lib/db/schema'
import { asc, eq, and, desc, sql } from 'drizzle-orm'

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const all = await db.select().from(counters).orderBy(asc(counters.code))

    const result = await Promise.all(
      all.map(async (counter) => {
        const waitingCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(queue_sessions)
          .where(
            and(
              eq(queue_sessions.counter_code, counter.code),
              eq(queue_sessions.status, 'waiting'),
              eq(queue_sessions.session_date, today)
            )
          )

        const lastServed = await db
          .select({
            queue_position: queue_sessions.queue_position,
          })
          .from(queue_sessions)
          .where(
            and(
              eq(queue_sessions.counter_code, counter.code),
              sql`${queue_sessions.status} in ('done', 'serving')`,
              eq(queue_sessions.session_date, today)
            )
          )
          .orderBy(desc(queue_sessions.called_at))
          .limit(3)

        return {
          ...counter,
          waiting_count: Number(waitingCount[0]?.count ?? 0),
          last_served: lastServed.map((s) => `${counter.code}-${String(s.queue_position).padStart(3, '0')}`),
        }
      })
    )

    return Response.json(result)
  } catch (error) {
    console.error('[API] GET /api/counters error:', error)
    return Response.json(
      { error: 'Gagal mengambil daftar loket.' },
      { status: 500 }
    )
  }
}
