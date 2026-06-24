import { db } from '@/lib/db'
import { cards, queue_sessions } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ qr_token: string }> }
) {
  try {
    const { qr_token } = await params

    const today = new Date().toISOString().slice(0, 10)

    const session = await db
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

    if (!session.length) {
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
