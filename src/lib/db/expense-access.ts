/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Read/write helpers for the `expense` table and its joins.
 * @module lib/db/expense-access
 */
import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { Result } from 'true-myth'
import { ulid } from 'ulid'

import { category, expense, expenseTag, recurring, recurringTag, tag } from '../../db/schema'
import type { DrizzleClient } from '../../local-types'
import { withRetry, toResult } from '../db-helpers'
import { todayEt } from '../et-date'
import { occurrencesToGenerate } from '../recurrence'

/**
 * Input for creating a new category and expense together
 */
export interface CreateCategoryAndExpenseInput {
  newCategoryName: string
  date: string
  description: string
  amountCents: number
}

/**
 * Expense row with category name and tag names
 */
export interface ExpenseRow {
  id: string
  date: string
  description: string
  categoryName: string
  amountCents: number
  tagNames: string[]
  recurringId: string | null
}

/**
 * Filter options for listing expenses
 */
export interface ListExpenseFilters {
  from?: string
  to?: string
  description?: string
  categoryId?: string
  tagIds?: string[]
  tagMode?: 'or' | 'and'
}

/**
 * Input for creating an expense
 */
export interface CreateExpenseInput {
  date: string
  description: string
  categoryId: string
  amountCents: number
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
    const conditions: ReturnType<typeof eq>[] = []

    if (filters.from && filters.from.length > 0) {
      conditions.push(gte(expense.date, filters.from))
    }
    if (filters.to && filters.to.length > 0) {
      conditions.push(lte(expense.date, filters.to))
    }

    const descTrimmed = typeof filters.description === 'string' ? filters.description.trim() : ''
    if (descTrimmed.length > 0) {
      conditions.push(sql`lower(${expense.description}) like lower(${'%' + descTrimmed + '%'})`)
    }

    if (filters.categoryId && filters.categoryId.length > 0) {
      conditions.push(eq(expense.categoryId, filters.categoryId))
    }

    const activeTagIds =
      Array.isArray(filters.tagIds) && filters.tagIds.length > 0 ? filters.tagIds : null

    if (activeTagIds !== null) {
      if (filters.tagMode === 'and') {
        // AND: expense must have all of the listed tags.
        // Use a subquery that finds expenses lacking any of the required tags.
        const expensesWithAllTags = db
          .select({ expenseId: expenseTag.expenseId })
          .from(expenseTag)
          .where(inArray(expenseTag.tagId, activeTagIds))
          .groupBy(expenseTag.expenseId)
          .having(sql`count(distinct ${expenseTag.tagId}) = ${activeTagIds.length}`)
        const subqueryRows = await expensesWithAllTags
        if (subqueryRows.length === 0) {
          return Result.ok([])
        }
        const matchingIds = subqueryRows.map((r) => r.expenseId)
        conditions.push(inArray(expense.id, matchingIds))
      } else {
        // OR (default): expense must have at least one of the listed tags.
        const orSubquery = db
          .select({ expenseId: expenseTag.expenseId })
          .from(expenseTag)
          .where(inArray(expenseTag.tagId, activeTagIds))
        const orRows = await orSubquery
        if (orRows.length === 0) {
          return Result.ok([])
        }
        const matchingIds = [...new Set(orRows.map((r) => r.expenseId))]
        conditions.push(inArray(expense.id, matchingIds))
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db
      .select({
        id: expense.id,
        date: expense.date,
        description: expense.description,
        amountCents: expense.amountCents,
        categoryName: category.name,
        recurringId: expense.recurringId,
      })
      .from(expense)
      .innerJoin(category, eq(category.id, expense.categoryId))
      .where(whereClause)
      .orderBy(desc(expense.date), asc(sql`lower(${expense.description})`))

    if (rows.length === 0) {
      return Result.ok([])
    }

    const tagsByExpenseId = new Map<string, string[]>()
    const expenseIds = rows.map((r) => r.id)
    const tagRows = await db
      .select({ expenseId: expenseTag.expenseId, tagName: tag.name })
      .from(expenseTag)
      .innerJoin(tag, eq(tag.id, expenseTag.tagId))
      .where(inArray(expenseTag.expenseId, expenseIds))

    for (const row of tagRows) {
      const bucket = tagsByExpenseId.get(row.expenseId)
      if (bucket) {
        bucket.push(row.tagName)
      } else {
        tagsByExpenseId.set(row.expenseId, [row.tagName])
      }
    }

    return Result.ok(
      rows.map((row) => {
        const tags = (tagsByExpenseId.get(row.id) ?? []).slice()
        tags.sort((a, b) => a.localeCompare(b))
        return {
          id: row.id,
          date: row.date,
          description: row.description,
          categoryName: row.categoryName,
          amountCents: row.amountCents,
          tagNames: tags,
          recurringId: row.recurringId ?? null,
        }
      }),
    )
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

/**
 * Atomically create a new category (lowercased after trim) and an expense
 * row referencing it.
 *
 * Both inserts are issued as a single D1 batch so a failure on either rolls
 * the other back. A unique-name collision (race against another writer)
 * surfaces as `Result.err` with a clear message; the caller is expected to
 * redirect back to the entry form with a field-level error.
 * @param db - Database instance
 * @param input - New-category name + already-validated expense fields
 */
export const createCategoryAndExpense = (
  db: DrizzleClient,
  input: CreateCategoryAndExpenseInput,
): Promise<Result<{ categoryId: string; expenseId: string }, Error>> =>
  withRetry('createCategoryAndExpense', () => createCategoryAndExpenseActual(db, input))

const createCategoryAndExpenseActual = async (
  db: DrizzleClient,
  input: CreateCategoryAndExpenseInput,
): Promise<Result<{ categoryId: string; expenseId: string }, Error>> => {
  try {
    const normalizedName = input.newCategoryName.trim().toLowerCase()
    if (normalizedName.length === 0) {
      return Result.err(new Error('Category name is required.'))
    }

    const categoryId = crypto.randomUUID()
    const expenseId = crypto.randomUUID()
    const now = new Date()

    await db.batch([
      db.insert(category).values({
        id: categoryId,
        name: normalizedName,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(expense).values({
        id: expenseId,
        description: input.description,
        amountCents: input.amountCents,
        categoryId,
        date: input.date,
        createdAt: now,
        updatedAt: now,
      }),
    ])

    return Result.ok({ categoryId, expenseId })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (/unique|constraint/i.test(message)) {
      return Result.err(
        new Error(`A category named "${input.newCategoryName.trim()}" already exists.`),
      )
    }
    return Result.err(e instanceof Error ? e : new Error(message))
  }
}

/**
 * Input for creating an expense with tags
 */
export interface CreateExpenseWithTagsInput {
  date: string
  description: string
  categoryId: string
  amountCents: number
  tagIds: string[]
}

/**
 * Create an expense row plus its `expenseTag` links in a single batch.
 * Duplicate tag ids in `tagIds` are silently de-duplicated.
 */
export const createExpenseWithTags = (
  db: DrizzleClient,
  input: CreateExpenseWithTagsInput,
): Promise<Result<{ id: string }, Error>> =>
  withRetry('createExpenseWithTags', () => createExpenseWithTagsActual(db, input))

const createExpenseWithTagsActual = async (
  db: DrizzleClient,
  input: CreateExpenseWithTagsInput,
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
    const uniqueTagIds = Array.from(new Set(input.tagIds))

    const insertExpense = db.insert(expense).values({
      id,
      description: input.description,
      amountCents: input.amountCents,
      categoryId: input.categoryId,
      date: input.date,
      createdAt: now,
      updatedAt: now,
    })

    if (uniqueTagIds.length === 0) {
      await insertExpense
    } else {
      const statements: unknown[] = [insertExpense]
      for (const tagId of uniqueTagIds) {
        statements.push(db.insert(expenseTag).values({ expenseId: id, tagId }))
      }
      // D1 batch is atomic — the whole set succeeds or rolls back.
      await db.batch(statements as never)
    }
    return Result.ok({ id })
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

/**
 * Expense detail row with category ID and tag IDs
 */
export interface ExpenseDetailRow extends ExpenseRow {
  categoryId: string
  tagIds: string[]
}

/**
 * Look up a single expense by id, including its category name + id and the
 * full alphabetized tag list (names + ids). Returns `Result.ok(null)` when no
 * row matches.
 */
export const getExpenseById = (
  db: DrizzleClient,
  id: string,
): Promise<Result<ExpenseDetailRow | null, Error>> =>
  withRetry('getExpenseById', () => getExpenseByIdActual(db, id))

const getExpenseByIdActual = async (
  db: DrizzleClient,
  id: string,
): Promise<Result<ExpenseDetailRow | null, Error>> => {
  try {
    if (typeof id !== 'string' || id.length === 0) {
      return Result.ok(null)
    }
    const rows = await db
      .select({
        id: expense.id,
        date: expense.date,
        description: expense.description,
        amountCents: expense.amountCents,
        categoryId: expense.categoryId,
        categoryName: category.name,
      })
      .from(expense)
      .innerJoin(category, eq(category.id, expense.categoryId))
      .where(eq(expense.id, id))
      .limit(1)
    if (rows.length === 0) {
      return Result.ok(null)
    }
    const row = rows[0]
    const tagRows = await db
      .select({ id: tag.id, name: tag.name })
      .from(expenseTag)
      .innerJoin(tag, eq(tag.id, expenseTag.tagId))
      .where(eq(expenseTag.expenseId, id))
    const sorted = tagRows.slice().sort((a, b) => a.name.localeCompare(b.name))
    return Result.ok({
      id: row.id,
      date: row.date,
      description: row.description,
      amountCents: row.amountCents,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      tagIds: sorted.map((r) => r.id),
      tagNames: sorted.map((r) => r.name),
    })
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

/**
 * Input for updating an expense with tags
 */
export interface UpdateExpenseWithTagsInput {
  id: string
  date: string
  description: string
  categoryId: string
  amountCents: number
  tagIds: string[]
}

/**
 * Update an existing expense row's mutable fields and replace its
 * `expenseTag` link set with the supplied `tagIds`. Duplicate ids in
 * `tagIds` are silently de-duplicated. Returns `Result.err` when the
 * expense does not exist.
 */
export const updateExpenseWithTags = (
  db: DrizzleClient,
  input: UpdateExpenseWithTagsInput,
): Promise<Result<{ id: string }, Error>> =>
  withRetry('updateExpenseWithTags', () => updateExpenseWithTagsActual(db, input))

const updateExpenseWithTagsActual = async (
  db: DrizzleClient,
  input: UpdateExpenseWithTagsInput,
): Promise<Result<{ id: string }, Error>> => {
  try {
    const found = await db
      .select({ id: expense.id })
      .from(expense)
      .where(eq(expense.id, input.id))
      .limit(1)
    if (found.length === 0) {
      return Result.err(new Error('Expense not found.'))
    }
    const catFound = await db
      .select({ id: category.id })
      .from(category)
      .where(eq(category.id, input.categoryId))
      .limit(1)
    if (catFound.length === 0) {
      return Result.err(new Error(`Category not found: ${input.categoryId}`))
    }

    const now = new Date()
    const uniqueTagIds = Array.from(new Set(input.tagIds))

    const statements: unknown[] = [
      db
        .update(expense)
        .set({
          description: input.description,
          amountCents: input.amountCents,
          categoryId: input.categoryId,
          date: input.date,
          updatedAt: now,
        })
        .where(eq(expense.id, input.id)),
      db.delete(expenseTag).where(eq(expenseTag.expenseId, input.id)),
    ]
    for (const tagId of uniqueTagIds) {
      statements.push(db.insert(expenseTag).values({ expenseId: input.id, tagId }))
    }
    await db.batch(statements as never)
    return Result.ok({ id: input.id })
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

/**
 * Input for updating an expense with optional new category and tags
 */
export interface UpdateManyAndExpenseInput {
  id: string
  newCategoryName: string | null
  existingCategoryId: string | null
  newTagNames: string[]
  existingTagIds: string[]
  date: string
  description: string
  amountCents: number
}

/**
 * Atomically (single D1 batch) create zero-or-one new category, zero-or-more
 * new tags, update the existing expense row, and replace its `expenseTag`
 * link set with the combined existing + newly-created tag ids. Exactly one
 * of `newCategoryName` / `existingCategoryId` must be supplied. Names are
 * lower-cased after trim before insert. A unique-name collision rolls
 * everything back.
 */
export const updateManyAndExpense = (
  db: DrizzleClient,
  input: UpdateManyAndExpenseInput,
): Promise<Result<{ id: string; categoryId: string; createdTagIds: string[] }, Error>> =>
  withRetry('updateManyAndExpense', () => updateManyAndExpenseActual(db, input))

const updateManyAndExpenseActual = async (
  db: DrizzleClient,
  input: UpdateManyAndExpenseInput,
): Promise<Result<{ id: string; categoryId: string; createdTagIds: string[] }, Error>> => {
  try {
    const hasNewCategory =
      typeof input.newCategoryName === 'string' && input.newCategoryName.trim().length > 0
    const hasExistingCategory =
      typeof input.existingCategoryId === 'string' && input.existingCategoryId.length > 0
    if (hasNewCategory && hasExistingCategory) {
      return Result.err(new Error('Provide exactly one of newCategoryName or existingCategoryId.'))
    }
    if (!hasNewCategory && !hasExistingCategory) {
      return Result.err(new Error('Provide exactly one of newCategoryName or existingCategoryId.'))
    }

    const found = await db
      .select({ id: expense.id })
      .from(expense)
      .where(eq(expense.id, input.id))
      .limit(1)
    if (found.length === 0) {
      return Result.err(new Error('Expense not found.'))
    }

    const now = new Date()
    let categoryId: string
    const statements: unknown[] = []

    if (hasNewCategory) {
      categoryId = crypto.randomUUID()
      const normalizedCat = (input.newCategoryName as string).trim().toLowerCase()
      statements.push(
        db.insert(category).values({
          id: categoryId,
          name: normalizedCat,
          createdAt: now,
          updatedAt: now,
        }),
      )
    } else {
      categoryId = input.existingCategoryId as string
    }

    const newTagIdByName = new Map<string, string>()
    for (const raw of input.newTagNames) {
      if (typeof raw !== 'string') {
        continue
      }
      const lowered = raw.trim().toLowerCase()
      if (lowered.length === 0) {
        continue
      }
      if (!newTagIdByName.has(lowered)) {
        newTagIdByName.set(lowered, ulid())
      }
    }
    const createdTagIds: string[] = []
    for (const [name, id] of newTagIdByName.entries()) {
      createdTagIds.push(id)
      statements.push(db.insert(tag).values({ id, name, createdAt: now, updatedAt: now }))
    }

    statements.push(
      db
        .update(expense)
        .set({
          description: input.description,
          amountCents: input.amountCents,
          categoryId,
          date: input.date,
          updatedAt: now,
        })
        .where(eq(expense.id, input.id)),
    )
    statements.push(db.delete(expenseTag).where(eq(expenseTag.expenseId, input.id)))

    const allTagIds = Array.from(new Set([...input.existingTagIds, ...createdTagIds]))
    for (const tagId of allTagIds) {
      statements.push(db.insert(expenseTag).values({ expenseId: input.id, tagId }))
    }

    await db.batch(statements as never)

    return Result.ok({ id: input.id, categoryId, createdTagIds })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (/unique|constraint/i.test(message)) {
      return Result.err(
        new Error('One of the new names collides with an existing row. Please try again.'),
      )
    }
    return Result.err(e instanceof Error ? e : new Error(message))
  }
}

/**
 * Delete an expense row by id. The `ON DELETE CASCADE` on `expenseTag`
 * cleans up its link rows automatically. Returns `Result.err` when the row
 * does not exist.
 */
export const deleteExpense = (db: DrizzleClient, id: string): Promise<Result<void, Error>> =>
  withRetry('deleteExpense', () => deleteExpenseActual(db, id))

const deleteExpenseActual = async (db: DrizzleClient, id: string): Promise<Result<void, Error>> => {
  try {
    const found = await db
      .select({ id: expense.id })
      .from(expense)
      .where(eq(expense.id, id))
      .limit(1)
    if (found.length === 0) {
      return Result.err(new Error('Expense not found.'))
    }
    await db.delete(expense).where(eq(expense.id, id))
    return Result.ok(undefined as unknown as void)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

/**
 * Input for creating an expense with optional new category and tags
 */
export interface CreateManyAndExpenseInput {
  newCategoryName: string | null
  existingCategoryId: string | null
  newTagNames: string[]
  existingTagIds: string[]
  date: string
  description: string
  amountCents: number
}

/**
 * Atomically create zero-or-one new category, zero-or-more new tags, the
 * expense row, and the `expenseTag` links — all in a single D1 batch so any
 * unique-name collision rolls everything back. Names are lower-cased after
 * trim before insert. Exactly one of `newCategoryName` / `existingCategoryId`
 * must be supplied.
 */
export const createManyAndExpense = (
  db: DrizzleClient,
  input: CreateManyAndExpenseInput,
): Promise<Result<{ categoryId: string; expenseId: string; createdTagIds: string[] }, Error>> =>
  withRetry('createManyAndExpense', () => createManyAndExpenseActual(db, input))

const createManyAndExpenseActual = async (
  db: DrizzleClient,
  input: CreateManyAndExpenseInput,
): Promise<Result<{ categoryId: string; expenseId: string; createdTagIds: string[] }, Error>> => {
  try {
    const hasNewCategory =
      typeof input.newCategoryName === 'string' && input.newCategoryName.trim().length > 0
    const hasExistingCategory =
      typeof input.existingCategoryId === 'string' && input.existingCategoryId.length > 0
    if (hasNewCategory && hasExistingCategory) {
      return Result.err(new Error('Provide exactly one of newCategoryName or existingCategoryId.'))
    }
    if (!hasNewCategory && !hasExistingCategory) {
      return Result.err(new Error('Provide exactly one of newCategoryName or existingCategoryId.'))
    }

    const now = new Date()
    const expenseId = crypto.randomUUID()

    let categoryId: string
    const statements: unknown[] = []

    if (hasNewCategory) {
      categoryId = crypto.randomUUID()
      const normalizedCat = (input.newCategoryName as string).trim().toLowerCase()
      statements.push(
        db.insert(category).values({
          id: categoryId,
          name: normalizedCat,
          createdAt: now,
          updatedAt: now,
        }),
      )
    } else {
      categoryId = input.existingCategoryId as string
    }

    // De-duplicate new tag names by lower-cased trim.
    const newTagNames = new Map<string, string>() // lowered -> id
    for (const raw of input.newTagNames) {
      if (typeof raw !== 'string') {
        continue
      }
      const lowered = raw.trim().toLowerCase()
      if (lowered.length === 0) {
        continue
      }
      if (!newTagNames.has(lowered)) {
        newTagNames.set(lowered, ulid())
      }
    }
    const createdTagIds: string[] = []
    for (const [name, id] of newTagNames.entries()) {
      createdTagIds.push(id)
      statements.push(db.insert(tag).values({ id, name, createdAt: now, updatedAt: now }))
    }

    statements.push(
      db.insert(expense).values({
        id: expenseId,
        description: input.description,
        amountCents: input.amountCents,
        categoryId,
        date: input.date,
        createdAt: now,
        updatedAt: now,
      }),
    )

    // Combine existing + new tag ids, de-duplicated, and link each.
    const allTagIds = Array.from(new Set([...input.existingTagIds, ...createdTagIds]))
    for (const tagId of allTagIds) {
      statements.push(db.insert(expenseTag).values({ expenseId, tagId }))
    }

    await db.batch(statements as never)

    return Result.ok({ categoryId, expenseId, createdTagIds })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (/unique|constraint/i.test(message)) {
      return Result.err(
        new Error('One of the new names collides with an existing row. Please try again.'),
      )
    }
    return Result.err(e instanceof Error ? e : new Error(message))
  }
}

// ============================================================
// Recurring template helpers (Tasks 3, 5, 7, 9, 11)
// ============================================================

/**
 * Recurring template row as returned by list / get helpers.
 */
export interface RecurringRow {
  id: string
  description: string
  amountCents: number
  categoryId: string
  categoryName: string
  recurrence: string
  anchorDate: string
  tagIds: string[]
  tagNames: string[]
}

/**
 * List all recurring templates, sorted by description ascending
 * (case-insensitive). Each row includes the joined category name and an
 * alphabetized list of associated tag names and ids.
 */
export const listRecurring = (db: DrizzleClient): Promise<Result<RecurringRow[], Error>> =>
  withRetry('listRecurring', () => listRecurringActual(db))

const listRecurringActual = async (db: DrizzleClient): Promise<Result<RecurringRow[], Error>> => {
  try {
    const rows = await db
      .select({
        id: recurring.id,
        description: recurring.description,
        amountCents: recurring.amountCents,
        categoryId: recurring.categoryId,
        categoryName: category.name,
        recurrence: recurring.recurrence,
        anchorDate: recurring.anchorDate,
      })
      .from(recurring)
      .innerJoin(category, eq(category.id, recurring.categoryId))
      .orderBy(asc(sql`lower(${recurring.description})`))

    if (rows.length === 0) {
      return Result.ok([])
    }

    const recurringIds = rows.map((r) => r.id)
    const tagRows = await db
      .select({ recurringId: recurringTag.recurringId, tagId: tag.id, tagName: tag.name })
      .from(recurringTag)
      .innerJoin(tag, eq(tag.id, recurringTag.tagId))
      .where(inArray(recurringTag.recurringId, recurringIds))

    const tagsByRecurringId = new Map<string, { id: string; name: string }[]>()
    for (const row of tagRows) {
      const bucket = tagsByRecurringId.get(row.recurringId)
      if (bucket) {
        bucket.push({ id: row.tagId, name: row.tagName })
      } else {
        tagsByRecurringId.set(row.recurringId, [{ id: row.tagId, name: row.tagName }])
      }
    }

    return Result.ok(
      rows.map((row) => {
        const tags = (tagsByRecurringId.get(row.id) ?? []).slice()
        tags.sort((a, b) => a.name.localeCompare(b.name))
        return {
          id: row.id,
          description: row.description,
          amountCents: row.amountCents,
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          recurrence: row.recurrence,
          anchorDate: row.anchorDate,
          tagIds: tags.map((t) => t.id),
          tagNames: tags.map((t) => t.name),
        }
      }),
    )
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

/**
 * Look up a single recurring template by id, including its category name / id
 * and alphabetized tag list. Returns `Result.ok(null)` when no row matches.
 */
export const getRecurringById = (
  db: DrizzleClient,
  id: string,
): Promise<Result<RecurringRow | null, Error>> =>
  withRetry('getRecurringById', () => getRecurringByIdActual(db, id))

const getRecurringByIdActual = async (
  db: DrizzleClient,
  id: string,
): Promise<Result<RecurringRow | null, Error>> => {
  try {
    if (typeof id !== 'string' || id.length === 0) {
      return Result.ok(null)
    }
    const rows = await db
      .select({
        id: recurring.id,
        description: recurring.description,
        amountCents: recurring.amountCents,
        categoryId: recurring.categoryId,
        categoryName: category.name,
        recurrence: recurring.recurrence,
        anchorDate: recurring.anchorDate,
      })
      .from(recurring)
      .innerJoin(category, eq(category.id, recurring.categoryId))
      .where(eq(recurring.id, id))
      .limit(1)

    if (rows.length === 0) {
      return Result.ok(null)
    }
    const row = rows[0]
    const tagRows = await db
      .select({ id: tag.id, name: tag.name })
      .from(recurringTag)
      .innerJoin(tag, eq(tag.id, recurringTag.tagId))
      .where(eq(recurringTag.recurringId, id))
    const sorted = tagRows.slice().sort((a, b) => a.name.localeCompare(b.name))
    return Result.ok({
      id: row.id,
      description: row.description,
      amountCents: row.amountCents,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      recurrence: row.recurrence,
      anchorDate: row.anchorDate,
      tagIds: sorted.map((r) => r.id),
      tagNames: sorted.map((r) => r.name),
    })
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

/**
 * Input for creating a recurring template with existing tags
 */
export interface CreateRecurringWithTagsInput {
  description: string
  amountCents: number
  categoryId: string
  recurrence: string
  anchorDate: string
  tagIds: string[]
}

/**
 * Create a recurring template row plus its `recurringTag` links in a single
 * batch. Duplicate tag ids in `tagIds` are silently de-duplicated.
 */
export const createRecurringWithTags = (
  db: DrizzleClient,
  input: CreateRecurringWithTagsInput,
): Promise<Result<{ id: string }, Error>> =>
  withRetry('createRecurringWithTags', () => createRecurringWithTagsActual(db, input))

const createRecurringWithTagsActual = async (
  db: DrizzleClient,
  input: CreateRecurringWithTagsInput,
): Promise<Result<{ id: string }, Error>> => {
  try {
    const id = crypto.randomUUID()
    const now = new Date()
    const uniqueTagIds = Array.from(new Set(input.tagIds))

    const insertRecurring = db.insert(recurring).values({
      id,
      description: input.description,
      amountCents: input.amountCents,
      categoryId: input.categoryId,
      recurrence: input.recurrence,
      anchorDate: input.anchorDate,
      createdAt: now,
      updatedAt: now,
    })

    if (uniqueTagIds.length === 0) {
      await insertRecurring
    } else {
      const statements: unknown[] = [insertRecurring]
      for (const tagId of uniqueTagIds) {
        statements.push(db.insert(recurringTag).values({ recurringId: id, tagId }))
      }
      await db.batch(statements as never)
    }
    return Result.ok({ id })
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

/**
 * Input for creating a recurring template with optional new category / tags
 */
export interface CreateManyAndRecurringInput {
  newCategoryName: string | null
  existingCategoryId: string | null
  newTagNames: string[]
  existingTagIds: string[]
  description: string
  amountCents: number
  recurrence: string
  anchorDate: string
}

/**
 * Atomically create zero-or-one new category, zero-or-more new tags, the
 * recurring template row, and the `recurringTag` links — all in a single D1
 * batch so any unique-name collision rolls everything back. Names are
 * lower-cased after trim before insert. Exactly one of `newCategoryName` /
 * `existingCategoryId` must be supplied.
 */
export const createManyAndRecurring = (
  db: DrizzleClient,
  input: CreateManyAndRecurringInput,
): Promise<Result<{ categoryId: string; recurringId: string; createdTagIds: string[] }, Error>> =>
  withRetry('createManyAndRecurring', () => createManyAndRecurringActual(db, input))

const createManyAndRecurringActual = async (
  db: DrizzleClient,
  input: CreateManyAndRecurringInput,
): Promise<Result<{ categoryId: string; recurringId: string; createdTagIds: string[] }, Error>> => {
  try {
    const hasNewCategory =
      typeof input.newCategoryName === 'string' && input.newCategoryName.trim().length > 0
    const hasExistingCategory =
      typeof input.existingCategoryId === 'string' && input.existingCategoryId.length > 0
    if (hasNewCategory && hasExistingCategory) {
      return Result.err(new Error('Provide exactly one of newCategoryName or existingCategoryId.'))
    }
    if (!hasNewCategory && !hasExistingCategory) {
      return Result.err(new Error('Provide exactly one of newCategoryName or existingCategoryId.'))
    }

    const now = new Date()
    const recurringId = crypto.randomUUID()
    let categoryId: string
    const statements: unknown[] = []

    if (hasNewCategory) {
      categoryId = crypto.randomUUID()
      const normalizedCat = (input.newCategoryName as string).trim().toLowerCase()
      statements.push(
        db.insert(category).values({
          id: categoryId,
          name: normalizedCat,
          createdAt: now,
          updatedAt: now,
        }),
      )
    } else {
      categoryId = input.existingCategoryId as string
    }

    const newTagNameMap = new Map<string, string>()
    for (const raw of input.newTagNames) {
      if (typeof raw !== 'string') {
        continue
      }
      const lowered = raw.trim().toLowerCase()
      if (lowered.length === 0) {
        continue
      }
      if (!newTagNameMap.has(lowered)) {
        newTagNameMap.set(lowered, ulid())
      }
    }
    const createdTagIds: string[] = []
    for (const [name, id] of newTagNameMap.entries()) {
      createdTagIds.push(id)
      statements.push(db.insert(tag).values({ id, name, createdAt: now, updatedAt: now }))
    }

    statements.push(
      db.insert(recurring).values({
        id: recurringId,
        description: input.description,
        amountCents: input.amountCents,
        categoryId,
        recurrence: input.recurrence,
        anchorDate: input.anchorDate,
        createdAt: now,
        updatedAt: now,
      }),
    )

    const allTagIds = Array.from(new Set([...input.existingTagIds, ...createdTagIds]))
    for (const tagId of allTagIds) {
      statements.push(db.insert(recurringTag).values({ recurringId, tagId }))
    }

    await db.batch(statements as never)

    return Result.ok({ categoryId, recurringId, createdTagIds })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (/unique|constraint/i.test(message)) {
      return Result.err(
        new Error('One of the new names collides with an existing row. Please try again.'),
      )
    }
    return Result.err(e instanceof Error ? e : new Error(message))
  }
}

/**
 * Input for updating a recurring template with existing tags
 */
export interface UpdateRecurringWithTagsInput {
  id: string
  description: string
  amountCents: number
  categoryId: string
  recurrence: string
  anchorDate: string
  tagIds: string[]
}

/**
 * Update an existing recurring template's mutable fields and replace its
 * `recurringTag` link set with the supplied `tagIds`. Duplicate ids in
 * `tagIds` are silently de-duplicated. Returns `Result.err` when the row does
 * not exist.
 *
 * This operation intentionally does NOT modify any `expense` rows that were
 * previously generated from this template (those rows are historical records
 * and must remain unchanged).
 */
export const updateRecurringWithTags = (
  db: DrizzleClient,
  input: UpdateRecurringWithTagsInput,
): Promise<Result<{ id: string }, Error>> =>
  withRetry('updateRecurringWithTags', () => updateRecurringWithTagsActual(db, input))

const updateRecurringWithTagsActual = async (
  db: DrizzleClient,
  input: UpdateRecurringWithTagsInput,
): Promise<Result<{ id: string }, Error>> => {
  try {
    const found = await db
      .select({ id: recurring.id })
      .from(recurring)
      .where(eq(recurring.id, input.id))
      .limit(1)
    if (found.length === 0) {
      return Result.err(new Error('Recurring template not found.'))
    }

    const now = new Date()
    const uniqueTagIds = Array.from(new Set(input.tagIds))

    const statements: unknown[] = [
      db
        .update(recurring)
        .set({
          description: input.description,
          amountCents: input.amountCents,
          categoryId: input.categoryId,
          recurrence: input.recurrence,
          anchorDate: input.anchorDate,
          updatedAt: now,
        })
        .where(eq(recurring.id, input.id)),
      db.delete(recurringTag).where(eq(recurringTag.recurringId, input.id)),
    ]
    for (const tagId of uniqueTagIds) {
      statements.push(db.insert(recurringTag).values({ recurringId: input.id, tagId }))
    }
    await db.batch(statements as never)
    return Result.ok({ id: input.id })
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

/**
 * Input for updating a recurring template with optional new category / tags
 */
export interface UpdateManyAndRecurringInput {
  id: string
  newCategoryName: string | null
  existingCategoryId: string | null
  newTagNames: string[]
  existingTagIds: string[]
  description: string
  amountCents: number
  recurrence: string
  anchorDate: string
}

/**
 * Atomically create zero-or-one new category, zero-or-more new tags, update
 * the existing recurring template row, and replace its `recurringTag` link
 * set — all in a single D1 batch. Names are lower-cased after trim before
 * insert. Exactly one of `newCategoryName` / `existingCategoryId` must be
 * supplied. A unique-name collision rolls everything back.
 *
 * This operation intentionally does NOT modify any `expense` rows that were
 * previously generated from this template (those rows are historical records
 * and must remain unchanged).
 */
export const updateManyAndRecurring = (
  db: DrizzleClient,
  input: UpdateManyAndRecurringInput,
): Promise<Result<{ id: string; categoryId: string; createdTagIds: string[] }, Error>> =>
  withRetry('updateManyAndRecurring', () => updateManyAndRecurringActual(db, input))

const updateManyAndRecurringActual = async (
  db: DrizzleClient,
  input: UpdateManyAndRecurringInput,
): Promise<Result<{ id: string; categoryId: string; createdTagIds: string[] }, Error>> => {
  try {
    const hasNewCategory =
      typeof input.newCategoryName === 'string' && input.newCategoryName.trim().length > 0
    const hasExistingCategory =
      typeof input.existingCategoryId === 'string' && input.existingCategoryId.length > 0
    if (hasNewCategory && hasExistingCategory) {
      return Result.err(new Error('Provide exactly one of newCategoryName or existingCategoryId.'))
    }
    if (!hasNewCategory && !hasExistingCategory) {
      return Result.err(new Error('Provide exactly one of newCategoryName or existingCategoryId.'))
    }

    const found = await db
      .select({ id: recurring.id })
      .from(recurring)
      .where(eq(recurring.id, input.id))
      .limit(1)
    if (found.length === 0) {
      return Result.err(new Error('Recurring template not found.'))
    }

    const now = new Date()
    let categoryId: string
    const statements: unknown[] = []

    if (hasNewCategory) {
      categoryId = crypto.randomUUID()
      const normalizedCat = (input.newCategoryName as string).trim().toLowerCase()
      statements.push(
        db.insert(category).values({
          id: categoryId,
          name: normalizedCat,
          createdAt: now,
          updatedAt: now,
        }),
      )
    } else {
      categoryId = input.existingCategoryId as string
    }

    const newTagIdByName = new Map<string, string>()
    for (const raw of input.newTagNames) {
      if (typeof raw !== 'string') {
        continue
      }
      const lowered = raw.trim().toLowerCase()
      if (lowered.length === 0) {
        continue
      }
      if (!newTagIdByName.has(lowered)) {
        newTagIdByName.set(lowered, ulid())
      }
    }
    const createdTagIds: string[] = []
    for (const [name, id] of newTagIdByName.entries()) {
      createdTagIds.push(id)
      statements.push(db.insert(tag).values({ id, name, createdAt: now, updatedAt: now }))
    }

    statements.push(
      db
        .update(recurring)
        .set({
          description: input.description,
          amountCents: input.amountCents,
          categoryId,
          recurrence: input.recurrence,
          anchorDate: input.anchorDate,
          updatedAt: now,
        })
        .where(eq(recurring.id, input.id)),
    )
    statements.push(db.delete(recurringTag).where(eq(recurringTag.recurringId, input.id)))

    const allTagIds = Array.from(new Set([...input.existingTagIds, ...createdTagIds]))
    for (const tagId of allTagIds) {
      statements.push(db.insert(recurringTag).values({ recurringId: input.id, tagId }))
    }

    await db.batch(statements as never)

    return Result.ok({ id: input.id, categoryId, createdTagIds })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (/unique|constraint/i.test(message)) {
      return Result.err(
        new Error('One of the new names collides with an existing row. Please try again.'),
      )
    }
    return Result.err(e instanceof Error ? e : new Error(message))
  }
}

/**
 * Delete a recurring template by id. The `ON DELETE CASCADE` on `recurringTag`
 * cleans up its tag links automatically. The `ON DELETE SET NULL` on
 * `expense.recurringId` nullifies the provenance link on past generated
 * expense rows without deleting those rows. Returns `Result.err` when the row
 * does not exist.
 */
export const deleteRecurring = (db: DrizzleClient, id: string): Promise<Result<void, Error>> =>
  withRetry('deleteRecurring', () => deleteRecurringActual(db, id))

const deleteRecurringActual = async (
  db: DrizzleClient,
  id: string,
): Promise<Result<void, Error>> => {
  try {
    const found = await db
      .select({ id: recurring.id })
      .from(recurring)
      .where(eq(recurring.id, id))
      .limit(1)
    if (found.length === 0) {
      return Result.err(new Error('Recurring template not found.'))
    }
    await db.delete(recurring).where(eq(recurring.id, id))
    return Result.ok(undefined as unknown as void)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

// ---------------------------------------------------------------------------
// Materialization helpers (Issue 14)
// ---------------------------------------------------------------------------

/**
 * Internal recurring template row type that includes the raw `createdAt`
 * timestamp. Used exclusively by the materialization helpers.
 */
interface RecurringForMaterialize extends RecurringRow {
  createdAt: Date
}

const listTemplatesForMaterializeActual = async (
  db: DrizzleClient,
): Promise<Result<RecurringForMaterialize[], Error>> => {
  return toResult(async () => {
    const rows = await db
      .select({
        id: recurring.id,
        description: recurring.description,
        amountCents: recurring.amountCents,
        categoryId: recurring.categoryId,
        categoryName: category.name,
        recurrence: recurring.recurrence,
        anchorDate: recurring.anchorDate,
        createdAt: recurring.createdAt,
      })
      .from(recurring)
      .innerJoin(category, eq(category.id, recurring.categoryId))
      .orderBy(asc(sql`lower(${recurring.description})`))

    if (rows.length === 0) {
      return []
    }

    const recurringIds = rows.map((r) => r.id)
    const tagRows = await db
      .select({ recurringId: recurringTag.recurringId, tagId: tag.id, tagName: tag.name })
      .from(recurringTag)
      .innerJoin(tag, eq(tag.id, recurringTag.tagId))
      .where(inArray(recurringTag.recurringId, recurringIds))

    const tagsByRecurringId = new Map<string, { id: string; name: string }[]>()
    for (const row of tagRows) {
      const bucket = tagsByRecurringId.get(row.recurringId)
      if (bucket) {
        bucket.push({ id: row.tagId, name: row.tagName })
      } else {
        tagsByRecurringId.set(row.recurringId, [{ id: row.tagId, name: row.tagName }])
      }
    }

    return rows.map((row) => {
      const tags = (tagsByRecurringId.get(row.id) ?? []).slice()
      tags.sort((a, b) => a.name.localeCompare(b.name))
      return {
        id: row.id,
        description: row.description,
        amountCents: row.amountCents,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        recurrence: row.recurrence,
        anchorDate: row.anchorDate,
        createdAt: row.createdAt,
        tagIds: tags.map((t) => t.id),
        tagNames: tags.map((t) => t.name),
      }
    })
  })
}

/**
 * Insert all pending occurrence rows for a single recurring template.
 *
 * For each date in `occurrencesToGenerate`, inserts one `expense` row
 * (with `recurringId` and `occurrenceDate` set) plus the corresponding
 * `expenseTag` links. A unique-index violation on `(recurringId, occurrenceDate)`
 * is treated as a no-op and counted as `skipped`; all other errors are
 * re-thrown.
 *
 * @param db - Database instance
 * @param template - Resolved recurring template with tagIds and createdAt
 * @param today - YYYY-MM-DD current date (ET-anchored, inclusive upper bound)
 * @returns Counts of newly generated and skipped (already-existing) occurrences
 */
const materializeOneRecurring = async (
  db: DrizzleClient,
  template: RecurringForMaterialize,
  today: string,
): Promise<{ generated: number; skipped: number }> => {
  const createdAtYmd = todayEt(template.createdAt)

  const lastOccurrenceRows = await db
    .select({ maxDate: sql<string | null>`max(${expense.occurrenceDate})` })
    .from(expense)
    .where(eq(expense.recurringId, template.id))

  const lastOccurrence = lastOccurrenceRows[0]?.maxDate ?? undefined

  const dates = occurrencesToGenerate({
    recurrence: template.recurrence as 'Monthly' | 'Quarterly' | 'Yearly',
    anchorDate: template.anchorDate,
    createdAt: createdAtYmd,
    lastOccurrence,
    today,
  })

  let generated = 0
  let skipped = 0
  const now = new Date()

  for (const occurrenceDate of dates) {
    const expenseId = crypto.randomUUID()

    try {
      const insertExpense = db.insert(expense).values({
        id: expenseId,
        description: template.description,
        amountCents: template.amountCents,
        categoryId: template.categoryId,
        date: occurrenceDate,
        recurringId: template.id,
        occurrenceDate,
        createdAt: now,
        updatedAt: now,
      })

      if (template.tagIds.length === 0) {
        await insertExpense
      } else {
        const statements: unknown[] = [insertExpense]
        for (const tagId of template.tagIds) {
          statements.push(db.insert(expenseTag).values({ expenseId, tagId }))
        }
        await db.batch(statements as never)
      }

      generated += 1
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      if (/unique|constraint/i.test(message)) {
        skipped += 1
        continue
      }
      throw e
    }
  }

  return { generated, skipped }
}

/**
 * Result shape for a single materialization run.
 */
export interface MaterializeRecurringResult {
  generated: number
  skipped: number
  failed: Array<{ recurringId: string; error: string }>
}

/**
 * Materialize all pending recurring expense rows across every active template.
 *
 * Algorithm:
 * 1. Load all recurring templates (with tag lists) using `withRetry`. If this
 *    step fails the entire call returns `Result.err`.
 * 2. For each template, call `materializeOneRecurring`. Per-template errors
 *    are collected into `failed` rather than propagated; remaining templates
 *    always continue.
 *
 * `withRetry` is applied **only** to the initial template-load step, not to
 * the individual inserts. Duplicate-key violations inside each insert are
 * already handled as no-ops.
 *
 * @param db - Database instance
 * @param today - YYYY-MM-DD current date (ET-anchored), used as inclusive upper
 *   bound for all occurrence calculations
 * @returns Aggregated counts and per-template error list
 */
export const materializeRecurring = async (
  db: DrizzleClient,
  today: string,
): Promise<Result<MaterializeRecurringResult, Error>> => {
  const templatesResult = await withRetry('materializeRecurring:loadTemplates', () =>
    listTemplatesForMaterializeActual(db),
  )
  if (templatesResult.isErr) {
    return templatesResult as Result<never, Error>
  }

  const templates = templatesResult.value
  let generated = 0
  let skipped = 0
  const failed: Array<{ recurringId: string; error: string }> = []

  for (const template of templates) {
    try {
      const result = await materializeOneRecurring(db, template, today)
      generated += result.generated
      skipped += result.skipped
    } catch (e) {
      failed.push({
        recurringId: template.id,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return Result.ok({ generated, skipped, failed })
}
