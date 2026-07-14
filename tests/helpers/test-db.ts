/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// Shared in-memory test database setup for unit tests
// This consolidates the duplicated createTestDb from multiple test files

import { drizzle } from 'drizzle-orm/bun-sqlite'
import { category, expense, expenseTag, recurring, recurringTag, tag, schema } from '../../src/db/schema'
import type { DrizzleClient } from '../../src/local-types'
type RunnableQuery = {
  run: () => unknown
}

export type TestDb = DrizzleClient

export const createTestDb = async (): Promise<TestDb> => {
  const bunSqlite = (await eval("import('bun:sqlite')")) as {
    Database: new (path: string) => {
      run: (sql: string) => unknown
      transaction: <T>(fn: () => T) => () => T
    }
  }
  const { Database } = bunSqlite
  const sqlite = new Database(':memory:')
  sqlite.run('PRAGMA foreign_keys = ON')
  sqlite.run(
    'CREATE TABLE category (id TEXT PRIMARY KEY, name TEXT NOT NULL, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL)',
  )
  sqlite.run('CREATE UNIQUE INDEX category_name_lower_unique ON category (lower(name))')
  sqlite.run(
    'CREATE TABLE recurring (id TEXT PRIMARY KEY, description TEXT NOT NULL, amountCents INTEGER NOT NULL, categoryId TEXT NOT NULL REFERENCES category(id) ON DELETE RESTRICT, recurrence TEXT NOT NULL, anchorDate TEXT NOT NULL, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL)',
  )
  sqlite.run(
    'CREATE TABLE expense (id TEXT PRIMARY KEY, description TEXT NOT NULL, amountCents INTEGER NOT NULL, categoryId TEXT NOT NULL REFERENCES category(id) ON DELETE RESTRICT, date TEXT NOT NULL, recurringId TEXT REFERENCES recurring(id) ON DELETE SET NULL, occurrenceDate TEXT, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL)',
  )
  sqlite.run(
    'CREATE UNIQUE INDEX expense_recurring_occurrence_unique ON expense (recurringId, occurrenceDate) WHERE recurringId IS NOT NULL',
  )
  sqlite.run(
    'CREATE TABLE tag (id TEXT PRIMARY KEY, name TEXT NOT NULL, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL)',
  )
  sqlite.run('CREATE UNIQUE INDEX tag_name_lower_unique ON tag (lower(name))')
  sqlite.run(
    'CREATE TABLE expenseTag (expenseId TEXT NOT NULL REFERENCES expense(id) ON DELETE CASCADE, tagId TEXT NOT NULL REFERENCES tag(id) ON DELETE RESTRICT, PRIMARY KEY (expenseId, tagId))',
  )
  sqlite.run(
    'CREATE TABLE recurringTag (recurringId TEXT NOT NULL REFERENCES recurring(id) ON DELETE CASCADE, tagId TEXT NOT NULL REFERENCES tag(id) ON DELETE RESTRICT, PRIMARY KEY (recurringId, tagId))',
  )
  const db = drizzle(sqlite, { schema })
  return Object.assign(db, {
    batch: async (queries: readonly RunnableQuery[]): Promise<unknown[]> => {
      const runBatch = sqlite.transaction(() => queries.map((query) => query.run()))
      return runBatch()
    },
  }) as unknown as TestDb
}

// Common seed helpers
export const seedCategory = async (db: TestDb, id: string, name: string): Promise<void> => {
  const now = new Date()
  await db.insert(category).values({ id, name, createdAt: now, updatedAt: now })
}

export const seedTag = async (db: TestDb, id: string, name: string): Promise<void> => {
  const now = new Date()
  await db.insert(tag).values({ id, name, createdAt: now, updatedAt: now })
}

export const seedExpense = async (
  db: TestDb,
  id: string,
  categoryId: string,
  date: string = '2024-01-01',
  amountCents: number = 100,
  recurringId: string | null = null,
  occurrenceDate: string | null = null,
): Promise<void> => {
  const now = new Date()
  await db.insert(expense).values({
    id,
    description: id,
    amountCents,
    categoryId,
    date,
    recurringId,
    occurrenceDate,
    createdAt: now,
    updatedAt: now,
  })
}

export const seedExpenseTag = async (db: TestDb, expenseId: string, tagId: string): Promise<void> => {
  await db.insert(expenseTag).values({ expenseId, tagId })
}

export const seedRecurring = async (
  db: TestDb,
  id: string,
  categoryId: string,
  tagIds: string[] = [],
): Promise<void> => {
  const now = new Date()
  await db.insert(recurring).values({
    id,
    description: 'Monthly rent',
    amountCents: 150000,
    categoryId,
    recurrence: 'monthly',
    anchorDate: '2026-01-01',
    createdAt: now,
    updatedAt: now,
  })
  for (const tagId of tagIds) {
    await db.insert(recurringTag).values({ recurringId: id, tagId })
  }
}
