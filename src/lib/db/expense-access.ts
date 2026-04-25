/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Read/write helpers for the `expense` table and its joins.
 * @module lib/db/expense-access
 */
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm'
import Result from 'true-myth/result'

import { category, expense, expenseTag, tag } from '../../db/schema'
import type { DrizzleClient } from '../../local-types'
import { withRetry } from '../db-helpers'

export interface ExpenseRow {
  id: string
  date: string
  description: string
  categoryName: string
  amountCents: number
  tagNames: string[]
}

export interface ListExpenseFilters {
  from: string
  to: string
}

export interface CategoryRow {
  id: string
  name: string
}

export interface CreateExpenseInput {
  date: string
  description: string
  categoryId: string
  amountCents: number
}

/**
 * List all categories sorted by case-insensitive `name ASC`.
 * @param db - Database instance
 * @returns Promise<Result<CategoryRow[], Error>>
 */
export const listCategories = (db: DrizzleClient): Promise<Result<CategoryRow[], Error>> =>
  withRetry('listCategories', () => listCategoriesActual(db))

const listCategoriesActual = async (
  db: DrizzleClient,
): Promise<Result<CategoryRow[], Error>> => {
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
 * Create a new expense row after verifying its `categoryId` exists.
 *
 * Inputs are assumed already validated (date as `YYYY-MM-DD`, non-empty
 * description, positive integer cents). No tag handling in this slice.
 * @param db - Database instance
 * @param input - New-expense fields
 * @returns Promise<Result<{ id: string }, Error>> — the new expense id on success
 */
export const createExpense = (
  db: DrizzleClient,
  input: CreateExpenseInput,
): Promise<Result<{ id: string }, Error>> =>
  withRetry('createExpense', () => createExpenseActual(db, input))

const createExpenseActual = async (
  db: DrizzleClient,
  input: CreateExpenseInput,
): Promise<Result<{ id: string }, Error>> => {
  try {
    const found = await db
      .select({ id: category.id })
      .from(category)
      .where(eq(category.id, input.categoryId))
    if (found.length === 0) {
      return Result.err(new Error(`Category not found: ${input.categoryId}`))
    }

    const id = crypto.randomUUID()
    const now = new Date()
    await db.insert(expense).values({
      id,
      description: input.description,
      amountCents: input.amountCents,
      categoryId: input.categoryId,
      date: input.date,
      createdAt: now,
      updatedAt: now,
    })
    return Result.ok({ id })
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

/**
 * List expenses whose `date` is within `[from, to]` inclusive.
 *
 * Results are sorted by `date DESC` then case-insensitive `description ASC`.
 * Tag names (if any) are returned alongside each row in their natural
 * ordering from the join (no duplication).
 * @param db - Database instance
 * @param filters - Date range filters
 * @returns Promise<Result<ExpenseRow[], Error>>
 */
export const listExpenses = (
  db: DrizzleClient,
  filters: ListExpenseFilters,
): Promise<Result<ExpenseRow[], Error>> =>
  withRetry('listExpenses', () => listExpensesActual(db, filters))

const listExpensesActual = async (
  db: DrizzleClient,
  filters: ListExpenseFilters,
): Promise<Result<ExpenseRow[], Error>> => {
  try {
    const rows = await db
      .select({
        id: expense.id,
        date: expense.date,
        description: expense.description,
        amountCents: expense.amountCents,
        categoryName: category.name,
      })
      .from(expense)
      .innerJoin(category, eq(category.id, expense.categoryId))
      .where(and(gte(expense.date, filters.from), lte(expense.date, filters.to)))
      .orderBy(desc(expense.date), asc(sql`lower(${expense.description})`))

    if (rows.length === 0) {
      return Result.ok([])
    }

    const tagsByExpenseId = new Map<string, string[]>()
    const tagRows = await db
      .select({ expenseId: expenseTag.expenseId, tagName: tag.name })
      .from(expenseTag)
      .innerJoin(tag, eq(tag.id, expenseTag.tagId))

    for (const row of tagRows) {
      const bucket = tagsByExpenseId.get(row.expenseId)
      if (bucket) {
        bucket.push(row.tagName)
      } else {
        tagsByExpenseId.set(row.expenseId, [row.tagName])
      }
    }

    return Result.ok(
      rows.map((row) => ({
        id: row.id,
        date: row.date,
        description: row.description,
        categoryName: row.categoryName,
        amountCents: row.amountCents,
        tagNames: tagsByExpenseId.get(row.id) ?? [],
      })),
    )
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}
