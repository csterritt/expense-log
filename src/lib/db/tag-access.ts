/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Read/write helpers for the `tag` table.
 * @module lib/db/tag-access
 */
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm'
import { Result } from 'true-myth'
import { ulid } from 'ulid'

import { expenseTag, recurringTag, tag } from '../../db/schema'
import type { DrizzleClient } from '../../local-types'
import { withRetry } from '../db-helpers'

export interface TagRow {
  id: string
  name: string
}

export interface RenameTagInput {
  id: string
  name: string
}

export interface MergeTagInput {
  sourceId: string
  targetId: string
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

/**
 * Look up tags by id. Unknown ids are silently omitted from the result.
 * An empty input array short-circuits to `Result.ok([])` without querying.
 *
 * @param db - Database instance
 * @param ids - Tag ids to look up
 */
export const listTagsByIds = (
  db: DrizzleClient,
  ids: string[],
): Promise<Result<TagRow[], Error>> =>
  withRetry('listTagsByIds', () => listTagsByIdsActual(db, ids))

const listTagsByIdsActual = async (
  db: DrizzleClient,
  ids: string[],
): Promise<Result<TagRow[], Error>> => {
  try {
    const unique = Array.from(new Set(ids))
    if (unique.length === 0) {
      return Result.ok([])
    }
    const rows = await db
      .select({ id: tag.id, name: tag.name })
      .from(tag)
      .where(inArray(tag.id, unique))
    return Result.ok(rows)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const createTag = (db: DrizzleClient, name: string): Promise<Result<TagRow, Error>> =>
  withRetry('createTag', () => createTagActual(db, name))

const createTagActual = async (db: DrizzleClient, name: string): Promise<Result<TagRow, Error>> => {
  try {
    const normalizedName = name.trim().toLowerCase()
    if (normalizedName.length === 0) {
      return Result.err(new Error('Tag name is required.'))
    }
    const existing = await db
      .select({ id: tag.id, name: tag.name })
      .from(tag)
      .where(sql`lower(${tag.name}) = lower(${normalizedName})`)
      .limit(1)
    if (existing.length > 0) {
      return Result.err(new Error(`A tag named "${normalizedName}" already exists.`))
    }
    const id = ulid()
    const now = new Date()
    await db.insert(tag).values({ id, name: normalizedName, createdAt: now, updatedAt: now })
    return Result.ok({ id, name: normalizedName })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (/unique|constraint/i.test(message)) {
      return Result.err(new Error(`A tag named "${name.trim().toLowerCase()}" already exists.`))
    }
    return Result.err(e instanceof Error ? e : new Error(message))
  }
}

export const renameTag = (
  db: DrizzleClient,
  input: RenameTagInput,
): Promise<Result<TagRow, Error>> =>
  withRetry('renameTag', () => renameTagActual(db, input))

const renameTagActual = async (
  db: DrizzleClient,
  input: RenameTagInput,
): Promise<Result<TagRow, Error>> => {
  try {
    const normalizedName = input.name.trim().toLowerCase()
    if (normalizedName.length === 0) {
      return Result.err(new Error('Tag name is required.'))
    }
    const rows = await db
      .select({ id: tag.id, name: tag.name })
      .from(tag)
      .where(eq(tag.id, input.id))
      .limit(1)
    if (rows.length === 0) {
      return Result.err(new Error('Tag not found.'))
    }
    const duplicate = await db
      .select({ id: tag.id, name: tag.name })
      .from(tag)
      .where(and(sql`lower(${tag.name}) = lower(${normalizedName})`, ne(tag.id, input.id)))
      .limit(1)
    if (duplicate.length > 0) {
      return Result.err(new Error(`A tag named "${normalizedName}" already exists.`))
    }
    const now = new Date()
    await db.update(tag).set({ name: normalizedName, updatedAt: now }).where(eq(tag.id, input.id))
    return Result.ok({ id: input.id, name: normalizedName })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (/unique|constraint/i.test(message)) {
      return Result.err(
        new Error(`A tag named "${input.name.trim().toLowerCase()}" already exists.`),
      )
    }
    return Result.err(e instanceof Error ? e : new Error(message))
  }
}

const countExpensesForTag = async (db: DrizzleClient, tagId: string): Promise<number> => {
  const rows = await db
    .select({ count: sql<number>`count(distinct ${expenseTag.expenseId})` })
    .from(expenseTag)
    .where(eq(expenseTag.tagId, tagId))
  return Number(rows[0]?.count ?? 0)
}

export const countTagExpenses = (
  db: DrizzleClient,
  tagId: string,
): Promise<Result<number, Error>> =>
  withRetry('countTagExpenses', () => countTagExpensesActual(db, tagId))

const countTagExpensesActual = async (
  db: DrizzleClient,
  tagId: string,
): Promise<Result<number, Error>> => {
  try {
    return Result.ok(await countExpensesForTag(db, tagId))
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const mergeTag = (
  db: DrizzleClient,
  input: MergeTagInput,
): Promise<Result<{ reassignedExpenseCount: number }, Error>> =>
  withRetry('mergeTag', () => mergeTagActual(db, input))

const mergeTagActual = async (
  db: DrizzleClient,
  input: MergeTagInput,
): Promise<Result<{ reassignedExpenseCount: number }, Error>> => {
  try {
    if (input.sourceId === input.targetId) {
      return Result.err(new Error('Choose two different tags.'))
    }
    const rows = await db
      .select({ id: tag.id })
      .from(tag)
      .where(inArray(tag.id, [input.sourceId, input.targetId]))
    const ids = new Set(rows.map((row) => row.id))
    if (!ids.has(input.sourceId)) {
      return Result.err(new Error('Source tag not found.'))
    }
    if (!ids.has(input.targetId)) {
      return Result.err(new Error('Target tag not found.'))
    }

    const reassignedExpenseCount = await countExpensesForTag(db, input.sourceId)

    // Find expenseTag rows that already reference the target (would collide on merge).
    const alreadyTargetRows = await db
      .select({ expenseId: expenseTag.expenseId })
      .from(expenseTag)
      .where(eq(expenseTag.tagId, input.targetId))
    const alreadyTargetExpenseIds = new Set(alreadyTargetRows.map((r) => r.expenseId))

    // Find expenseTag rows for source that would NOT collide.
    const sourceRows = await db
      .select({ expenseId: expenseTag.expenseId })
      .from(expenseTag)
      .where(eq(expenseTag.tagId, input.sourceId))
    const nonCollidingExpenseIds = sourceRows
      .map((r) => r.expenseId)
      .filter((id) => !alreadyTargetExpenseIds.has(id))

    const now = new Date()
    const statements: unknown[] = []

    // Repoint non-colliding rows to the target tag.
    if (nonCollidingExpenseIds.length > 0) {
      statements.push(
        db
          .update(expenseTag)
          .set({ tagId: input.targetId })
          .where(
            and(
              eq(expenseTag.tagId, input.sourceId),
              inArray(expenseTag.expenseId, nonCollidingExpenseIds),
            ),
          ),
      )
    }

    // Delete remaining source expenseTag rows (those that would collide — duplicates of target).
    statements.push(
      db.delete(expenseTag).where(eq(expenseTag.tagId, input.sourceId)),
    )

    // Repoint recurringTag rows (no dedupe needed — recurring templates are less likely to
    // already hold both tags, but handle it defensively the same way).
    const alreadyTargetRecurringRows = await db
      .select({ recurringId: recurringTag.recurringId })
      .from(recurringTag)
      .where(eq(recurringTag.tagId, input.targetId))
    const alreadyTargetRecurringIds = new Set(
      alreadyTargetRecurringRows.map((r) => r.recurringId),
    )
    const sourceRecurringRows = await db
      .select({ recurringId: recurringTag.recurringId })
      .from(recurringTag)
      .where(eq(recurringTag.tagId, input.sourceId))
    const nonCollidingRecurringIds = sourceRecurringRows
      .map((r) => r.recurringId)
      .filter((id) => !alreadyTargetRecurringIds.has(id))

    if (nonCollidingRecurringIds.length > 0) {
      statements.push(
        db
          .update(recurringTag)
          .set({ tagId: input.targetId })
          .where(
            and(
              eq(recurringTag.tagId, input.sourceId),
              inArray(recurringTag.recurringId, nonCollidingRecurringIds),
            ),
          ),
      )
    }
    statements.push(db.delete(recurringTag).where(eq(recurringTag.tagId, input.sourceId)))

    // Update source tag timestamp before deletion (noop — just delete it).
    statements.push(db.delete(tag).where(eq(tag.id, input.sourceId)))

    // Touch the target tag's updatedAt.
    statements.push(db.update(tag).set({ updatedAt: now }).where(eq(tag.id, input.targetId)))

    await db.batch(statements as never)
    return Result.ok({ reassignedExpenseCount })
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const deleteTag = (db: DrizzleClient, id: string): Promise<Result<void, Error>> =>
  withRetry('deleteTag', () => deleteTagActual(db, id))

const deleteTagActual = async (db: DrizzleClient, id: string): Promise<Result<void, Error>> => {
  try {
    const found = await db.select({ id: tag.id }).from(tag).where(eq(tag.id, id)).limit(1)
    if (found.length === 0) {
      return Result.err(new Error('Tag not found.'))
    }
    const expenseCount = await countExpensesForTag(db, id)
    if (expenseCount > 0) {
      return Result.err(
        new Error(
          `${expenseCount} ${
            expenseCount === 1 ? 'expense references' : 'expenses reference'
          } this tag.`,
        ),
      )
    }
    await db.delete(tag).where(eq(tag.id, id))
    return Result.ok(undefined as unknown as void)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}
