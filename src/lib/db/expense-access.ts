/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Read/write helpers for the `expense` table and its joins.
 * @module lib/db/expense-access
 */
import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import Result from 'true-myth/result'

import { category, expense, expenseTag, tag } from '../../db/schema'
import type { DrizzleClient } from '../../local-types'
import { withRetry } from '../db-helpers'

export interface CreateCategoryAndExpenseInput {
  newCategoryName: string
  date: string
  description: string
  amountCents: number
}

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
        }
      }),
    )
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

export interface TagRow {
  id: string
  name: string
}

/**
 * Look up tags by name (case-insensitive). Empty / whitespace-only entries
 * are silently dropped; remaining names are trimmed, lower-cased, and
 * de-duplicated before issuing a single `IN (...)` query. An empty effective
 * list short-circuits to `Result.ok([])` without querying.
 *
 * @param db - Database instance
 * @param names - Tag names to look up (any case, leading/trailing whitespace
 *   allowed)
 */
export const findTagsByNames = (
  db: DrizzleClient,
  names: string[],
): Promise<Result<TagRow[], Error>> =>
  withRetry('findTagsByNames', () => findTagsByNamesActual(db, names))

const findTagsByNamesActual = async (
  db: DrizzleClient,
  names: string[],
): Promise<Result<TagRow[], Error>> => {
  try {
    const normalized = new Set<string>()
    for (const raw of names) {
      if (typeof raw !== 'string') {
        continue
      }
      const trimmed = raw.trim().toLowerCase()
      if (trimmed.length > 0) {
        normalized.add(trimmed)
      }
    }
    if (normalized.size === 0) {
      return Result.ok([])
    }
    const list = Array.from(normalized)
    const rows = await db
      .select({ id: tag.id, name: tag.name })
      .from(tag)
      .where(inArray(sql`lower(${tag.name})`, list))
    return Result.ok(rows)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

/**
 * List all tags sorted by case-insensitive `name ASC`.
 * @param db - Database instance
 * @returns Promise<Result<TagRow[], Error>>
 */
export const listTags = (db: DrizzleClient): Promise<Result<TagRow[], Error>> =>
  withRetry('listTags', () => listTagsActual(db))

const listTagsActual = async (db: DrizzleClient): Promise<Result<TagRow[], Error>> => {
  try {
    const rows = await db
      .select({ id: tag.id, name: tag.name })
      .from(tag)
      .orderBy(asc(sql`lower(${tag.name})`))
    return Result.ok(rows)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

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
        newTagIdByName.set(lowered, crypto.randomUUID())
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
        newTagNames.set(lowered, crypto.randomUUID())
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
