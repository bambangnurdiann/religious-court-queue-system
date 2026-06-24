import cron from 'node-cron'
import { db } from '@/lib/db'
import { queue_sessions, daily_logs, counters, cards } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { getSocketIO } from '@/lib/socket-server'

export function startCronJobs() {
  // Daily reset at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Running daily reset...')
    try {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const dateStr = yesterday.toISOString().split('T')[0]

      // Compute daily_logs — group by userId and counter_code
      const sessions = await db
        .select({
          userId: queue_sessions.userId,
          counter_code: queue_sessions.counter_code,
          total: sql<number>`count(*)`,
          served: sql<number>`count(case when ${queue_sessions.status} = 'done' then 1 end)`,
          skipped: sql<number>`count(case when ${queue_sessions.status} = 'skipped' then 1 end)`,
        })
        .from(queue_sessions)
        .where(eq(queue_sessions.session_date, dateStr))
        .groupBy(queue_sessions.userId, queue_sessions.counter_code)

      for (const s of sessions) {
        await db.insert(daily_logs).values({
          userId: s.userId,
          date: dateStr,
          counter_code: s.counter_code,
          total_visitors: Number(s.total),
          served: Number(s.served),
          skipped: Number(s.skipped),
        })
      }

      // Reset counters (current_number back to 0)
      await db.update(counters).set({ current_number: 0 })

      // Emit system_reset
      const io = getSocketIO()
      if (io) io.emit('system_reset', { message: 'Reset harian telah dilakukan' })

      console.log('[Cron] Daily reset completed')
    } catch (error) {
      console.error('[Cron] Daily reset error:', error)
    }
  })

  // Auto-expire sessions every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Cron] Checking expired sessions...')
    try {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)
      const expired = await db
        .update(queue_sessions)
        .set({ 
          status: 'expired', 
          expires_at: new Date() 
        })
        .where(
          and(
            eq(queue_sessions.status, 'waiting'),
            sql`${queue_sessions.activated_at} < ${threeHoursAgo.toISOString()}`
          )
        )
        .returning()

      const io = getSocketIO()
      for (const session of expired) {
        if (io && session.qr_token) {
          io.to(`visitor:${session.qr_token}`).emit('session_expired', {
            message: 'Sesi antrian Anda telah berakhir',
            queueNumber: session.queue_position,
          })
        }
      }

      if (expired.length > 0) {
        console.log(`[Cron] Expired ${expired.length} sessions`)
      }
    } catch (error) {
      console.error('[Cron] Expire error:', error)
    }
  })

  console.log('[Cron] Jobs scheduled: daily reset (00:00), session expiry (every 15 mins)')
}
