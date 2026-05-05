# Issue 10 Tag Management Page Code Walkthrough

*2026-05-05T20:01:35Z by Showboat 0.6.1*
<!-- showboat-id: dc0a3088-0731-447c-ad26-b4bc1c94eb14 -->

This walkthrough documents the Issue 10 tag management implementation. It covers the tag schema, HTTP-agnostic validators, repository helpers, /tags route, unit tests, Playwright tests, and wiki updates.

```bash
git diff --name-only -- src/lib/expense-validators.ts src/lib/db/expense-access.ts src/routes/build-tags.tsx tests/expense-validators.spec.ts tests/expense-access.spec.ts e2e-tests/expenses/13-tag-management.spec.ts Notes/wiki | sort
```

```output
Notes/wiki/e2e-tests.md
Notes/wiki/log.md
Notes/wiki/source-code.md
Notes/wiki/src/lib/db/expense-access.md
Notes/wiki/src/lib/expense-validators.md
Notes/wiki/src/routes/build-tags.md
Notes/wiki/tests/expense-access.spec.md
Notes/wiki/tests/expense-validators.spec.md
Notes/wiki/unit-tests.md
```

## Schema

The tag table was already present in the schema from Issues 05/06 (tag names, expenseTag join, recurringTag join). Issue 10 requires no new schema changes — it builds management helpers on top of the existing tables. The tag table has a lower-name unique index (tag_name_lower_unique) mirroring the category table pattern.

```bash
sed -n '100,190p' src/db/schema.ts
```

```output

/**
 * Tag table schema definition
 */
export const tag = sqliteTable(
  'tag',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
  },
  (table) => [uniqueIndex('tag_name_lower_unique').on(sql`lower(${table.name})`)],
)

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
```

## Validators

The tag-management validators mirror the category-management pattern from Issue 09. They are HTTP-agnostic: trim input, enforce required IDs and maximum tag-name length (tagNameMax), normalize names to lowercase, and return field-level FieldErrors compatible with the form-state cookie flow.

```bash
sed -n '370,484p' src/lib/expense-validators.ts
```

```output
// ---------- Tag management (Issue 10) ----------

export type RawTagCreate = {
  name: string
}

export type ParsedTagCreate = {
  name: string
}

export type RawTagRename = {
  id: string
  name: string
}

export type ParsedTagRename = {
  id: string
  name: string
}

export type RawTagMergeConfirm = {
  sourceId: string
  targetId: string
}

export type ParsedTagMergeConfirm = {
  sourceId: string
  targetId: string
}

export type RawTagDelete = {
  id: string
}

export type ParsedTagDelete = {
  id: string
}

export const TagManagementNameSchema = pipe(
  string('Tag name is required.'),
  custom<string>((v) => typeof v === 'string' && v.trim().length > 0, 'Tag name is required.'),
  custom<string>(
    (v) => typeof v === 'string' && v.trim().length <= tagNameMax,
    `Tag name must be at most ${tagNameMax} characters.`,
  ),
)

const parseTagManagementName = (input: unknown): Result<string, string> => {
  const value = typeof input === 'string' ? input.trim() : ''
  const message = firstIssueMessage(TagManagementNameSchema, value)
  if (message) {
    return Result.err(message)
  }
  return Result.ok(value.toLowerCase())
}

export const parseTagCreate = (raw: RawTagCreate): Result<ParsedTagCreate, FieldErrors> => {
  const name = parseTagManagementName(raw.name)
  if (name.isErr) {
    return Result.err({ name: name.error })
  }
  return Result.ok({ name: name.value })
}

export const parseTagRename = (raw: RawTagRename): Result<ParsedTagRename, FieldErrors> => {
  const errors: FieldErrors = {}
  const id = parseRequiredId(raw.id, 'Tag is required.')
  if (id.isErr) {
    errors.id = id.error
  }
  const name = parseTagManagementName(raw.name)
  if (name.isErr) {
    errors.name = name.error
  }
  if (Object.keys(errors).length > 0) {
    return Result.err(errors)
  }
  if (id.isErr || name.isErr) {
    return Result.err(errors)
  }
  return Result.ok({ id: id.value, name: name.value })
}

export const parseTagMergeConfirm = (
  raw: RawTagMergeConfirm,
): Result<ParsedTagMergeConfirm, FieldErrors> => {
  const errors: FieldErrors = {}
  const sourceId = parseRequiredId(raw.sourceId, 'Source tag is required.')
  if (sourceId.isErr) {
    errors.sourceId = sourceId.error
  }
  const targetId = parseRequiredId(raw.targetId, 'Target tag is required.')
  if (targetId.isErr) {
    errors.targetId = targetId.error
  }
  if (sourceId.isOk && targetId.isOk && sourceId.value === targetId.value) {
    errors.targetId = 'Choose two different tags.'
  }
  if (Object.keys(errors).length > 0) {
    return Result.err(errors)
  }
  if (sourceId.isErr || targetId.isErr) {
    return Result.err(errors)
  }
  return Result.ok({ sourceId: sourceId.value, targetId: targetId.value })
}

export const parseTagDelete = (raw: RawTagDelete): Result<ParsedTagDelete, FieldErrors> => {
  const id = parseRequiredId(raw.id, 'Tag is required.')
  if (id.isErr) {
    return Result.err({ id: id.error })
  }
  return Result.ok({ id: id.value })
}

```

## Repository helpers

Issue 10 adds five tag repository helpers to expense-access.ts. createTag and renameTag mirror their category counterparts exactly. countTagExpenses queries the expenseTag join table (not a direct FK). deleteTag blocks on any expenseTag reference. mergeTag is the most complex: it deduplicates expenseTag rows before the atomic batch.

```bash
sed -n '1018,1115p' src/lib/db/expense-access.ts
```

```output
export interface RenameTagInput {
  id: string
  name: string
}

export interface MergeTagInput {
  sourceId: string
  targetId: string
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
    const id = crypto.randomUUID()
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
```

The mergeTag helper is the most complex piece. Unlike mergeCategory (which can update all category-FK rows in a single WHERE clause), merging tags must handle the expenseTag join table and avoid primary-key collisions when an expense already references both source and target tags.

```bash
sed -n '1128,1238p' src/lib/db/expense-access.ts
```

```output
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
```

## Route

The /tags route closely mirrors /categories from Issue 09. The main structural difference is that tag reference counting uses the expenseTag join table rather than a direct foreign key. The route also uses two module-local finder helpers (findTagById, findTagByName) to avoid re-querying the database inside the rename and merge handlers.

```bash
sed -n '1,50p' src/routes/build-tags.tsx
```

```output
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the tags management page.
 * @module routes/buildTags
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS } from '../constants'
import { Bindings } from '../local-types'
import { useLayout } from './build-layout'
import { signedInAccess } from '../middleware/signed-in-access'
import { createDbClient } from '../db/client'
import {
  countTagExpenses,
  createTag,
  deleteTag,
  listTags,
  mergeTag,
  renameTag,
  type TagRow,
} from '../lib/db/expense-access'
import {
  parseTagCreate,
  parseTagDelete,
  parseTagMergeConfirm,
  parseTagRename,
  tagNameMax,
  type FieldErrors,
} from '../lib/expense-validators'
import {
  readAndClearFormState,
  redirectWithFormErrors,
  type ExpenseFormValues,
} from '../lib/form-state'
import { redirectWithError, redirectWithMessage } from '../lib/redirects'

const TAG_MERGE_CONFIRM_PATH = '/tags/merge-confirm'
const tagInputMax = tagNameMax + 50

type TagFormState = {
  fieldErrors: FieldErrors
  values: ExpenseFormValues
}

const emptyState = (): TagFormState => ({ fieldErrors: {}, values: {} })

```

```bash
sed -n '244,390p' src/routes/build-tags.tsx
```

```output
const findTagById = (rows: TagRow[], id: string): TagRow | undefined =>
  rows.find((row) => row.id === id)

const findTagByName = (rows: TagRow[], name: string): TagRow | undefined =>
  rows.find((row) => row.name.toLowerCase() === name.toLowerCase())

export const buildTags = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.TAGS,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const db = createDbClient(c.env.PROJECT_DB)
      const result = await listTags(db)
      if (result.isErr) {
        return redirectWithError(c, PATHS.EXPENSES, 'Failed to load tags. Please try again.')
      }
      const flash = readAndClearFormState(c)
      const state: TagFormState = flash
        ? { fieldErrors: flash.fieldErrors ?? {}, values: flash.values ?? {} }
        : emptyState()
      return c.render(useLayout(c, renderTags(result.value, state)))
    },
  )

  app.post(
    PATHS.TAGS,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const raw = await readRawBody(c)
      const validated = parseTagCreate({ name: raw.name })
      if (validated.isErr) {
        return redirectWithFormErrors(c, PATHS.TAGS, validated.error, { name: raw.name })
      }
      const db = createDbClient(c.env.PROJECT_DB)
      const result = await createTag(db, validated.value.name)
      if (result.isErr) {
        return redirectWithFormErrors(
          c,
          PATHS.TAGS,
          { name: result.error.message },
          { name: raw.name },
        )
      }
      return redirectWithMessage(c, PATHS.TAGS, 'Tag created.')
    },
  )

  app.post(
    '/tags/:id/rename',
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = c.req.param('id') ?? ''
      const raw = await readRawBody(c)
      const values: ExpenseFormValues = { id, name: raw.name }
      const validated = parseTagRename({ id, name: raw.name })
      if (validated.isErr) {
        return redirectWithFormErrors(c, PATHS.TAGS, validated.error, values)
      }
      const db = createDbClient(c.env.PROJECT_DB)
      const tagsResult = await listTags(db)
      if (tagsResult.isErr) {
        return redirectWithError(c, PATHS.TAGS, 'Failed to rename tag. Please try again.')
      }
      const source = findTagById(tagsResult.value, validated.value.id)
      if (!source) {
        return redirectWithError(c, PATHS.TAGS, 'Tag not found.')
      }
      const existingTarget = findTagByName(tagsResult.value, validated.value.name)
      if (existingTarget !== undefined && existingTarget.id !== validated.value.id) {
        const expenseCount = await countTagExpenses(db, validated.value.id)
        if (expenseCount.isErr) {
          return redirectWithError(c, PATHS.TAGS, 'Failed to rename tag. Please try again.')
        }
        return c.render(
          useLayout(
            c,
            renderMergeConfirm({
              source,
              target: existingTarget,
              expenseCount: expenseCount.value,
            }),
          ),
        )
      }
      const result = await renameTag(db, validated.value)
      if (result.isErr) {
        return redirectWithFormErrors(c, PATHS.TAGS, { name: result.error.message }, values)
      }
      return redirectWithMessage(c, PATHS.TAGS, 'Tag renamed.')
    },
  )

  app.post(
    TAG_MERGE_CONFIRM_PATH,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const raw = await readRawBody(c)
      if (raw.action === 'cancel') {
        return redirectWithMessage(c, PATHS.TAGS, 'Tag merge canceled.')
      }
      const validated = parseTagMergeConfirm({
        sourceId: raw.sourceId,
        targetId: raw.targetId,
      })
      if (validated.isErr) {
        return redirectWithError(c, PATHS.TAGS, 'Invalid merge request.')
      }
      const db = createDbClient(c.env.PROJECT_DB)
      const tagsResult = await listTags(db)
      if (tagsResult.isErr) {
        return redirectWithError(c, PATHS.TAGS, 'Failed to merge tags. Please try again.')
      }
      const source = findTagById(tagsResult.value, validated.value.sourceId)
      const target = findTagById(tagsResult.value, validated.value.targetId)
      if (!source || !target) {
        return redirectWithError(c, PATHS.TAGS, 'Tag not found.')
      }
      const result = await mergeTag(db, validated.value)
      if (result.isErr) {
        return redirectWithError(c, PATHS.TAGS, result.error.message)
      }
      return redirectWithMessage(c, PATHS.TAGS, 'Tags merged.')
    },
  )

  app.post(
    '/tags/:id/delete',
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = c.req.param('id') ?? ''
      const validated = parseTagDelete({ id })
      if (validated.isErr) {
        return redirectWithError(c, PATHS.TAGS, 'Invalid delete request.')
      }
      const db = createDbClient(c.env.PROJECT_DB)
      const result = await deleteTag(db, validated.value.id)
      if (result.isErr) {
        return redirectWithError(c, PATHS.TAGS, result.error.message)
      }
      return redirectWithMessage(c, PATHS.TAGS, 'Tag deleted.')
    },
  )
```

## Unit tests

Two test suites were extended: expense-validators.spec.ts (13 new tag-management validator cases) and expense-access.spec.ts (7 new tag repository helper cases including a merge deduplication scenario). The expense-access harness is extended with tag, expenseTag, and recurringTag tables.

```bash
cd tests && bun test expense-validators.spec.ts expense-access.spec.ts 2>&1 | tail -20
```

```output
(pass) category management validators > parseCategoryMergeConfirm > reports missing source and target ids
(pass) category management validators > parseCategoryDelete > returns trimmed id
(pass) category management validators > parseCategoryDelete > rejects missing id
(pass) tag management validators > parseTagCreate > trims and lowercases valid names [1.00ms]
(pass) tag management validators > parseTagCreate > rejects empty names with a field error
(pass) tag management validators > parseTagCreate > rejects tagNameMax + 1 characters
(pass) tag management validators > parseTagCreate > accepts exactly tagNameMax characters
(pass) tag management validators > parseTagCreate > normalizes mixed-case duplicate targets as the same lowercased name
(pass) tag management validators > parseTagRename > returns id and normalized name
(pass) tag management validators > parseTagRename > reports both id and name errors
(pass) tag management validators > parseTagRename > rejects tagNameMax + 1 char name
(pass) tag management validators > parseTagMergeConfirm > returns source and target ids
(pass) tag management validators > parseTagMergeConfirm > rejects matching source and target ids
(pass) tag management validators > parseTagMergeConfirm > reports missing source and target ids
(pass) tag management validators > parseTagDelete > returns trimmed id
(pass) tag management validators > parseTagDelete > rejects missing id

 74 pass
 0 fail
Ran 74 tests across 2 files. [6.76s]
```

```bash
cd tests && bun test 2>&1 | tail -10
```

```output
(pass) getCurrentTime function > should return the correct no-args time when a time has been set in the future
(pass) getCurrentTime function > should return the correct no-args time with a delay when a time has been set in the past [100.00ms]
(pass) getCurrentTime function > should return the correct no-args time with a delay when a time has been set in the future [103.00ms]
(pass) getCurrentTime function > should return the correct with-args time based in the past
(pass) getCurrentTime function > should return the correct with-args time based in the future
(pass) getCurrentTime function > should allow resetting the time properly

 147 pass
 0 fail
Ran 147 tests across 9 files. [7.56s]
```

```bash
npx tsc --noEmit 2>&1 | head -20 || true
```

```output
tests/db-access-retry.spec.ts(6,30): error TS2307: Cannot find module 'bun:test' or its corresponding type declarations.
tests/expense-access.spec.ts(21,30): error TS2307: Cannot find module 'bun:test' or its corresponding type declarations.
tests/expense-validators.spec.ts(6,30): error TS2307: Cannot find module 'bun:test' or its corresponding type declarations.
tests/send-email.spec.ts(6,30): error TS2307: Cannot find module 'bun:test' or its corresponding type declarations.
tests/send-email.spec.ts(38,48): error TS2345: Argument of type '{ SMTP_SERVER_PORT: string; SMTP_SERVER_HOST: string; SMTP_SERVER_USER: string; SMTP_SERVER_PASSWORD: string; }' is not assignable to parameter of type 'Bindings'.
  Type '{ SMTP_SERVER_PORT: string; SMTP_SERVER_HOST: string; SMTP_SERVER_USER: string; SMTP_SERVER_PASSWORD: string; }' is missing the following properties from type 'Bindings': PROJECT_DB, Session
tests/send-email.spec.ts(78,48): error TS2345: Argument of type '{ SMTP_SERVER_PORT: string; SMTP_SERVER_HOST: string; SMTP_SERVER_USER: string; SMTP_SERVER_PASSWORD: string; }' is not assignable to parameter of type 'Bindings'.
  Type '{ SMTP_SERVER_PORT: string; SMTP_SERVER_HOST: string; SMTP_SERVER_USER: string; SMTP_SERVER_PASSWORD: string; }' is missing the following properties from type 'Bindings': PROJECT_DB, Session
tests/sign-up-utils.spec.ts(6,30): error TS2307: Cannot find module 'bun:test' or its corresponding type declarations.
tests/time-access.spec.ts(6,42): error TS2307: Cannot find module 'bun:test' or its corresponding type declarations.
```

## E2E spec

The new Playwright spec covers all six major flows. It uses javaScriptEnabled: false so it exercises real HTML form POST/redirect semantics without JS enhancement.

```bash
cat e2e-tests/expenses/13-tag-management.spec.ts
```

```output
import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedExpenses, seedTags } from '../support/db-helpers'

const tagsUrl = 'http://localhost:3000/tags'
const tagNameMax = 25

const todayEt = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

const signInAndGoToTags = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
  await page.goto(tagsUrl)
}

const tagRows = (page: any) => page.getByTestId('tag-row')
const tagNames = (page: any) => page.getByTestId('tag-row-name')
const rowByName = (page: any, name: string) => tagRows(page).filter({ hasText: name })

test.describe('Tag management', () => {
  test.use({ javaScriptEnabled: false })

  test(
    'creates lowercase tags and shows duplicate validation without adding a row',
    testWithDatabase(async ({ page }) => {
      await signInAndGoToTags(page)

      await page.getByTestId('tag-create-name').fill('Travel')
      await page.getByTestId('create-tag-action').click()

      await page.waitForURL(tagsUrl)
      await expect(tagNames(page)).toHaveText(['travel'])

      await page.getByTestId('tag-create-name').fill('TRAVEL')
      await page.getByTestId('create-tag-action').click()

      await page.waitForURL(tagsUrl)
      await expect(page.getByTestId('tag-create-name-error')).toContainText('already exists')
      await expect(tagRows(page)).toHaveCount(1)
      await expect(tagNames(page)).toHaveText(['travel'])
    }),
  )

  test(
    'shows create validation while preserving over-limit input',
    testWithDatabase(async ({ page }) => {
      await signInAndGoToTags(page)
      const tooLong = 'g'.repeat(tagNameMax + 1)

      await page.getByTestId('tag-create-name').fill(tooLong)
      await page.getByTestId('create-tag-action').click()

      await page.waitForURL(tagsUrl)
      await expect(page.getByTestId('tag-create-name-error')).toBeVisible()
      await expect(page.getByTestId('tag-create-name')).toHaveValue(tooLong)
      await expect(tagRows(page)).toHaveCount(0)
    }),
  )

  test(
    'renames a tag to a lowercase normalized name',
    testWithDatabase(async ({ page }) => {
      await seedTags([{ name: 'travel' }])
      await signInAndGoToTags(page)

      const row = rowByName(page, 'travel')
      await row.getByTestId('tag-rename-name').fill('Trips')
      await row.getByTestId('rename-tag-action').click()

      await page.waitForURL(tagsUrl)
      await expect(rowByName(page, 'trips')).toHaveCount(1)
      await expect(rowByName(page, 'travel')).toHaveCount(0)
    }),
  )

  test(
    'confirms rename collision merge and repoints source expenses',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'Source expense',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['travel'],
        },
        {
          date: todayEt(),
          description: 'Target expense',
          amountCents: 200,
          categoryName: 'food',
          tagNames: ['trips'],
        },
      ])
      await signInAndGoToTags(page)

      const sourceRow = rowByName(page, 'travel')
      await sourceRow.getByTestId('tag-rename-name').fill('TRIPS')
      await sourceRow.getByTestId('rename-tag-action').click()

      await expect(page.getByTestId('tag-merge-confirm-page')).toBeVisible()
      await expect(page.getByTestId('merge-source-name')).toHaveText('travel')
      await expect(page.getByTestId('merge-target-name')).toHaveText('trips')
      await expect(page.getByTestId('merge-expense-count')).toContainText('All 1 expenses')

      await page.getByTestId('confirm-merge-tag-action').click()
      await page.waitForURL(tagsUrl)
      await expect(rowByName(page, 'travel')).toHaveCount(0)
      await expect(rowByName(page, 'trips')).toHaveCount(1)
    }),
  )

  test(
    'canceling rename collision merge leaves tags unchanged',
    testWithDatabase(async ({ page }) => {
      await seedTags([{ name: 'travel' }, { name: 'trips' }])
      await signInAndGoToTags(page)

      const sourceRow = rowByName(page, 'travel')
      await sourceRow.getByTestId('tag-rename-name').fill('trips')
      await sourceRow.getByTestId('rename-tag-action').click()

      await expect(page.getByTestId('tag-merge-confirm-page')).toBeVisible()
      await page.getByTestId('cancel-merge-tag-action').click()

      await page.waitForURL(tagsUrl)
      await expect(rowByName(page, 'travel')).toHaveCount(1)
      await expect(rowByName(page, 'trips')).toHaveCount(1)
    }),
  )

  test(
    'blocks deleting referenced tags with a count and deletes unreferenced tags',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'One',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['travel'],
        },
        {
          date: todayEt(),
          description: 'Two',
          amountCents: 200,
          categoryName: 'food',
          tagNames: ['travel'],
        },
      ])
      await seedTags([{ name: 'dining' }])
      await signInAndGoToTags(page)

      await rowByName(page, 'travel').getByTestId('delete-tag-action').click()
      await page.waitForURL(tagsUrl)
      await expect(page.getByRole('alert')).toContainText('2 expenses reference')
      await expect(rowByName(page, 'travel')).toHaveCount(1)

      await rowByName(page, 'dining').getByTestId('delete-tag-action').click()
      await page.waitForURL(tagsUrl)
      await expect(rowByName(page, 'dining')).toHaveCount(0)
      await expect(rowByName(page, 'travel')).toHaveCount(1)
    }),
  )
})
```

## Verification

All 147 unit tests pass. npx tsc --noEmit produces only the pre-existing bun:test ambient type errors (unchanged from before this issue). Playwright e2e verification requires a running server and Chromium binary (not available in this environment); the verification command is: npx playwright test e2e-tests/expenses/13-tag-management.spec.ts
