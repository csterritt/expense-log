/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Validation for the expense-create form.
 *
 * `parseExpenseCreate` accepts the raw string inputs from the entry form and
 * returns either the parsed / coerced values (with amount already converted to
 * integer cents) or an object of per-field error messages. The POST handler
 * uses the error object to re-render the form with inline messages while
 * preserving the user's typed values.
 *
 * Database-level concerns — such as whether the referenced `categoryId`
 * exists — are enforced by `createExpense`, not here.
 *
 * @module lib/expense-validators
 */
import Result from 'true-myth/result'
import {
  object,
  string,
  safeParse,
  pipe,
  minLength,
  maxLength,
  custom,
  type BaseSchema,
  type BaseIssue,
  type InferOutput,
} from 'valibot'

import { isValidYmd, defaultRangeEt } from './et-date'
import { parseAmount } from './money'

// Maximum description length. Matches the PRODUCTION:UNCOMMENT convention used
// elsewhere so tests can use a slightly-larger value while production enforces
// the user-facing 200-char limit.
// export const descriptionMax = 200 // PRODUCTION:UNCOMMENT
export const descriptionMax = 202

// Maximum length for a newly-typed category name (Issue 5). Production
// enforces 20; tests use a slightly-larger value so the browser does not
// auto-truncate over-long inputs before they reach the server.
// export const categoryNameMax = 20 // PRODUCTION:UNCOMMENT
export const categoryNameMax = 22

// Maximum length for a single tag name (Issue 6). Production enforces 20;
// tests use a slightly-larger value so the browser does not auto-truncate
// over-long inputs before they reach the server.
// export const tagNameMax = 20 // PRODUCTION:UNCOMMENT
export const tagNameMax = 22

/**
 * Per-field error messages produced by `parseExpenseCreate`. Any missing key
 * means that field passed validation.
 */
export type FieldErrors = {
  description?: string
  amount?: string
  date?: string
  category?: string
  tags?: string
  name?: string
  id?: string
  sourceId?: string
  targetId?: string
  groupBy?: string
}

/**
 * The fully-validated output of `parseExpenseCreate`. `category` carries the
 * trimmed user-typed category name; the POST handler resolves it to an id
 * via `findCategoryByName` (existing match) or `createCategoryAndExpense`
 * (new category, after `parseNewCategoryName`).
 */
export type ParsedExpenseCreate = {
  description: string
  amountCents: number
  date: string
  category: string
}

/**
 * Raw string shape expected from the entry form submission.
 */
export type RawExpenseCreate = {
  description: string
  amount: string
  date: string
  category: string
}

export type RawCategoryCreate = {
  name: string
}

export type ParsedCategoryCreate = {
  name: string
}

export type RawCategoryRename = {
  id: string
  name: string
}

export type ParsedCategoryRename = {
  id: string
  name: string
}

export type RawCategoryMergeConfirm = {
  sourceId: string
  targetId: string
}

export type ParsedCategoryMergeConfirm = {
  sourceId: string
  targetId: string
}

export type RawCategoryDelete = {
  id: string
}

export type ParsedCategoryDelete = {
  id: string
}

// ---------- Description ----------

/**
 * Valibot schema for the `description` field.
 *
 * Trims and requires non-empty, `<= descriptionMax` characters.
 */
export const DescriptionSchema = pipe(
  string('Description is required.'),
  custom<string>((v) => typeof v === 'string' && v.trim().length > 0, 'Description is required.'),
  maxLength(descriptionMax, `Description must be at most ${descriptionMax} characters.`),
)

// ---------- Date ----------

/**
 * Valibot schema for the `date` field. Must be a valid `YYYY-MM-DD` calendar
 * date.
 */
export const DateSchema = pipe(
  string('Date is required.'),
  minLength(1, 'Date is required.'),
  custom<string>((v) => typeof v === 'string' && isValidYmd(v), 'Date must be a valid date.'),
)

// ---------- Category ----------

/**
 * Valibot schema for the `category` field. Non-empty string after trim.
 *
 * Existence in the database (or creation of a new row) is handled by the
 * POST handler.
 */
export const CategorySchema = pipe(
  string('Category is required.'),
  custom<string>((v) => typeof v === 'string' && v.trim().length > 0, 'Category is required.'),
)

// ---------- Amount ----------

/**
 * Valibot schema for the raw string form of `amount`. Actual numeric parsing
 * (and the bulk of the failure cases) happens in `parseAmount`; this schema
 * only guards that we have a string to pass in.
 */
export const AmountSchema = pipe(
  string('Amount is required.'),
  custom<string>((v) => typeof v === 'string' && v.trim().length > 0, 'Amount is required.'),
)

/**
 * Composite schema for the shape of the entry form. Individual field schemas
 * are still re-used below via `safeParse` so we can collect per-field errors.
 */
export const ExpenseCreateSchema = object({
  description: DescriptionSchema,
  amount: AmountSchema,
  date: DateSchema,
  category: CategorySchema,
})

export type ExpenseCreateInput = InferOutput<typeof ExpenseCreateSchema>

const firstIssueMessage = (
  schema: BaseSchema<unknown, unknown, BaseIssue<unknown>>,
  value: unknown,
): string | undefined => {
  const result = safeParse(schema, value)
  if (result.success) {
    return undefined
  }
  const first = result.issues[0]
  return first?.message ?? 'Invalid value.'
}

/**
 * Validate the raw entry-form values and, if valid, also parse `amount` into
 * integer cents.
 *
 * On success returns `Result.ok(ParsedExpenseCreate)`. On failure returns
 * `Result.err(FieldErrors)` with one entry per failed field; all failing
 * fields are reported simultaneously rather than short-circuiting.
 */
export const parseExpenseCreate = (
  raw: RawExpenseCreate,
): Result<ParsedExpenseCreate, FieldErrors> => {
  const errors: FieldErrors = {}

  const description = typeof raw.description === 'string' ? raw.description.trim() : ''
  const descError = firstIssueMessage(DescriptionSchema, description)
  if (descError) {
    errors.description = descError
  }

  const date = typeof raw.date === 'string' ? raw.date.trim() : ''
  const dateError = firstIssueMessage(DateSchema, date)
  if (dateError) {
    errors.date = dateError
  }

  const category = typeof raw.category === 'string' ? raw.category.trim() : ''
  const categoryError = firstIssueMessage(CategorySchema, category)
  if (categoryError) {
    errors.category = categoryError
  }

  const amountRaw = typeof raw.amount === 'string' ? raw.amount : ''
  let amountCents = 0
  const amountPresenceError = firstIssueMessage(AmountSchema, amountRaw)
  if (amountPresenceError) {
    errors.amount = amountPresenceError
  } else {
    const parsed = parseAmount(amountRaw)
    if (parsed.isErr) {
      errors.amount = parsed.error
    } else {
      amountCents = parsed.value
    }
  }

  if (Object.keys(errors).length > 0) {
    return Result.err(errors)
  }

  return Result.ok({ description, amountCents, date, category })
}

// ---------- New-category name (Issue 5) ----------

/**
 * Valibot schema for a new (typed-by-the-user) category name. Trimmed input
 * must be non-empty and `<= categoryNameMax` characters.
 */
export const NewCategoryNameSchema = pipe(
  string('Category name is required.'),
  custom<string>((v) => typeof v === 'string' && v.trim().length > 0, 'Category name is required.'),
  custom<string>(
    (v) => typeof v === 'string' && v.trim().length <= categoryNameMax,
    `Category name must be at most ${categoryNameMax} characters.`,
  ),
)

/**
 * Validate a typed new-category name. On success returns the trimmed input
 * (case-preserving — final lowercasing is performed by the DB helper before
 * insert). On failure returns a single user-facing error string suitable to
 * place under the entry-form `category` field.
 */
export const parseNewCategoryName = (input: string): Result<string, string> => {
  const value = typeof input === 'string' ? input.trim() : ''
  const message = firstIssueMessage(NewCategoryNameSchema, value)
  if (message) {
    return Result.err(message)
  }
  return Result.ok(value)
}

export const CategoryManagementNameSchema = NewCategoryNameSchema

const parseCategoryManagementName = (input: unknown): Result<string, string> => {
  const value = typeof input === 'string' ? input.trim() : ''
  const message = firstIssueMessage(CategoryManagementNameSchema, value)
  if (message) {
    return Result.err(message)
  }
  return Result.ok(value.toLowerCase())
}

const parseRequiredId = (input: unknown, message: string): Result<string, string> => {
  const value = typeof input === 'string' ? input.trim() : ''
  if (value.length === 0) {
    return Result.err(message)
  }
  return Result.ok(value)
}

export const parseCategoryCreate = (
  raw: RawCategoryCreate,
): Result<ParsedCategoryCreate, FieldErrors> => {
  const name = parseCategoryManagementName(raw.name)
  if (name.isErr) {
    return Result.err({ name: name.error })
  }
  return Result.ok({ name: name.value })
}

export const parseCategoryRename = (
  raw: RawCategoryRename,
): Result<ParsedCategoryRename, FieldErrors> => {
  const errors: FieldErrors = {}
  const id = parseRequiredId(raw.id, 'Category is required.')
  if (id.isErr) {
    errors.id = id.error
  }
  const name = parseCategoryManagementName(raw.name)
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

export const parseCategoryMergeConfirm = (
  raw: RawCategoryMergeConfirm,
): Result<ParsedCategoryMergeConfirm, FieldErrors> => {
  const errors: FieldErrors = {}
  const sourceId = parseRequiredId(raw.sourceId, 'Source category is required.')
  if (sourceId.isErr) {
    errors.sourceId = sourceId.error
  }
  const targetId = parseRequiredId(raw.targetId, 'Target category is required.')
  if (targetId.isErr) {
    errors.targetId = targetId.error
  }
  if (sourceId.isOk && targetId.isOk && sourceId.value === targetId.value) {
    errors.targetId = 'Choose two different categories.'
  }
  if (Object.keys(errors).length > 0) {
    return Result.err(errors)
  }
  if (sourceId.isErr || targetId.isErr) {
    return Result.err(errors)
  }
  return Result.ok({ sourceId: sourceId.value, targetId: targetId.value })
}

export const parseCategoryDelete = (
  raw: RawCategoryDelete,
): Result<ParsedCategoryDelete, FieldErrors> => {
  const id = parseRequiredId(raw.id, 'Category is required.')
  if (id.isErr) {
    return Result.err({ id: id.error })
  }
  return Result.ok({ id: id.value })
}

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

// ---------- Expense list filter parser (Issue 11) ----------

/**
 * Raw query-string values from the expense list filter bar.
 * All fields are optional; repeated `tagId` values are passed as an array.
 */
export type RawExpenseListFilters = {
  description?: string
  from?: string
  to?: string
  categoryId?: string
  tagId?: string | string[]
  tagMode?: string
}

/**
 * Normalized output from `parseExpenseListFilters`.
 */
export type ParsedExpenseListFilters = {
  description?: string
  from?: string
  to?: string
  categoryId?: string
  tagIds: string[]
  tagMode: 'or' | 'and'
}

/**
 * Result of parsing the expense list filter query string.
 * `hasFilterParams` is true when any filter query parameter was present in the
 * raw input, so the route layer can apply the default date window on first load
 * only when this is false.
 */
export type ExpenseListFilterResult = {
  hasFilterParams: boolean
  filters: ParsedExpenseListFilters
  fieldErrors: FieldErrors
}

/**
 * Parse and normalise the expense-list filter query string.
 *
 * - `description`: trimmed; empty/whitespace becomes "filter not applied"
 * - `from`/`to`: each independently optional; validated as `YYYY-MM-DD`
 * - `categoryId`: optional string; non-string values rejected
 * - `tagId`: repeated param collapsed into deduplicated array
 * - `tagMode`: defaults to `'or'`; only `'or'` and `'and'` accepted
 *
 * `hasFilterParams` is `true` when at least one filter key was present in
 * `raw` (even if its value is empty/invalid), so the route can distinguish a
 * fresh first load from an explicit filter submission.
 */
export const parseExpenseListFilters = (raw: RawExpenseListFilters): ExpenseListFilterResult => {
  const FILTER_KEYS: Array<keyof RawExpenseListFilters> = [
    'description',
    'from',
    'to',
    'categoryId',
    'tagId',
    'tagMode',
  ]
  const hasFilterParams = FILTER_KEYS.some((k) => raw[k] !== undefined)

  const fieldErrors: FieldErrors = {}

  const descriptionTrimmed =
    typeof raw.description === 'string' ? raw.description.trim() : undefined
  const description =
    descriptionTrimmed !== undefined && descriptionTrimmed.length > 0
      ? descriptionTrimmed
      : undefined

  let from: string | undefined
  if (typeof raw.from === 'string' && raw.from.trim().length > 0) {
    const trimmed = raw.from.trim()
    if (isValidYmd(trimmed)) {
      from = trimmed
    } else {
      fieldErrors.date = 'From date must be a valid date (YYYY-MM-DD).'
    }
  }

  let to: string | undefined
  if (typeof raw.to === 'string' && raw.to.trim().length > 0) {
    const trimmed = raw.to.trim()
    if (isValidYmd(trimmed)) {
      to = trimmed
    } else {
      fieldErrors.date = fieldErrors.date
        ? fieldErrors.date
        : 'To date must be a valid date (YYYY-MM-DD).'
    }
  }

  let categoryId: string | undefined
  if (typeof raw.categoryId === 'string' && raw.categoryId.trim().length > 0) {
    categoryId = raw.categoryId.trim()
  }

  const tagIdRaw = raw.tagId
  const rawTagIds: string[] = Array.isArray(tagIdRaw)
    ? tagIdRaw
    : typeof tagIdRaw === 'string'
      ? [tagIdRaw]
      : []
  const seenTagIds = new Set<string>()
  const tagIds: string[] = []
  for (const t of rawTagIds) {
    if (typeof t === 'string' && t.trim().length > 0 && !seenTagIds.has(t.trim())) {
      seenTagIds.add(t.trim())
      tagIds.push(t.trim())
    }
  }

  let tagMode: 'or' | 'and' = 'or'
  if (raw.tagMode === 'and') {
    tagMode = 'and'
  } else if (raw.tagMode !== undefined && raw.tagMode !== 'or' && raw.tagMode !== '') {
    fieldErrors.tags = 'Tag mode must be "or" or "and".'
  }

  return {
    hasFilterParams,
    filters: {
      description,
      from,
      to,
      categoryId,
      tagIds,
      tagMode,
    },
    fieldErrors,
  }
}

// ---------- Tag CSV (Issue 6) ----------

/**
 * Parse a comma-separated tag list. Splits on `,`, trims each entry, drops
 * empty-after-trim entries, lower-cases the survivors, and de-duplicates
 * silently (preserving first-appearance order). Enforces `length <=
 * tagNameMax` on every kept name. Returns the normalized list (possibly
 * empty) on success, or a single user-facing error string suitable to place
 * under the entry-form `tags` field on failure.
 */
export const parseTagCsv = (input: string): Result<string[], string> => {
  const raw = typeof input === 'string' ? input : ''
  const seen = new Set<string>()
  const result: string[] = []
  for (const piece of raw.split(',')) {
    const trimmed = piece.trim()
    if (trimmed.length === 0) {
      continue
    }
    if (trimmed.length > tagNameMax) {
      return Result.err(`Tag names must be at most ${tagNameMax} characters.`)
    }
    const lowered = trimmed.toLowerCase()
    if (seen.has(lowered)) {
      continue
    }
    seen.add(lowered)
    result.push(lowered)
  }
  return Result.ok(result)
}

// ---------- Summary query parser (Issue 14) ----------

export type RawSummaryQuery = {
  groupBy?: string
  from?: string
  to?: string
  categoryId?: string
  tagId?: string | string[]
  tagMode?: string
}

export type ParsedSummaryQuery = {
  groupBy: 'month' | 'year'
  from: string
  to: string
  categoryId?: string
  tagIds: string[]
  tagMode: 'or' | 'and'
}

export const parseSummaryQuery = (
  raw: RawSummaryQuery,
): Result<ParsedSummaryQuery, FieldErrors> => {
  const defaults = defaultRangeEt()
  const fieldErrors: FieldErrors = {}

  let groupBy: 'month' | 'year' = 'month'
  if (raw.groupBy === 'year') {
    groupBy = 'year'
  } else if (raw.groupBy !== undefined && raw.groupBy !== 'month' && raw.groupBy !== '') {
    fieldErrors.groupBy = 'Group by must be "month" or "year".'
  }

  let from = defaults.from
  if (typeof raw.from === 'string' && raw.from.trim().length > 0) {
    const trimmed = raw.from.trim()
    if (isValidYmd(trimmed)) {
      from = trimmed
    } else {
      fieldErrors.date = 'From date must be a valid date (YYYY-MM-DD).'
    }
  }

  let to = defaults.to
  if (typeof raw.to === 'string' && raw.to.trim().length > 0) {
    const trimmed = raw.to.trim()
    if (isValidYmd(trimmed)) {
      to = trimmed
    } else {
      fieldErrors.date = fieldErrors.date
        ? fieldErrors.date
        : 'To date must be a valid date (YYYY-MM-DD).'
    }
  }

  if (from > to) {
    fieldErrors.date = fieldErrors.date
      ? fieldErrors.date
      : 'From date must be on or before To date.'
  }

  let categoryId: string | undefined
  if (typeof raw.categoryId === 'string' && raw.categoryId.trim().length > 0) {
    categoryId = raw.categoryId.trim()
  }

  const tagIdRaw = raw.tagId
  const rawTagIds: string[] = Array.isArray(tagIdRaw)
    ? tagIdRaw
    : typeof tagIdRaw === 'string'
      ? [tagIdRaw]
      : []
  const seenTagIds = new Set<string>()
  const tagIds: string[] = []
  for (const t of rawTagIds) {
    if (typeof t === 'string' && t.trim().length > 0 && !seenTagIds.has(t.trim())) {
      seenTagIds.add(t.trim())
      tagIds.push(t.trim())
    }
  }

  let tagMode: 'or' | 'and' = 'or'
  if (raw.tagMode === 'and') {
    tagMode = 'and'
  } else if (raw.tagMode !== undefined && raw.tagMode !== 'or' && raw.tagMode !== '') {
    fieldErrors.tags = 'Tag mode must be "or" or "and".'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return Result.err(fieldErrors)
  }

  return Result.ok({
    groupBy,
    from,
    to,
    categoryId,
    tagIds,
    tagMode,
  })
}
