/**
 * Database seeder for Religious Court Queue System
 * Run with: npx tsx scripts/seed.ts
 * 
 * Seeds 5 counters (A-E) and 75 cards (15 per counter: A-001 to A-015, etc.)
 */

import { db, pool } from '../lib/db'
import { counters, cards } from '../lib/db/schema'
import { eq } from 'drizzle-orm'

const COUNTER_DATA = [
  { code: 'A', name: 'Meja Informasi', color_primary: '#2563EB', color_light: '#DBEAFE' },
  { code: 'B', name: 'Pendaftaran Perkara', color_primary: '#059669', color_light: '#D1FAE5' },
  { code: 'C', name: 'Kasir', color_primary: '#D97706', color_light: '#FEF3C7' },
  { code: 'D', name: 'Pengambilan Produk', color_primary: '#7C3AED', color_light: '#EDE9FE' },
  { code: 'E', name: 'Meja E-Court', color_primary: '#0D9488', color_light: '#CCFBF1' },
]

async function seed() {
  console.log('🌱 Seeding database...')

  // Get or create a default user ID (use a system user for admin)
  const systemUserId = 'system-admin-001'

  // Seed counters
  for (const counter of COUNTER_DATA) {
    const existing = await db
      .select()
      .from(counters)
      .where(eq(counters.code, counter.code))
      .limit(1)

    if (existing.length === 0) {
      await db.insert(counters).values({
        userId: systemUserId,
        code: counter.code,
        name: counter.name,
        color_primary: counter.color_primary,
        color_light: counter.color_light,
        is_open: true,
        current_number: 0,
      })
      console.log(`  ✅ Counter ${counter.code} created: ${counter.name}`)
    } else {
      console.log(`  ⏭️  Counter ${counter.code} already exists`)
    }
  }

  // Seed cards (15 per counter: A-001 to A-015, B-001 to B-015, etc.)
  for (const counter of COUNTER_DATA) {
    for (let i = 1; i <= 15; i++) {
      const cardNumber = `${counter.code}-${String(i).padStart(3, '0')}`

      const existing = await db
        .select()
        .from(cards)
        .where(eq(cards.card_number, cardNumber))
        .limit(1)

      if (existing.length === 0) {
        await db.insert(cards).values({
          userId: systemUserId,
          card_number: cardNumber,
        })
      }
    }
    console.log(`  ✅ Cards ${counter.code}-001 to ${counter.code}-015 seeded`)
  }

  console.log('✅ Seeding complete!')
  console.log('  Counters: 5 (A-E)')
  console.log('  Cards: 75 (15 per counter)')
  
  await pool.end()
}

seed().catch((error) => {
  console.error('❌ Seeding failed:', error)
  process.exit(1)
})
