import { db } from '@/lib/db'
import { counters, cards, queue_sessions } from '@/lib/db/schema'
import { eq, and, sql, asc } from 'drizzle-orm'
import { getSocketIO } from '@/lib/socket-server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { counter_code, card_number } = body

    if (!counter_code) {
      return Response.json(
        { error: 'counter_code wajib diisi.' },
        { status: 400 }
      )
    }

    const code = counter_code.toUpperCase()

    // Validate counter exists and is open
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
        { error: 'Loket sedang tutup. Tidak dapat mengaktifkan antrian.' },
        { status: 403 }
      )
    }

    let card: any[]

    if (card_number) {
      // Look up existing card by card_number
      card = await db
        .select()
        .from(cards)
        .where(eq(cards.card_number, card_number))
        .limit(1)

      if (!card.length) {
        return Response.json(
          { error: 'Nomor kartu tidak valid. Kartu tidak ditemukan.' },
          { status: 404 }
        )
      }
    } else {
      // Auto-generate a new card
      const newCardNumber = `${code}-${Date.now()}`

      card = await db
        .insert(cards)
        .values({
          userId: counter[0].userId,
          card_number: newCardNumber,
        })
        .returning()
    }

    const today = new Date().toISOString().slice(0, 10)

    // Check if already activated today (duplicate)
    const existing = await db
      .select()
      .from(queue_sessions)
      .where(
        and(
          eq(queue_sessions.card_id, card[0].id),
          eq(queue_sessions.session_date, today)
        )
      )
      .limit(1)

    if (existing.length) {
      // Return existing session — duplicate activation
      const ex = existing[0]
      return Response.json({
        session: ex,
        queueNumber: `${ex.counter_code}${String(ex.queue_position).padStart(3, '0')}`,
        position: ex.queue_position,
      })
    }

    // Find next queue_position for this counter today
    const maxPos = await db
      .select({
        max: sql<number>`COALESCE(MAX(${queue_sessions.queue_position}), 0)`,
      })
      .from(queue_sessions)
      .where(
        and(
          eq(queue_sessions.counter_code, counter_code.toUpperCase()),
          eq(queue_sessions.session_date, today)
        )
      )
      .limit(1)

    const nextPosition = (maxPos[0]?.max ?? 0) + 1
    const queueNumber = `${counter_code.toUpperCase()}${String(nextPosition).padStart(3, '0')}`

    // Determine expiry (end of day or 8 hours from now, whichever is sooner)
    const expiresAt = new Date()
    expiresAt.setHours(23, 59, 59, 999)

    // Create session
    const [newSession] = await db
      .insert(queue_sessions)
      .values({
        userId: card[0].userId,
        session_date: today,
        queue_position: nextPosition,
        counter_code: counter_code.toUpperCase(),
        card_id: card[0].id,
        status: 'waiting',
        activated_at: new Date(),
        expires_at: expiresAt,
        created_at: new Date(),
      })
      .returning()

    // Emit queue_update to counter room
    const io = getSocketIO()
    if (io) {
      io.to(`counter:${counter_code.toUpperCase()}`).emit('queue_update', {
        counter_code: counter_code.toUpperCase(),
        action: 'activated',
        session: newSession,
        queueNumber,
        position: nextPosition,
      })
    }

    return Response.json(
      {
        session: newSession,
        queueNumber,
        position: nextPosition,
        card_number: card[0].card_number,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[API] POST /api/sessions/activate error:', error)
    return Response.json(
      { error: 'Gagal mengaktifkan sesi antrian.' },
      { status: 500 }
    )
  }
}
