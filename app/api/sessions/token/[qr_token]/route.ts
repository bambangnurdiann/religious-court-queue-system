import { db } from '@/lib/db'
import { cards, queue_sessions } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

// Check if token is a valid UUID format
function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

// Check if token is a card_number format (e.g., "B-1782319659091")
function isCardNumber(str: string): boolean {
  return /^[A-E]-\d+$/i.test(str)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ qr_token: string }> }
) {
  try {
    const { qr_token } = await params

    const today = new Date().toISOString().slice(0, 10)

    let session
    const isUuid = isUUID(qr_token)
    const isCard = isCardNumber(qr_token)
    console.log('[sessions/token]', { qr_token, isUuid, isCard })

    if (isUuid) {
      // Query by UUID qr_token
      session = await db
        .select()
        .from(queue_sessions)
        .where(
          and(
            eq(queue_sessions.qr_token, qr_token),
            eq(queue_sessions.session_date, today)
          )
        )
        .orderBy(desc(queue_sessions.created_at))
        .limit(1)
    } else if (isCardNumber(qr_token)) {
      // Query by card_number via join
      const result = await db
        .select({
          session: queue_sessions,
        })
        .from(queue_sessions)
        .innerJoin(cards, eq(queue_sessions.card_id, cards.id))
        .where(
          and(
            eq(cards.card_number, qr_token),
            eq(queue_sessions.session_date, today)
          )
        )
        .orderBy(desc(queue_sessions.created_at))
        .limit(1)
      session = result.map(r => r.session)
    } else {
      return Response.json(
        { error: 'Format token tidak valid. Gunakan QR code atau nomor kartu.' },
        { status: 400 }
      )
    }

    if (!session || !session.length) {
      return Response.json(
        { error: 'Sesi antrian tidak ditemukan untuk token ini.' },
        { status: 404 }
      )
    }

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

    return Response.json({
      session: session[0],
      positionAhead,
      queueNumber: `${session[0].counter_code}${String(session[0].queue_position).padStart(3, '0')}`,
    })
  } catch (error) {
    console.error('[API] GET /api/sessions/token/[qr_token] error:', error)
    return Response.json(
      { error: 'Gagal mengambil data sesi.' },
      { status: 500 }
    )
  }
}
