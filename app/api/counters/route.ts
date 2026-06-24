import { db } from '@/lib/db'
import { counters } from '@/lib/db/schema'
import { asc } from 'drizzle-orm'

export async function GET() {
  try {
    const all = await db.select().from(counters).orderBy(asc(counters.code))
    return Response.json(all)
  } catch (error) {
    console.error('[API] GET /api/counters error:', error)
    return Response.json(
      { error: 'Gagal mengambil daftar loket.' },
      { status: 500 }
    )
  }
}
