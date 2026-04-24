/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Database schema definition using Drizzle ORM
 * Updated to match better-auth requirements
 */
import { sql } from 'drizzle-orm'
import { integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * User table schema definition (better-auth compatible)
 */
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).default(false).notNull(),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
})

/**
 * Session table schema definition (better-auth compatible)
 */
export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
})

/**
 * Account table schema definition (for better-auth)
 * Stores authentication provider information and passwords
 */
export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', {
    mode: 'timestamp',
  }),
  scope: text('scope'),
  idToken: text('idToken'),
  password: text('password'), // For email/password auth
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
})

/**
 * Verification table schema definition (for better-auth)
 * Used for email verification, password reset, etc.
 */
export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
})

export const singleUseCode = sqliteTable('singleUseCode', {
  code: text('code').primaryKey(),
  email: text('email'),
})

export const interestedEmail = sqliteTable('interestedEmail', {
  email: text('email').primaryKey().unique(),
})

/**
 * Category table schema definition
 */
export const category = sqliteTable('category', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
})

/**
 * Tag table schema definition
 */
export const tag = sqliteTable('tag', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
})

/**
 * Recurring expense template schema definition
 */
export const recurring = sqliteTable('recurring', {
  id: text('id').primaryKey(),
  description: text('description').notNull(),
  amountCents: integer('amountCents').notNull(),
  categoryId: text('categoryId')
    .notNull()
    .references(() => category.id, { onDelete: 'restrict' }),
  recurrence: text('recurrence').notNull(),
  anchorDate: text('anchorDate').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
})

/**
 * Expense table schema definition
 */
export const expense = sqliteTable(
  'expense',
  {
    id: text('id').primaryKey(),
    description: text('description').notNull(),
    amountCents: integer('amountCents').notNull(),
    categoryId: text('categoryId')
      .notNull()
      .references(() => category.id, { onDelete: 'restrict' }),
    date: text('date').notNull(),
    recurringId: text('recurringId').references(() => recurring.id, {
      onDelete: 'set null',
    }),
    occurrenceDate: text('occurrenceDate'),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('expense_recurring_occurrence_unique')
      .on(table.recurringId, table.occurrenceDate)
      .where(sql`${table.recurringId} IS NOT NULL`),
  ],
)

/**
 * Join table between expense and tag
 */
export const expenseTag = sqliteTable(
  'expenseTag',
  {
    expenseId: text('expenseId')
      .notNull()
      .references(() => expense.id, { onDelete: 'cascade' }),
    tagId: text('tagId')
      .notNull()
      .references(() => tag.id, { onDelete: 'restrict' }),
  },
  (table) => [primaryKey({ columns: [table.expenseId, table.tagId] })],
)

/**
 * Join table between recurring and tag
 */
export const recurringTag = sqliteTable(
  'recurringTag',
  {
    recurringId: text('recurringId')
      .notNull()
      .references(() => recurring.id, { onDelete: 'cascade' }),
    tagId: text('tagId')
      .notNull()
      .references(() => tag.id, { onDelete: 'restrict' }),
  },
  (table) => [primaryKey({ columns: [table.recurringId, table.tagId] })],
)

// Define schema object for export
export const schema = {
  user,
  session,
  account,
  verification,
  interestedEmail,
  singleUseCode,
  category,
  tag,
  expense,
  expenseTag,
  recurring,
  recurringTag,
}

export type User = typeof user.$inferSelect
export type Session = typeof session.$inferSelect
export type Account = typeof account.$inferSelect
export type Verification = typeof verification.$inferSelect
export type InterestedEmail = typeof interestedEmail.$inferSelect
export type SingleUseCode = typeof singleUseCode.$inferSelect
export type Category = typeof category.$inferSelect
export type Tag = typeof tag.$inferSelect
export type Expense = typeof expense.$inferSelect
export type ExpenseTag = typeof expenseTag.$inferSelect
export type Recurring = typeof recurring.$inferSelect
export type RecurringTag = typeof recurringTag.$inferSelect

export type NewUser = typeof user.$inferInsert
export type NewSession = typeof session.$inferInsert
export type NewAccount = typeof account.$inferInsert
export type NewVerification = typeof verification.$inferInsert
export type NewInterestedEmail = typeof interestedEmail.$inferInsert
export type NewSingleUseCode = typeof singleUseCode.$inferInsert
export type NewCategory = typeof category.$inferInsert
export type NewTag = typeof tag.$inferInsert
export type NewExpense = typeof expense.$inferInsert
export type NewExpenseTag = typeof expenseTag.$inferInsert
export type NewRecurring = typeof recurring.$inferInsert
export type NewRecurringTag = typeof recurringTag.$inferInsert
