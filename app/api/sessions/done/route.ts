import { db } from '@/lib/db'
import { counters, cards, queue_sessions } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getSocketIO } from '@/lib/socket-server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { counter_code } = body

    if (!counter_code) {
      return Response.json(
        { error: 'counter_code wajib diisi.' },
        { status: 400 }
      )
    }

    const code = counter_code.toUpperCase()
    const today = new Date().toISOString().slice(0, 10)
    const now = new Date()

    // Verify counter exists
    const counter = await db
      .select()
      .from(counters)
      .where(eq(counters.code, code))
      .limit(1)

    if (!counter.length) {
      return Response.json(
        { error: 'Loket tidak ditemukan.' },
        { status: 404 }
      )
    }

    // Find current serving session
    const serving = await db
      .select()
      .from(queue_sessions)
      .where(
        and(
          eq(queue_sessions.counter_code, code),
          eq(queue_sessions.session_date, today),
          eq(queue_sessions.status, 'serving')
        )
      )
      .limit(1)

    if (!serving.length) {
      return Response.json(
        { error: 'Tidak ada antrian yang sedang dilayani.' },
        { status: 409 }
      )
    }

    const session = serving[0]

    // Look up card_number via card_id
    const card = await db
      .select()
      .from(cards)
      .where(eq(cards.id, session.card_id))
      .limit(1)
    const cardNumber = card.length ? card[0].card_number : ''

    // Mark as done
    await db
      .update(queue_sessions)
      .set({
        status: 'done',
        done_at: now,
      })
      .where(eq(queue_sessions.id, session.id))

    const queueNumber = `${code}${String(session.queue_position).padStart(3, '0')}`

    // Emit socket events
    const io = getSocketIO()
    if (io) {
      io.to(`visitor:${cardNumber}`).emit('service_completed', {
        session_id: session.id,
        queueNumber,
        counter_code: code,
        position: session.queue_position,
      })

      io.to(`counter:${code}`).emit('queue_update', {
        counter_code: code,
        action: 'done',
        queueNumber,
        position: session.queue_position,
      })
    }

    return Response.json({
      session: { ...session, status: 'done', done_at: now },
      queueNumber,
      position: session.queue_position,
    })
  } catch (error) {
    console.error('[API] POST /api/sessions/done error:', error)
    return Response.json(
      { error: 'Gagal menyelesaikan antrian.' },
      { status: 500 }
    )
  }
}
