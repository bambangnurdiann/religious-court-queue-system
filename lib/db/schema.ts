import { pgTable, text, timestamp, boolean, serial, integer, varchar, uuid, date, jsonb, char } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- App tables ------------------------------------------------------------
// Always include a plain `userId` column so queries can be scoped per user.
// Do NOT add a foreign key constraint (`.references(() => user.id, ...)`)
// unless explicitly requested — FK constraints make iterating on the schema
// harder.

// --- Queue Management System Tables ----------------------------------------

export const counters = pgTable('counters', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  code: char('code', { length: 1 }).notNull(), // 'A', 'B', 'C', 'D', 'E'
  name: varchar('name', { length: 100 }).notNull(),
  color_primary: varchar('color_primary', { length: 50 }).notNull(),
  color_light: varchar('color_light', { length: 50 }).notNull(),
  is_open: boolean('is_open').notNull().default(true),
  current_number: integer('current_number').default(0),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const cards = pgTable('cards', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  card_number: varchar('card_number', { length: 20 }).notNull(),
  qr_token: uuid('qr_token')
    .default(sql`uuid_generate_v4()`)
    .notNull()
    .unique(),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

export const queue_sessions = pgTable('queue_sessions', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  session_date: date('session_date').notNull(),
  queue_position: integer('queue_position').notNull(),
  qr_token: uuid('qr_token').notNull(),
  counter_code: char('counter_code', { length: 1 }).notNull(),
  card_id: integer('card_id').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('waiting'), // 'waiting', 'called', 'serving', 'done', 'skipped', 'expired'
  activated_at: timestamp('activated_at'),
  called_at: timestamp('called_at'),
  done_at: timestamp('done_at'),
  expires_at: timestamp('expires_at'),
  push_subscription: jsonb('push_subscription'),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

export const daily_logs = pgTable('daily_logs', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  date: date('date').notNull(),
  counter_code: char('counter_code', { length: 1 }).notNull(),
  total_visitors: integer('total_visitors').notNull().default(0),
  served: integer('served').notNull().default(0),
  skipped: integer('skipped').notNull().default(0),
  average_wait_seconds: integer('average_wait_seconds').notNull().default(0),
  average_service_seconds: integer('average_service_seconds').notNull().default(0),
  peak_hour: integer('peak_hour'),
  created_at: timestamp('created_at').notNull().defaultNow(),
})
