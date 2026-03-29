/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Database schema definition using Drizzle ORM
 * Updated to match better-auth requirements
 */
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

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
 * Category table for expense categorization
 */
export const category = sqliteTable('category', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
})

/**
 * Tag table for expense tagging
 */
export const tag = sqliteTable('tag', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
})

/**
 * Expense table for tracking expenses
 * Amount stored as cents (integer) to avoid floating-point issues
 */
export const expense = sqliteTable('expense', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  amountCents: integer('amountCents').notNull(),
  date: text('date').notNull(),
  description: text('description').notNull(),
  categoryId: text('categoryId').references(() => category.id, {
    onDelete: 'set null',
  }),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
})

/**
 * Expense-Tag join table for many-to-many relationship
 */
export const expenseTag = sqliteTable(
  'expenseTag',
  {
    expenseId: text('expenseId')
      .notNull()
      .references(() => expense.id, { onDelete: 'cascade' }),
    tagId: text('tagId')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: text('pk').primaryKey(`${table.expenseId}-${table.tagId}`),
  }),
)

/**
 * RecurringExpense table for scheduled expense templates
 */
export const recurringExpense = sqliteTable('recurringExpense', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  amountCents: integer('amountCents').notNull(),
  description: text('description').notNull(),
  categoryId: text('categoryId').references(() => category.id, {
    onDelete: 'set null',
  }),
  period: text('period').notNull(), // e.g., 'daily', 'weekly', 'monthly', 'yearly'
  nextRunDate: text('nextRunDate').notNull(),
  isActive: integer('isActive', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
})

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
  recurringExpense,
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
export type RecurringExpense = typeof recurringExpense.$inferSelect

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
export type NewRecurringExpense = typeof recurringExpense.$inferInsert
