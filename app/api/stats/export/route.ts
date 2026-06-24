import { db } from '@/lib/db'
import { counters, queue_sessions, daily_logs } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const targetDate = dateParam || new Date().toISOString().slice(0, 10)

    // Get daily logs
    const logs = await db
      .select()
      .from(daily_logs)
      .where(eq(daily_logs.date, targetDate))

    // Get all sessions for the date
    const sessions = await db
      .select({
        id: queue_sessions.id,
        counter_code: queue_sessions.counter_code,
        queue_position: queue_sessions.queue_position,
        status: queue_sessions.status,
        activated_at: queue_sessions.activated_at,
        called_at: queue_sessions.called_at,
        done_at: queue_sessions.done_at,
      })
      .from(queue_sessions)
      .where(eq(queue_sessions.session_date, targetDate))
      .orderBy(asc(queue_sessions.counter_code), asc(queue_sessions.queue_position))

    const allCounters = await db.select().from(counters)

    // Build CSV content
    const counterNames: Record<string, string> = {}
    for (const c of allCounters) {
      counterNames[c.code] = c.name
    }

    const rows: string[] = []

    // Header
    rows.push('Tipe,ID,Kode Loket,Nama Loket,Nomor Antrian,Status,Waktu Aktif,Waktu Panggil,Waktu Selesai,Total Pengunjung,Dilayani,Dilewati,Rata2 Tunggu (detik),Rata2 Layanan (detik),Jam Sibuk')

    // Daily log rows
    for (const log of logs) {
      rows.push(
        [
          'Ringkasan',
          log.id,
          log.counter_code,
          `"${counterNames[log.counter_code] || ''}"`,
          '',
          '',
          '',
          '',
          '',
          log.total_visitors,
          log.served,
          log.skipped,
          log.average_wait_seconds,
          log.average_service_seconds,
          log.peak_hour ?? '',
        ].join(',')
      )
    }

    // Session detail rows
    for (const s of sessions) {
      rows.push(
        [
          'Detail',
          s.id,
          s.counter_code,
          `"${counterNames[s.counter_code] || ''}"`,
          `${s.counter_code}${String(s.queue_position).padStart(3, '0')}`,
          s.status,
          s.activated_at ? new Date(s.activated_at).toISOString() : '',
          s.called_at ? new Date(s.called_at).toISOString() : '',
          s.done_at ? new Date(s.done_at).toISOString() : '',
          '',
          '',
          '',
          '',
          '',
          '',
        ].join(',')
      )
    }

    const csv = rows.join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="laporan-antrian-${targetDate}.csv"`,
      },
    })
  } catch (error) {
    console.error('[API] GET /api/stats/export error:', error)
    return Response.json(
      { error: 'Gagal mengekspor data.' },
      { status: 500 }
    )
  }
}
