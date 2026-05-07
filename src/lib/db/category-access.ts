/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Read/write helpers for the `category` table.
 * @module lib/db/category-access
 */
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm'
import { Result } from 'true-myth'

import { category, expense, recurring } from '../../db/schema'
import type { DrizzleClient } from '../../local-types'
import { withRetry } from '../db-helpers'

export interface CategoryRow {
  id: string
  name: string
}

export interface RenameCategoryInput {
  id: string
  name: string
}

export interface MergeCategoryInput {
  sourceId: string
  targetId: string
}

/**
 * List all categories sorted by case-insensitive `name ASC`.
 * @param db - Database instance
 * @returns Promise<Result<CategoryRow[], Error>>
 */
export const listCategories = (db: DrizzleClient): Promise<Result<CategoryRow[], Error>> =>
  withRetry('listCategories', () => listCategoriesActual(db))

const listCategoriesActual = async (db: DrizzleClient): Promise<Result<CategoryRow[], Error>> => {
  try {
    const rows = await db
      .select({ id: category.id, name: category.name })
      .from(category)
      .orderBy(asc(sql`lower(${category.name})`))
    return Result.ok(rows)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

/**
 * Look up a single category by name (case-insensitive). Whitespace around
 * `name` is trimmed before comparing. Returns `Result.ok(null)` when the
 * trimmed input is empty or no row matches.
 * @param db - Database instance
 * @param name - Category name to look up (any case, leading/trailing
 *   whitespace allowed)
 */
export const findCategoryByName = (
  db: DrizzleClient,
  name: string,
): Promise<Result<CategoryRow | null, Error>> =>
  withRetry('findCategoryByName', () => findCategoryByNameActual(db, name))

const findCategoryByNameActual = async (
  db: DrizzleClient,
  name: string,
): Promise<Result<CategoryRow | null, Error>> => {
  try {
    const trimmed = typeof name === 'string' ? name.trim() : ''
    if (trimmed.length === 0) {
      return Result.ok(null)
    }
    const rows = await db
      .select({ id: category.id, name: category.name })
      .from(category)
      .where(sql`lower(${category.name}) = lower(${trimmed})`)
      .limit(1)
    if (rows.length === 0) {
      return Result.ok(null)
    }
    return Result.ok(rows[0])
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const createCategory = (
  db: DrizzleClient,
  name: string,
): Promise<Result<CategoryRow, Error>> =>
  withRetry('createCategory', () => createCategoryActual(db, name))

const createCategoryActual = async (
  db: DrizzleClient,
  name: string,
): Promise<Result<CategoryRow, Error>> => {
  try {
    const normalizedName = name.trim().toLowerCase()
    if (normalizedName.length === 0) {
      return Result.err(new Error('Category name is required.'))
    }
    const existing = await findCategoryByNameActual(db, normalizedName)
    if (existing.isErr) {
      return Result.err(existing.error)
    }
    if (existing.value !== null) {
      return Result.err(new Error(`A category named "${normalizedName}" already exists.`))
    }
    const id = crypto.randomUUID()
    const now = new Date()
    await db.insert(category).values({ id, name: normalizedName, createdAt: now, updatedAt: now })
    return Result.ok({ id, name: normalizedName })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (/unique|constraint/i.test(message)) {
      return Result.err(
        new Error(`A category named "${name.trim().toLowerCase()}" already exists.`),
      )
    }
    return Result.err(e instanceof Error ? e : new Error(message))
  }
}

export const renameCategory = (
  db: DrizzleClient,
  input: RenameCategoryInput,
): Promise<Result<CategoryRow, Error>> =>
  withRetry('renameCategory', () => renameCategoryActual(db, input))

const renameCategoryActual = async (
  db: DrizzleClient,
  input: RenameCategoryInput,
): Promise<Result<CategoryRow, Error>> => {
  try {
    const normalizedName = input.name.trim().toLowerCase()
    if (normalizedName.length === 0) {
      return Result.err(new Error('Category name is required.'))
    }
    const rows = await db
      .select({ id: category.id, name: category.name })
      .from(category)
      .where(eq(category.id, input.id))
      .limit(1)
    if (rows.length === 0) {
      return Result.err(new Error('Category not found.'))
    }
    const duplicate = await db
      .select({ id: category.id, name: category.name })
      .from(category)
      .where(
        and(sql`lower(${category.name}) = lower(${normalizedName})`, ne(category.id, input.id)),
      )
      .limit(1)
    if (duplicate.length > 0) {
      return Result.err(new Error(`A category named "${normalizedName}" already exists.`))
    }
    const now = new Date()
    await db
      .update(category)
      .set({ name: normalizedName, updatedAt: now })
      .where(eq(category.id, input.id))
    return Result.ok({ id: input.id, name: normalizedName })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (/unique|constraint/i.test(message)) {
      return Result.err(
        new Error(`A category named "${input.name.trim().toLowerCase()}" already exists.`),
      )
    }
    return Result.err(e instanceof Error ? e : new Error(message))
  }
}

const countExpensesForCategory = async (db: DrizzleClient, categoryId: string): Promise<number> => {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(expense)
    .where(eq(expense.categoryId, categoryId))
  return Number(rows[0]?.count ?? 0)
}

export const countCategoryExpenses = (
  db: DrizzleClient,
  categoryId: string,
): Promise<Result<number, Error>> =>
  withRetry('countCategoryExpenses', () => countCategoryExpensesActual(db, categoryId))

const countCategoryExpensesActual = async (
  db: DrizzleClient,
  categoryId: string,
): Promise<Result<number, Error>> => {
  try {
    return Result.ok(await countExpensesForCategory(db, categoryId))
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

const countRecurringForCategory = async (
  db: DrizzleClient,
  categoryId: string,
): Promise<number> => {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(recurring)
    .where(eq(recurring.categoryId, categoryId))
  return Number(rows[0]?.count ?? 0)
}

export const mergeCategory = (
  db: DrizzleClient,
  input: MergeCategoryInput,
): Promise<Result<{ reassignedExpenseCount: number }, Error>> =>
  withRetry('mergeCategory', () => mergeCategoryActual(db, input))

const mergeCategoryActual = async (
  db: DrizzleClient,
  input: MergeCategoryInput,
): Promise<Result<{ reassignedExpenseCount: number }, Error>> => {
  try {
    if (input.sourceId === input.targetId) {
      return Result.err(new Error('Choose two different categories.'))
    }
    const rows = await db
      .select({ id: category.id })
      .from(category)
      .where(inArray(category.id, [input.sourceId, input.targetId]))
    const ids = new Set(rows.map((row) => row.id))
    if (!ids.has(input.sourceId)) {
      return Result.err(new Error('Source category not found.'))
    }
    if (!ids.has(input.targetId)) {
      return Result.err(new Error('Target category not found.'))
    }
    const reassignedExpenseCount = await countExpensesForCategory(db, input.sourceId)
    const now = new Date()
    await db.batch([
      db
        .update(expense)
        .set({ categoryId: input.targetId, updatedAt: now })
        .where(eq(expense.categoryId, input.sourceId)),
      db
        .update(recurring)
        .set({ categoryId: input.targetId, updatedAt: now })
        .where(eq(recurring.categoryId, input.sourceId)),
      db.delete(category).where(eq(category.id, input.sourceId)),
    ] as never)
    return Result.ok({ reassignedExpenseCount })
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const deleteCategory = (db: DrizzleClient, id: string): Promise<Result<void, Error>> =>
  withRetry('deleteCategory', () => deleteCategoryActual(db, id))

const deleteCategoryActual = async (
  db: DrizzleClient,
  id: string,
): Promise<Result<void, Error>> => {
  try {
    const found = await db
      .select({ id: category.id })
      .from(category)
      .where(eq(category.id, id))
      .limit(1)
    if (found.length === 0) {
      return Result.err(new Error('Category not found.'))
    }
    const expenseCount = await countExpensesForCategory(db, id)
    if (expenseCount > 0) {
      return Result.err(
        new Error(
          `${expenseCount} ${
            expenseCount === 1 ? 'expense references' : 'expenses reference'
          } this category.`,
        ),
      )
    }
    const recurringCount = await countRecurringForCategory(db, id)
    if (recurringCount > 0) {
      return Result.err(new Error('Recurring expenses reference this category.'))
    }
    await db.delete(category).where(eq(category.id, id))
    return Result.ok(undefined as unknown as void)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}
