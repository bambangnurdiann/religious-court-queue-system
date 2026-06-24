import { db } from '@/lib/db'
import { counters, queue_sessions } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
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
        { error: 'Loket sedang tutup. Tidak dapat memanggil ulang.' },
        { status: 403 }
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
    const queueNumber = `${code}${String(session.queue_position).padStart(3, '0')}`

    // Re-emit via socket
    const io = getSocketIO()
    if (io) {
      // Re-notify visitor
      io.to(`visitor:${session.qr_token}`).emit('number_called', {
        session_id: session.id,
        queueNumber,
        counter_code: code,
        counter_name: counter[0].name,
        position: session.queue_position,
        is_recall: true,
      })

      io.to(`counter:${code}`).emit('queue_update', {
        counter_code: code,
        action: 'recalled',
        queueNumber,
        position: session.queue_position,
      })
    }

    // Re-send push notification if subscribed
    if (session.push_subscription) {
      try {
        await notifyVisitorCalled(session.push_subscription, queueNumber, code, session.qr_token)
      } catch (e) {
        console.error('[API] Recall push notification failed:', e)
      }
    }

    return Response.json({
      session,
      queueNumber,
      position: session.queue_position,
    })
  } catch (error) {
    console.error('[API] POST /api/sessions/recall error:', error)
    return Response.json(
      { error: 'Gagal memanggil ulang antrian.' },
      { status: 500 }
    )
  }
}
