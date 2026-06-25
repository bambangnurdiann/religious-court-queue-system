import { db } from '@/lib/db'
import { counters } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const code = id.toUpperCase()

    const existing = await db
      .select()
      .from(counters)
      .where(eq(counters.code, code))
      .limit(1)

    if (!existing.length) {
      return Response.json({ error: 'Loket tidak ditemukan.' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const newIsOpen =
      typeof body.is_open === 'boolean' ? body.is_open : !existing[0].is_open

    await db
      .update(counters)
      .set({ is_open: newIsOpen, updatedAt: new Date() })
      .where(eq(counters.code, code))

    const updated = await db
      .select()
      .from(counters)
      .where(eq(counters.code, code))
      .limit(1)

    return Response.json(updated[0])
  } catch (error) {
    console.error('[API] PATCH /api/counters/[id]/toggle error:', error)
    return Response.json({ error: 'Gagal mengubah status loket.' }, { status: 500 })
  }
}
