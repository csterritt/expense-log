/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Database access layer for expense-related tables
 * @module lib/expense-db-access
 */
import Result from 'true-myth/result'
import { eq, desc, asc, inArray } from 'drizzle-orm'

import {
  category,
  tag,
  expense,
  expenseTag,
  recurringExpense,
} from '../db/schema'
import type {
  Category,
  Tag,
  Expense,
  RecurringExpense,
  NewCategory,
  NewTag,
  NewExpense,
  NewRecurringExpense,
} from '../db/schema'
import type { DrizzleClient } from '../local-types'

/**
 * Expense with joined category and tags data
 */
export interface ExpenseWithDetails extends Expense {
  categoryName: string | null
  tags: Array<{ id: string; name: string }>
}

/**
 * Filters for querying expenses
 */
export interface ExpenseFilters {
  categoryId?: string
  tagId?: string
  descriptionSearch?: string
  sortAsc?: boolean
}

/**
 * Data for creating or updating an expense
 */
export interface ExpenseData {
  userId: string
  amountCents: number
  date: string
  description: string
  categoryId?: string | null
}

/**
 * Data for creating or updating a recurring expense
 */
export interface RecurringExpenseData {
  userId: string
  amountCents: number
  description: string
  categoryId?: string | null
  period: string
  nextRunDate: string
  isActive?: boolean
}

// ---------------------------------------------------------------------------
// Category CRUD
// ---------------------------------------------------------------------------

export const getAllCategories = async (
  db: DrizzleClient
): Promise<Result<Category[], Error>> => {
  try {
    const rows = await db.select().from(category).orderBy(asc(category.name))
    return Result.ok(rows)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const getCategoryByName = async (
  db: DrizzleClient,
  name: string
): Promise<Result<Category[], Error>> => {
  try {
    const rows = await db
      .select()
      .from(category)
      .where(eq(category.name, name))
    return Result.ok(rows)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const createCategory = async (
  db: DrizzleClient,
  name: string
): Promise<Result<Category, Error>> => {
  try {
    const id = crypto.randomUUID()
    const now = new Date()
    const newCategory: NewCategory = { id, name, createdAt: now }
    await db.insert(category).values(newCategory)
    const rows = await db
      .select()
      .from(category)
      .where(eq(category.id, id))
    if (rows.length === 0) {
      return Result.err(new Error('Failed to retrieve created category'))
    }
    return Result.ok(rows[0])
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const updateCategory = async (
  db: DrizzleClient,
  id: string,
  name: string
): Promise<Result<boolean, Error>> => {
  try {
    const result = await db
      .update(category)
      .set({ name })
      .where(eq(category.id, id))
    const rowsUpdated = result.meta?.changes ?? 0
    return Result.ok(rowsUpdated >= 1)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const deleteCategory = async (
  db: DrizzleClient,
  id: string
): Promise<Result<boolean, Error>> => {
  try {
    const result = await db.delete(category).where(eq(category.id, id))
    const rowsDeleted = result.meta?.changes ?? 0
    return Result.ok(rowsDeleted >= 1)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

// ---------------------------------------------------------------------------
// Tag CRUD
// ---------------------------------------------------------------------------

export const getAllTags = async (
  db: DrizzleClient
): Promise<Result<Tag[], Error>> => {
  try {
    const rows = await db.select().from(tag).orderBy(asc(tag.name))
    return Result.ok(rows)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const getTagByName = async (
  db: DrizzleClient,
  name: string
): Promise<Result<Tag[], Error>> => {
  try {
    const rows = await db.select().from(tag).where(eq(tag.name, name))
    return Result.ok(rows)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const createTag = async (
  db: DrizzleClient,
  name: string
): Promise<Result<Tag, Error>> => {
  try {
    const id = crypto.randomUUID()
    const now = new Date()
    const newTag: NewTag = { id, name, createdAt: now }
    await db.insert(tag).values(newTag)
    const rows = await db.select().from(tag).where(eq(tag.id, id))
    if (rows.length === 0) {
      return Result.err(new Error('Failed to retrieve created tag'))
    }
    return Result.ok(rows[0])
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const updateTag = async (
  db: DrizzleClient,
  id: string,
  name: string
): Promise<Result<boolean, Error>> => {
  try {
    const result = await db.update(tag).set({ name }).where(eq(tag.id, id))
    const rowsUpdated = result.meta?.changes ?? 0
    return Result.ok(rowsUpdated >= 1)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const deleteTag = async (
  db: DrizzleClient,
  id: string
): Promise<Result<boolean, Error>> => {
  try {
    const result = await db.delete(tag).where(eq(tag.id, id))
    const rowsDeleted = result.meta?.changes ?? 0
    return Result.ok(rowsDeleted >= 1)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

// ---------------------------------------------------------------------------
// Expense CRUD
// ---------------------------------------------------------------------------

export const createExpense = async (
  db: DrizzleClient,
  data: ExpenseData
): Promise<Result<Expense, Error>> => {
  try {
    const id = crypto.randomUUID()
    const now = new Date()
    const newExpense: NewExpense = {
      id,
      userId: data.userId,
      amountCents: data.amountCents,
      date: data.date,
      description: data.description,
      categoryId: data.categoryId ?? null,
      createdAt: now,
      updatedAt: now,
    }
    await db.insert(expense).values(newExpense)
    const rows = await db.select().from(expense).where(eq(expense.id, id))
    if (rows.length === 0) {
      return Result.err(new Error('Failed to retrieve created expense'))
    }
    return Result.ok(rows[0])
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const getExpenses = async (
  db: DrizzleClient,
  filters?: ExpenseFilters
): Promise<Result<ExpenseWithDetails[], Error>> => {
  try {
    const sortOrder = filters?.sortAsc ? asc(expense.date) : desc(expense.date)

    let query = db
      .select({
        id: expense.id,
        userId: expense.userId,
        amountCents: expense.amountCents,
        date: expense.date,
        description: expense.description,
        categoryId: expense.categoryId,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
        categoryName: category.name,
      })
      .from(expense)
      .leftJoin(category, eq(expense.categoryId, category.id))
      .orderBy(sortOrder)

    const baseRows = await query

    // Apply description filter in-memory (SQLite LIKE is case-insensitive by default for ASCII)
    let filteredRows = baseRows
    if (filters?.descriptionSearch) {
      const search = filters.descriptionSearch.toLowerCase()
      filteredRows = filteredRows.filter((r) =>
        r.description.toLowerCase().includes(search)
      )
    }

    // Apply category filter
    if (filters?.categoryId) {
      filteredRows = filteredRows.filter(
        (r) => r.categoryId === filters.categoryId
      )
    }

    // For each expense, load its tags
    const expenseIds = filteredRows.map((r) => r.id)

    let tagsByExpenseId: Record<string, Array<{ id: string; name: string }>> =
      {}

    if (expenseIds.length > 0) {
      const tagRows = await db
        .select({
          expenseId: expenseTag.expenseId,
          tagId: tag.id,
          tagName: tag.name,
        })
        .from(expenseTag)
        .innerJoin(tag, eq(expenseTag.tagId, tag.id))
        .where(inArray(expenseTag.expenseId, expenseIds))

      for (const row of tagRows) {
        if (!tagsByExpenseId[row.expenseId]) {
          tagsByExpenseId[row.expenseId] = []
        }
        tagsByExpenseId[row.expenseId].push({ id: row.tagId, name: row.tagName })
      }
    }

    // Apply tag filter after loading tags
    if (filters?.tagId) {
      filteredRows = filteredRows.filter((r) =>
        (tagsByExpenseId[r.id] ?? []).some((t) => t.id === filters.tagId)
      )
    }

    const result: ExpenseWithDetails[] = filteredRows.map((r) => ({
      ...r,
      tags: tagsByExpenseId[r.id] ?? [],
    }))

    return Result.ok(result)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const getExpenseById = async (
  db: DrizzleClient,
  id: string
): Promise<Result<ExpenseWithDetails | null, Error>> => {
  try {
    const rows = await db
      .select({
        id: expense.id,
        userId: expense.userId,
        amountCents: expense.amountCents,
        date: expense.date,
        description: expense.description,
        categoryId: expense.categoryId,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
        categoryName: category.name,
      })
      .from(expense)
      .leftJoin(category, eq(expense.categoryId, category.id))
      .where(eq(expense.id, id))

    if (rows.length === 0) {
      return Result.ok(null)
    }

    const tagRows = await db
      .select({ tagId: tag.id, tagName: tag.name })
      .from(expenseTag)
      .innerJoin(tag, eq(expenseTag.tagId, tag.id))
      .where(eq(expenseTag.expenseId, id))

    const result: ExpenseWithDetails = {
      ...rows[0],
      tags: tagRows.map((t) => ({ id: t.tagId, name: t.tagName })),
    }
    return Result.ok(result)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const updateExpense = async (
  db: DrizzleClient,
  id: string,
  data: Partial<ExpenseData>
): Promise<Result<boolean, Error>> => {
  try {
    const result = await db
      .update(expense)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(expense.id, id))
    const rowsUpdated = result.meta?.changes ?? 0
    return Result.ok(rowsUpdated >= 1)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const deleteExpense = async (
  db: DrizzleClient,
  id: string
): Promise<Result<boolean, Error>> => {
  try {
    const result = await db.delete(expense).where(eq(expense.id, id))
    const rowsDeleted = result.meta?.changes ?? 0
    return Result.ok(rowsDeleted >= 1)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

// ---------------------------------------------------------------------------
// Expense-Tag linking
// ---------------------------------------------------------------------------

export const setExpenseTags = async (
  db: DrizzleClient,
  expenseId: string,
  tagIds: string[]
): Promise<Result<boolean, Error>> => {
  try {
    await db.delete(expenseTag).where(eq(expenseTag.expenseId, expenseId))
    if (tagIds.length > 0) {
      const rows = tagIds.map((tagId) => ({ expenseId, tagId }))
      await db.insert(expenseTag).values(rows)
    }
    return Result.ok(true)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

// ---------------------------------------------------------------------------
// Recurring Expense CRUD
// ---------------------------------------------------------------------------

export const createRecurringExpense = async (
  db: DrizzleClient,
  data: RecurringExpenseData
): Promise<Result<RecurringExpense, Error>> => {
  try {
    const id = crypto.randomUUID()
    const now = new Date()
    const newRecurring: NewRecurringExpense = {
      id,
      userId: data.userId,
      amountCents: data.amountCents,
      description: data.description,
      categoryId: data.categoryId ?? null,
      period: data.period,
      nextRunDate: data.nextRunDate,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    }
    await db.insert(recurringExpense).values(newRecurring)
    const rows = await db
      .select()
      .from(recurringExpense)
      .where(eq(recurringExpense.id, id))
    if (rows.length === 0) {
      return Result.err(new Error('Failed to retrieve created recurring expense'))
    }
    return Result.ok(rows[0])
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const getRecurringExpenses = async (
  db: DrizzleClient
): Promise<Result<RecurringExpense[], Error>> => {
  try {
    const rows = await db
      .select()
      .from(recurringExpense)
      .orderBy(asc(recurringExpense.nextRunDate))
    return Result.ok(rows)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const updateRecurringExpense = async (
  db: DrizzleClient,
  id: string,
  data: Partial<RecurringExpenseData>
): Promise<Result<boolean, Error>> => {
  try {
    const result = await db
      .update(recurringExpense)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(recurringExpense.id, id))
    const rowsUpdated = result.meta?.changes ?? 0
    return Result.ok(rowsUpdated >= 1)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const deleteRecurringExpense = async (
  db: DrizzleClient,
  id: string
): Promise<Result<boolean, Error>> => {
  try {
    const result = await db
      .delete(recurringExpense)
      .where(eq(recurringExpense.id, id))
    const rowsDeleted = result.meta?.changes ?? 0
    return Result.ok(rowsDeleted >= 1)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const getDueRecurringExpenses = async (
  db: DrizzleClient,
  today: string
): Promise<Result<RecurringExpense[], Error>> => {
  try {
    const rows = await db
      .select()
      .from(recurringExpense)
      .where(eq(recurringExpense.isActive, true))
    const due = rows.filter((r) => r.nextRunDate <= today)
    return Result.ok(due)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const advanceRecurringExpenseDate = async (
  db: DrizzleClient,
  id: string,
  nextDate: string
): Promise<Result<boolean, Error>> => {
  try {
    const result = await db
      .update(recurringExpense)
      .set({ nextRunDate: nextDate, updatedAt: new Date() })
      .where(eq(recurringExpense.id, id))
    const rowsUpdated = result.meta?.changes ?? 0
    return Result.ok(rowsUpdated >= 1)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}
