import { db } from '@/lib/db'
import { counters, cards, queue_sessions } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const counterId = parseInt(id, 10)

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

    return Response.json({
      session: waiting[0],
      queueNumber: `${counter[0].code}${String(waiting[0].queue_position).padStart(3, '0')}`,
      position: waiting[0].queue_position,
    })
  } catch (error) {
    console.error('[API] GET /api/counters/[id]/next-card error:', error)
    return Response.json(
      { error: 'Gagal mengambil kartu berikutnya.' },
      { status: 500 }
    )
  }
}
