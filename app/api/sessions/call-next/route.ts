import { db } from '@/lib/db'
import { counters, cards, queue_sessions } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { getSocketIO } from '@/lib/socket-server'
import { notifyVisitorCalled } from '@/lib/push-server'

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

    // Verify counter exists and is open
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

    if (!counter[0].is_open) {
      return Response.json(
        { error: 'Loket sedang tutup. Tidak dapat memanggil antrian.' },
        { status: 403 }
      )
    }

    // Find first waiting session for this counter today
    const waiting = await db
      .select()
      .from(queue_sessions)
      .where(
        and(
          eq(queue_sessions.counter_code, code),
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

    const session = waiting[0]
    const now = new Date()

    // Look up card_number via card_id
    const card = await db
      .select()
      .from(cards)
      .where(eq(cards.id, session.card_id))
      .limit(1)
    const cardNumber = card.length ? card[0].card_number : ''

    // Update session to 'serving'
    await db
      .update(queue_sessions)
      .set({
        status: 'serving',
        called_at: now,
      })
      .where(eq(queue_sessions.id, session.id))

    // Update counter current_number
    await db
      .update(counters)
      .set({
        current_number: session.queue_position,
        updatedAt: now,
      })
      .where(eq(counters.code, code))

    const queueNumber = `${code}${String(session.queue_position).padStart(3, '0')}`

    // Emit socket events
    const io = getSocketIO()
    if (io) {
      // Notify the visitor
      io.to(`visitor:${cardNumber}`).emit('number_called', {
        session_id: session.id,
        queueNumber,
        counter_code: code,
        counter_name: counter[0].name,
        position: session.queue_position,
      })

      // Also emit to counter room so public display updates
      io.to(`counter:${code}`).emit('number_called', {
        counter_code: code,
        number: session.queue_position,
        card_number: cardNumber,
        position: session.queue_position,
      })

      // Update counter room
      io.to(`counter:${code}`).emit('queue_update', {
        counter_code: code,
        action: 'called',
        queueNumber,
        position: session.queue_position,
      })
    }

    // Send push notification if subscribed
    if (session.push_subscription) {
      try {
        await notifyVisitorCalled(
          session.push_subscription,
          queueNumber,
          code,
          cardNumber
        )
      } catch (e) {
        console.error('[API] Push notification failed:', e)
      }
    }

    return Response.json({
      session: { ...session, status: 'serving', called_at: now },
      queueNumber,
      position: session.queue_position,
    })
  } catch (error) {
    console.error('[API] POST /api/sessions/call-next error:', error)
    return Response.json(
      { error: 'Gagal memanggil antrian berikutnya.' },
      { status: 500 }
    )
  }
}
