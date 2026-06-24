import { db } from '@/lib/db'
import { queue_sessions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionId = parseInt(id, 10)

    const body = await request.json()
    const { push_subscription } = body

    if (!push_subscription) {
      return Response.json(
        { error: 'push_subscription wajib diisi.' },
        { status: 400 }
      )
    }

    const existing = await db
      .select()
      .from(queue_sessions)
      .where(eq(queue_sessions.id, sessionId))
      .limit(1)

    if (!existing.length) {
      return Response.json(
        { error: 'Sesi antrian tidak ditemukan.' },
        { status: 404 }
      )
    }

    await db
      .update(queue_sessions)
      .set({ push_subscription })
      .where(eq(queue_sessions.id, sessionId))

    const updated = await db
      .select()
      .from(queue_sessions)
      .where(eq(queue_sessions.id, sessionId))
      .limit(1)

    return Response.json(updated[0])
  } catch (error) {
    console.error('[API] PATCH /api/sessions/[id]/subscribe error:', error)
    return Response.json(
      { error: 'Gagal menyimpan langganan push notifikasi.' },
      { status: 500 }
    )
  }
}
