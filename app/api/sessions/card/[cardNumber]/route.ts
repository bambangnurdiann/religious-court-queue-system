import { db } from '@/lib/db'
import { cards, queue_sessions } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

// Check if token is a card_number format (e.g., "A-001")
function isCardNumber(str: string): boolean {
  return /^[A-Z]-\d+$/i.test(str)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cardNumber: string }> }
) {
  try {
    const { cardNumber } = await params

    const today = new Date().toISOString().slice(0, 10)

    if (!isCardNumber(cardNumber)) {
      return Response.json(
        { error: 'Format nomor kartu tidak valid. Gunakan format seperti A-001.' },
        { status: 400 }
      )
    }
    // Look up card by card_number
    const cardResult = await db
      .select()
      .from(cards)
      .where(eq(cards.card_number, cardNumber))
      .limit(1)

    if (!cardResult.length) {
      return Response.json(
        { error: 'Nomor kartu tidak ditemukan.' },
        { status: 404 }
      )
    }
    const card = cardResult[0]

    // Find queue_session for today by card_id
    const sessionResult = await db
      .select()
      .from(queue_sessions)
      .where(
        and(
          eq(queue_sessions.card_id, card.id),
          eq(queue_sessions.session_date, today)
        )
      )
      .orderBy(desc(queue_sessions.created_at))
      .limit(1)

    if (!sessionResult.length) {
      return Response.json(
        { error: 'Sesi antrian tidak ditemukan untuk nomor kartu ini.' },
        { status: 404 }
      )
    }

    const session = sessionResult

    // Also count how many waiting/called ahead of this session
    const ahead = await db
      .select()
      .from(queue_sessions)
      .where(
        and(
          eq(queue_sessions.counter_code, session[0].counter_code),
          eq(queue_sessions.session_date, today),
          eq(queue_sessions.status, 'waiting')
        )
      )

    const positionAhead = ahead.filter(
      (s) => s.queue_position < session[0].queue_position
    ).length

    const s = session[0]
    return Response.json({
      ...s,
      position: s.queue_position,
      positionAhead,
      queueNumber: `${s.counter_code}${String(s.queue_position).padStart(3, '0')}`,
    })
  } catch (error) {
    console.error('[API] GET /api/sessions/card/[cardNumber] error:', error)
    return Response.json(
      { error: 'Gagal mengambil data sesi.' },
      { status: 500 }
    )
  }
}
