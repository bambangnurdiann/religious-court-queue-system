import { pgTable, text, timestamp, boolean, serial, integer, varchar } from 'drizzle-orm/pg-core'

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
// Add your app tables below. Always include a plain `userId` column so queries
// can be scoped per user — the security model depends on this column existing,
// not on a foreign key. Do NOT add a foreign key constraint
// (`.references(() => user.id, ...)`) unless the user explicitly asks for
// foreign keys or referential integrity; FK constraints make iterating on the
// schema harder.
//
// Example:
//
// import { serial } from "drizzle-orm/pg-core"
//
// export const todos = pgTable("todos", {
//   id: serial("id").primaryKey(),
//   userId: text("userId").notNull(),
//   title: text("title").notNull(),
//   completed: boolean("completed").notNull().default(false),
//   createdAt: timestamp("createdAt").notNull().defaultNow(),
// })
//
// If the user asks for foreign keys, add the reference back in:
//   userId: text("userId")
//     .notNull()
//     .references(() => user.id, { onDelete: "cascade" }),

// --- Queue Management System Tables ----------------------------------------

export const counters = pgTable('counters', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  counterNumber: integer('counterNumber').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  colorClass: varchar('colorClass', { length: 50 }).notNull(), // 'blue', 'green', 'orange', 'purple', 'teal'
  isActive: boolean('isActive').notNull().default(true),
  currentQueuePosition: integer('currentQueuePosition').default(0),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const queueCards = pgTable('queueCards', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  qrCode: varchar('qrCode', { length: 255 }).notNull().unique(),
  cardNumber: varchar('cardNumber', { length: 50 }).notNull(),
  isActivated: boolean('isActivated').notNull().default(false),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  activatedAt: timestamp('activatedAt'),
})

export const dailyQueueSessions = pgTable('dailyQueueSessions', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  sessionDate: timestamp('sessionDate').notNull(),
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const queueEntries = pgTable('queueEntries', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  sessionId: integer('sessionId').notNull(),
  counterId: integer('counterId').notNull(),
  queueCardId: integer('queueCardId').notNull(),
  queueNumber: varchar('queueNumber', { length: 20 }).notNull(),
  visitorName: varchar('visitorName', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull().default('waiting'), // 'waiting', 'in_service', 'completed', 'skipped'
  positionInQueue: integer('positionInQueue').notNull(),
  arrivalTime: timestamp('arrivalTime').notNull().defaultNow(),
  callTime: timestamp('callTime'),
  completionTime: timestamp('completionTime'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const visitorSubscriptions = pgTable('visitorSubscriptions', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  queueCardId: integer('queueCardId').notNull(),
  pushSubscription: text('pushSubscription').notNull(), // JSON stringified PushSubscription
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  expiresAt: timestamp('expiresAt'),
})

export const queueStatistics = pgTable('queueStatistics', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  sessionId: integer('sessionId').notNull(),
  counterId: integer('counterId').notNull(),
  totalVisitors: integer('totalVisitors').notNull().default(0),
  completedVisitors: integer('completedVisitors').notNull().default(0),
  averageWaitTime: integer('averageWaitTime').default(0), // in seconds
  averageServiceTime: integer('averageServiceTime').default(0), // in seconds
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})
