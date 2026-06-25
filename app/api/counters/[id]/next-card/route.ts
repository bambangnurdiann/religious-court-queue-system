import { db } from '@/lib/db'
import { counters, cards, queue_sessions } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: code } = await params

    // Verify counter exists (lookup by code, not numeric id)
    const counter = await db
      .select()
      .from(counters)
      .where(eq(counters.code, code.toUpperCase()))
      .limit(1)

    if (!counter.length) {
      return Response.json(
        { error: 'Loket tidak ditemukan.' },
        { status: 404 }
      )
    }

    // Get today's date in YYYY-MM-DD
    const today = new Date().toISOString().slice(0, 10)

    // Find first waiting session for this counter today, ordered by queue_position
    const waiting = await db
      .select()
      .from(queue_sessions)
      .where(
        and(
          eq(queue_sessions.counter_code, counter[0].code),
          eq(queue_sessions.session_date, today),
          eq(queue_sessions.status, 'waiting')
        )
      )
      .orderBy(asc(queue_sessions.queue_position))
      .limit(1)

    if (!waiting.length) {
      return Response.json(
        { error: 'Tidak ada antrian yang menunggu.' },
        { status: 409 }
      )
    }

    // Get the card for this session
    const card = await db
      .select()
      .from(cards)
      .where(eq(cards.id, waiting[0].card_id))
      .limit(1)

    const cardNumber = card.length ? card[0].card_number : 'N/A'

    // Get all waiting sessions with card numbers for the waiting list
    const allWaiting = await db
      .select({
        id: queue_sessions.id,
        position: queue_sessions.queue_position,
        activated_at: queue_sessions.activated_at,
        card_number: cards.card_number,
      })
      .from(queue_sessions)
      .innerJoin(cards, eq(queue_sessions.card_id, cards.id))
      .where(
        and(
          eq(queue_sessions.counter_code, counter[0].code),
          eq(queue_sessions.session_date, today),
          eq(queue_sessions.status, 'waiting')
        )
      )
      .orderBy(asc(queue_sessions.queue_position))

    const waitingList = allWaiting.map((w) => ({
      id: w.id,
      card_number: w.card_number || 'N/A',
      position: w.position,
      activated_at: w.activated_at,
      estimated_wait_minutes: (w.position - 1) * 5,
    }))

    return Response.json({
      session: waiting[0],
      queueNumber: `${counter[0].code}${String(waiting[0].queue_position).padStart(3, '0')}`,
      position: waiting[0].queue_position,
      card_number: cardNumber,
      waiting_list: waitingList,
    })
  } catch (error) {
    console.error('[API] GET /api/counters/[id]/next-card error:', error)
    return Response.json(
      { error: 'Gagal mengambil kartu berikutnya.' },
      { status: 500 }
    )
  }
}
