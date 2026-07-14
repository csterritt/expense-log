/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Race-tolerant create-or-reuse helpers for the confirmation handlers.
 *
 * Both `createOrReuseTag` and `createOrReuseCategory` attempt to insert a
 * new row. If the DB-level unique constraint fires (another request created
 * the same name between the initial form POST and the confirmation POST), they
 * silently look up and return the already-existing row instead of propagating
 * the error. This makes the confirmation handler idempotent with respect to
 * concurrent writers — consistent with the PRD's no-per-user-ownership rule
 * where all signed-in users share the same tag and category sets.
 *
 * @module lib/db/confirm-helpers
 */

import { Result } from 'true-myth'
import { sql } from 'drizzle-orm'
import { ulid } from 'ulid'

import { category, tag } from '../../db/schema'
import type { DrizzleClient } from '../../local-types'
import { withRetry } from '../db-helpers'
import { listTags } from './tag-access'
import { findCategoryByName } from './category-access'
import { parseTagInputs, parseNewCategoryName } from '../expense-validators'

export interface CategoryRow {
  id: string
  name: string
}

export interface TagRow {
  id: string
  name: string
}

/**
 * Attempt to create a new tag with the given name. If the DB rejects the
 * insert due to the unique-lowercase index (a race with another writer),
 * look up and return the existing row instead.
 *
 * @param db - Database instance
 * @param rawName - Tag name (any case; will be trimmed and lower-cased)
 */
export const createOrReuseTag = (
  db: DrizzleClient,
  rawName: string,
): Promise<Result<TagRow, Error>> =>
  withRetry('createOrReuseTag', () => createOrReuseTagActual(db, rawName))

const createOrReuseTagActual = async (
  db: DrizzleClient,
  rawName: string,
): Promise<Result<TagRow, Error>> => {
  try {
    const name = rawName.trim().toLowerCase()
    if (name.length === 0) {
      return Result.err(new Error('Tag name is required.'))
    }

    const existing = await db
      .select({ id: tag.id, name: tag.name })
      .from(tag)
      .where(sql`lower(${tag.name}) = ${name}`)
      .limit(1)

    if (existing.length > 0) {
      return Result.ok({ id: existing[0]!.id, name: existing[0]!.name })
    }

    const id = ulid()
    const now = new Date()
    try {
      await db.insert(tag).values({ id, name, createdAt: now, updatedAt: now })
      return Result.ok({ id, name })
    } catch (insertErr) {
      const msg = insertErr instanceof Error ? insertErr.message : String(insertErr)
      if (/unique|constraint/i.test(msg)) {
        const race = await db
          .select({ id: tag.id, name: tag.name })
          .from(tag)
          .where(sql`lower(${tag.name}) = ${name}`)
          .limit(1)
        if (race.length > 0) {
          return Result.ok({ id: race[0]!.id, name: race[0]!.name })
        }
      }
      return Result.err(insertErr instanceof Error ? insertErr : new Error(msg))
    }
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

/**
 * Attempt to create a new category with the given name. If the DB rejects the
 * insert due to the unique-lowercase index (a race with another writer),
 * look up and return the existing row instead.
 *
 * @param db - Database instance
 * @param rawName - Category name (any case; will be trimmed and lower-cased)
 */
export const createOrReuseCategory = (
  db: DrizzleClient,
  rawName: string,
): Promise<Result<CategoryRow, Error>> =>
  withRetry('createOrReuseCategory', () => createOrReuseCategoryActual(db, rawName))

const createOrReuseCategoryActual = async (
  db: DrizzleClient,
  rawName: string,
): Promise<Result<CategoryRow, Error>> => {
  try {
    const name = rawName.trim().toLowerCase()
    if (name.length === 0) {
      return Result.err(new Error('Category name is required.'))
    }

    const existing = await db
      .select({ id: category.id, name: category.name })
      .from(category)
      .where(sql`lower(${category.name}) = ${name}`)
      .limit(1)

    if (existing.length > 0) {
      return Result.ok({ id: existing[0]!.id, name: existing[0]!.name })
    }

    const id = ulid()
    const now = new Date()
    try {
      await db.insert(category).values({ id, name, createdAt: now, updatedAt: now })
      return Result.ok({ id, name })
    } catch (insertErr) {
      const msg = insertErr instanceof Error ? insertErr.message : String(insertErr)
      if (/unique|constraint/i.test(msg)) {
        const race = await db
          .select({ id: category.id, name: category.name })
          .from(category)
          .where(sql`lower(${category.name}) = ${name}`)
          .limit(1)
        if (race.length > 0) {
          return Result.ok({ id: race[0]!.id, name: race[0]!.name })
        }
      }
      return Result.err(insertErr instanceof Error ? insertErr : new Error(msg))
    }
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

// ---------------------------------------------------------------------------
// Shared confirm-handler resolution pipeline
// ---------------------------------------------------------------------------

/**
 * Result type returned by `resolveConfirmTagsAndCategory`.
 */
export type ResolvedConfirmItems =
  | {
      ok: true
      existingTagIds: string[]
      newTagNames: string[]
      rawNewTagsPreserved: string
      existingCategoryId: string | null
      newCategoryName: string | null
      existingCategoryName: string | null
    }
  | { ok: false; kind: 'tag-list-error' }
  | { ok: false; kind: 'tag-input-error'; fieldErrors: Record<string, string>; rawNewTagsPreserved: string }
  | { ok: false; kind: 'category-lookup-error' }
  | { ok: false; kind: 'new-category-name-error'; message: string }

/**
 * Shared resolution pipeline for all three confirmation handlers.
 *
 * Fetches the full tag list, parses the submitted `tagId[]` + `newTags` inputs
 * via `parseTagInputs`, looks up the submitted category name, and — when the
 * category is new — validates it via `parseNewCategoryName`.
 *
 * Returns a discriminated union so the caller can handle each failure branch
 * and propagate errors to the correct redirect target without duplicating this
 * logic across handlers.
 *
 * @param db - Database client
 * @param tagIds - Submitted `tagId` values from the form
 * @param newTagsRaw - Submitted `newTags` text from the form
 * @param categoryName - Submitted category name from the form
 */
export const resolveConfirmTagsAndCategory = async (
  db: DrizzleClient,
  tagIds: string[],
  newTagsRaw: string,
  categoryName: string,
): Promise<ResolvedConfirmItems> => {
  const allTagsResult = await listTags(db)
  if (allTagsResult.isErr) {
    return { ok: false, kind: 'tag-list-error' }
  }

  const tagInputParse = parseTagInputs(
    { tagId: tagIds, newTags: newTagsRaw },
    allTagsResult.value,
  )
  if (Object.keys(tagInputParse.fieldErrors).length > 0) {
    return {
      ok: false,
      kind: 'tag-input-error',
      fieldErrors: tagInputParse.fieldErrors,
      rawNewTagsPreserved: tagInputParse.rawNewTagsPreserved,
    }
  }

  const existingTagIds = tagInputParse.tagIds
  const newTagNames = tagInputParse.newTags
  const rawNewTagsPreserved = tagInputParse.rawNewTagsPreserved

  const lookup = await findCategoryByName(db, categoryName)
  if (lookup.isErr) {
    return { ok: false, kind: 'category-lookup-error' }
  }

  if (lookup.value !== null) {
    return {
      ok: true,
      existingTagIds,
      newTagNames,
      rawNewTagsPreserved,
      existingCategoryId: lookup.value.id,
      newCategoryName: null,
      existingCategoryName: lookup.value.name,
    }
  }

  const nameCheck = parseNewCategoryName(categoryName)
  if (nameCheck.isErr) {
    return { ok: false, kind: 'new-category-name-error', message: nameCheck.error }
  }

  return {
    ok: true,
    existingTagIds,
    newTagNames,
    rawNewTagsPreserved,
    existingCategoryId: null,
    newCategoryName: nameCheck.value,
    existingCategoryName: null,
  }
}
