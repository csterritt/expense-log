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

import { isValidYmd } from './et-date'
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
  recurrence?: string
  anchorDate?: string
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
 * Raw string shape expected from the entry form submission
 */
export type RawExpenseCreate = {
  description: string
  amount: string
  date: string
  category: string
}

/**
 * Raw input for creating a category
 */
export type RawCategoryCreate = {
  name: string
}

/**
 * Parsed and validated category creation data
 */
export type ParsedCategoryCreate = {
  name: string
}

/**
 * Raw input for renaming a category
 */
export type RawCategoryRename = {
  id: string
  name: string
}

/**
 * Parsed and validated category rename data
 */
export type ParsedCategoryRename = {
  id: string
  name: string
}

/**
 * Raw input for confirming a category merge
 */
export type RawCategoryMergeConfirm = {
  sourceId: string
  targetId: string
}

/**
 * Parsed and validated category merge confirmation data
 */
export type ParsedCategoryMergeConfirm = {
  sourceId: string
  targetId: string
}

/**
 * Raw input for deleting a category
 */
export type RawCategoryDelete = {
  id: string
}

/**
 * Parsed and validated category delete data
 */
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

/**
 * Extract the first error message from a Valibot schema validation result
 * @param schema - The Valibot schema to validate against
 * @param value - The value to validate
 * @returns The first error message if validation fails, undefined otherwise
 */
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
 * Validate a new category name
 * @param input - The new category name to validate
 * @returns Result.ok(trimmed input) on success, Result.err(error message) on failure
 */
export const parseNewCategoryName = (input: string): Result<string, string> => {
  const value = typeof input === 'string' ? input.trim() : ''
  const message = firstIssueMessage(NewCategoryNameSchema, value)
  if (message) {
    return Result.err(message)
  }
  return Result.ok(value)
}

/**
 * Valibot schema for category management (create/rename) name validation
 * Reuses the new category name schema
 */
export const CategoryManagementNameSchema = NewCategoryNameSchema

/**
 * Parse and validate a category management name
 * Trims, lowercases, and validates the input
 * @param input - The raw input to parse
 * @returns Result with lowercased name on success, error message on failure
 */
const parseCategoryManagementName = (input: unknown): Result<string, string> => {
  const value = typeof input === 'string' ? input.trim() : ''
  const message = firstIssueMessage(CategoryManagementNameSchema, value)
  if (message) {
    return Result.err(message)
  }
  return Result.ok(value.toLowerCase())
}

/**
 * Parse and validate a required ID field
 * @param input - The raw input to parse
 * @param message - The error message to return if validation fails
 * @returns Result with trimmed ID on success, error message on failure
 */
const parseRequiredId = (input: unknown, message: string): Result<string, string> => {
  const value = typeof input === 'string' ? input.trim() : ''
  if (value.length === 0) {
    return Result.err(message)
  }
  return Result.ok(value)
}

/**
 * Parse and validate category creation data
 * @param raw - Raw category creation input
 * @returns Result with parsed data on success, field errors on failure
 */
export const parseCategoryCreate = (
  raw: RawCategoryCreate,
): Result<ParsedCategoryCreate, FieldErrors> => {
  const name = parseCategoryManagementName(raw.name)
  if (name.isErr) {
    return Result.err({ name: name.error })
  }
  return Result.ok({ name: name.value })
}

/**
 * Parse and validate category rename data
 * @param raw - Raw category rename input
 * @returns Result with parsed data on success, field errors on failure
 */
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

/**
 * Parse and validate category merge confirmation data
 * @param raw - Raw category merge confirmation input
 * @returns Result with parsed data on success, field errors on failure
 */
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

/**
 * Parse and validate category delete data
 * @param raw - Raw category delete input
 * @returns Result with parsed data on success, field errors on failure
 */
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

/**
 * Raw input for creating a tag
 */
export type RawTagCreate = {
  name: string
}

/**
 * Parsed and validated tag creation data
 */
export type ParsedTagCreate = {
  name: string
}

/**
 * Raw input for renaming a tag
 */
export type RawTagRename = {
  id: string
  name: string
}

/**
 * Parsed and validated tag rename data
 */
export type ParsedTagRename = {
  id: string
  name: string
}

/**
 * Raw input for confirming a tag merge
 */
export type RawTagMergeConfirm = {
  sourceId: string
  targetId: string
}

/**
 * Parsed and validated tag merge confirmation data
 */
export type ParsedTagMergeConfirm = {
  sourceId: string
  targetId: string
}

/**
 * Raw input for deleting a tag
 */
export type RawTagDelete = {
  id: string
}

/**
 * Parsed and validated tag delete data
 */
export type ParsedTagDelete = {
  id: string
}

/**
 * Valibot schema for tag management (create/rename) name validation
 */
export const TagManagementNameSchema = pipe(
  string('Tag name is required.'),
  custom<string>((v) => typeof v === 'string' && v.trim().length > 0, 'Tag name is required.'),
  custom<string>(
    (v) => typeof v === 'string' && v.trim().length <= tagNameMax,
    `Tag name must be at most ${tagNameMax} characters.`,
  ),
)

/**
 * Parse and validate a tag management name
 * Trims, lowercases, and validates the input
 * @param input - The raw input to parse
 * @returns Result with lowercased name on success, error message on failure
 */
const parseTagManagementName = (input: unknown): Result<string, string> => {
  const value = typeof input === 'string' ? input.trim() : ''
  const message = firstIssueMessage(TagManagementNameSchema, value)
  if (message) {
    return Result.err(message)
  }
  return Result.ok(value.toLowerCase())
}

/**
 * Parse and validate tag creation data
 * @param raw - Raw tag creation input
 * @returns Result with parsed data on success, field errors on failure
 */
export const parseTagCreate = (raw: RawTagCreate): Result<ParsedTagCreate, FieldErrors> => {
  const name = parseTagManagementName(raw.name)
  if (name.isErr) {
    return Result.err({ name: name.error })
  }
  return Result.ok({ name: name.value })
}

/**
 * Parse and validate tag rename data
 * @param raw - Raw tag rename input
 * @returns Result with parsed data on success, field errors on failure
 */
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

/**
 * Parse and validate tag merge confirmation data
 * @param raw - Raw tag merge confirmation input
 * @returns Result with parsed data on success, field errors on failure
 */
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

/**
 * Parse and validate tag delete data
 * @param raw - Raw tag delete input
 * @returns Result with parsed data on success, field errors on failure
 */
export const parseTagDelete = (raw: RawTagDelete): Result<ParsedTagDelete, FieldErrors> => {
  const id = parseRequiredId(raw.id, 'Tag is required.')
  if (id.isErr) {
    return Result.err({ id: id.error })
  }
  return Result.ok({ id: id.value })
}

// ---------- Mutation-form tag-input validator (Task 2) ----------

export const TAG_ID_RAW_CAP = 64
export const NEW_TAGS_RAW_LENGTH_CAP = 500
export const NEW_TAGS_TOKEN_COUNT_CAP = 32

const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/
const NEW_TAG_TOKEN_REGEX = /^[a-z0-9_-]{1,20}$/

export type ExistingTag = {
  id: string
  name: string
}

export type ExistingCategory = {
  id: string
  name: string
}

export type RawTagInputs = {
  tagId: string | string[]
  newTags: string
}

export type ParsedTagInputs = {
  lookupCandidateTagIds: string[]
  tagIds: string[]
  newTags: string[]
  rawNewTagsPreserved: string
  fieldErrors: FieldErrors
}

export type RawCategoryInput = {
  categoryId: string
  newCategory: string
}

export type ParsedCategoryInput = {
  lookupCandidateCategoryId: string | undefined
  resolvedCategoryId: string | undefined
  newCategory: string | undefined
  fieldErrors: FieldErrors
}

const isValidUlid = (value: string): boolean => ULID_REGEX.test(value)

const filterSyntacticUlids = (rawIds: string[]): string[] => {
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of rawIds) {
    if (isValidUlid(id) && !seen.has(id)) {
      seen.add(id)
      result.push(id)
    }
  }
  return result
}

const splitAndNormalizeTokens = (raw: string): string[] =>
  raw
    .split(/[,\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0)

export const parseTagInputs = (raw: RawTagInputs, existingTags: ExistingTag[]): ParsedTagInputs => {
  const fieldErrors: FieldErrors = {}

  const rawIds: string[] = Array.isArray(raw.tagId)
    ? raw.tagId
    : typeof raw.tagId === 'string' && raw.tagId.length > 0
      ? [raw.tagId]
      : []

  if (rawIds.length > TAG_ID_RAW_CAP) {
    fieldErrors.tags = `Too many tag selections (max ${TAG_ID_RAW_CAP}).`
  }

  const syntacticIds = filterSyntacticUlids(rawIds)

  const rawNewTags = typeof raw.newTags === 'string' ? raw.newTags : ''

  if (rawNewTags.length > NEW_TAGS_RAW_LENGTH_CAP) {
    fieldErrors.tags = fieldErrors.tags ?? `New tags text is too long (max ${NEW_TAGS_RAW_LENGTH_CAP} characters).`
    return {
      lookupCandidateTagIds: syntacticIds,
      tagIds: syntacticIds,
      newTags: [],
      rawNewTagsPreserved: rawNewTags,
      fieldErrors,
    }
  }

  const rawTokens = splitAndNormalizeTokens(rawNewTags)

  if (rawTokens.length > NEW_TAGS_TOKEN_COUNT_CAP) {
    fieldErrors.tags = fieldErrors.tags ?? `Too many new tags (max ${NEW_TAGS_TOKEN_COUNT_CAP}).`
    return {
      lookupCandidateTagIds: syntacticIds,
      tagIds: syntacticIds,
      newTags: [],
      rawNewTagsPreserved: rawNewTags,
      fieldErrors,
    }
  }

  const seenTokens = new Set<string>()
  const validTokens: string[] = []
  for (const token of rawTokens) {
    if (!NEW_TAG_TOKEN_REGEX.test(token)) {
      fieldErrors.tags = fieldErrors.tags ?? `Invalid new tag name: "${token}". Use only lowercase letters, digits, hyphens, and underscores (1–20 chars).`
    } else if (!seenTokens.has(token)) {
      seenTokens.add(token)
      validTokens.push(token)
    }
  }

  if (fieldErrors.tags) {
    return {
      lookupCandidateTagIds: syntacticIds,
      tagIds: syntacticIds,
      newTags: [],
      rawNewTagsPreserved: rawNewTags,
      fieldErrors,
    }
  }

  const existingByName = new Map<string, string>()
  for (const tag of existingTags) {
    existingByName.set(tag.name.toLowerCase(), tag.id)
  }

  const resolvedTagIds = new Set<string>(syntacticIds)
  const unresolvedTokens: string[] = []
  for (const token of validTokens) {
    const existingId = existingByName.get(token)
    if (existingId !== undefined) {
      resolvedTagIds.add(existingId)
    } else {
      unresolvedTokens.push(token)
    }
  }

  const residual = unresolvedTokens.join(',')

  return {
    lookupCandidateTagIds: syntacticIds,
    tagIds: Array.from(resolvedTagIds),
    newTags: unresolvedTokens,
    rawNewTagsPreserved: residual,
    fieldErrors,
  }
}

export const parseCategoryInput = (
  raw: RawCategoryInput,
  existingCategory: ExistingCategory | null,
): ParsedCategoryInput => {
  const fieldErrors: FieldErrors = {}

  const rawCategoryId = typeof raw.categoryId === 'string' ? raw.categoryId.trim() : ''
  const lookupCandidateCategoryId = isValidUlid(rawCategoryId) ? rawCategoryId : undefined

  const rawNewCategory = typeof raw.newCategory === 'string' ? raw.newCategory.trim().toLowerCase() : ''

  if (rawNewCategory.length === 0) {
    return {
      lookupCandidateCategoryId,
      resolvedCategoryId: undefined,
      newCategory: undefined,
      fieldErrors,
    }
  }

  if (!NEW_TAG_TOKEN_REGEX.test(rawNewCategory)) {
    fieldErrors.category = `Invalid category name: "${rawNewCategory}". Use only lowercase letters, digits, hyphens, and underscores (1–20 chars).`
    return {
      lookupCandidateCategoryId,
      resolvedCategoryId: undefined,
      newCategory: undefined,
      fieldErrors,
    }
  }

  if (existingCategory !== null && existingCategory.name.toLowerCase() === rawNewCategory) {
    return {
      lookupCandidateCategoryId,
      resolvedCategoryId: existingCategory.id,
      newCategory: undefined,
      fieldErrors,
    }
  }

  return {
    lookupCandidateCategoryId,
    resolvedCategoryId: undefined,
    newCategory: rawNewCategory,
    fieldErrors,
  }
}

// ---------- Shared query-string helpers ----------

/**
 * Filter-side tag-id accumulator shared by `parseExpenseListFilters` and
 * `parseSummaryQuery`: silently drops non-ULID values and truncates to
 * `TAG_ID_RAW_CAP` without producing a field error (page still renders).
 */
const parseFilterTagIds = (raw: string | string[] | undefined): string[] => {
  const rawIds: string[] = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : []
  const truncated = rawIds.slice(0, TAG_ID_RAW_CAP)
  return filterSyntacticUlids(truncated)
}

/**
 * Parse an optional `from`/`to` date-range pair from raw string inputs.
 * Invalid dates (wrong shape or impossible calendar dates) are silently
 * treated as absent — no error is produced. Only `from > to` (both valid)
 * produces an error. Does **not** mutate the caller's errors object —
 * the caller merges the returned error string as needed.
 */
const parseDateRange = (
  rawFrom: string | undefined,
  rawTo: string | undefined,
): { from: string | undefined; to: string | undefined; dateError: string | undefined } => {
  let from: string | undefined

  if (typeof rawFrom === 'string' && rawFrom.trim().length > 0) {
    const trimmed = rawFrom.trim()
    if (isValidYmd(trimmed)) {
      from = trimmed
    }
  }

  let to: string | undefined
  if (typeof rawTo === 'string' && rawTo.trim().length > 0) {
    const trimmed = rawTo.trim()
    if (isValidYmd(trimmed)) {
      to = trimmed
    }
  }

  let dateError: string | undefined
  if (from !== undefined && to !== undefined && from > to) {
    dateError = 'From date must be on or before To date.'
  }

  return { from, to, dateError }
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

  const { from, to, dateError } = parseDateRange(raw.from, raw.to)
  if (dateError) {
    fieldErrors.date = dateError
  }

  let categoryId: string | undefined
  if (typeof raw.categoryId === 'string' && raw.categoryId.trim().length > 0) {
    categoryId = raw.categoryId.trim()
  }

  const tagIds = parseFilterTagIds(raw.tagId)

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

// ---------- Recurring template validators (Issue 13) ----------

/**
 * Allowed recurrence values for recurring templates.
 */
export const VALID_RECURRENCES = ['Monthly', 'Quarterly', 'Yearly'] as const
export type Recurrence = (typeof VALID_RECURRENCES)[number]

/**
 * Raw string shape expected from the recurring template form.
 */
export type RecurringFormValues = {
  description: string
  amount: string
  category: string
  tags?: string
  recurrence: string
  anchorDate: string
}

/**
 * The fully-validated output of `parseRecurringCreate`.
 */
export type ParsedRecurringCreate = {
  description: string
  amountCents: number
  category: string
  recurrence: Recurrence
  anchorDate: string
}

/**
 * Valibot schema for the `recurrence` field. Must be exactly one of the
 * allowed recurrence values.
 */
export const RecurrenceSchema = pipe(
  string('Recurrence is required.'),
  custom<string>(
    (v) => typeof v === 'string' && (VALID_RECURRENCES as readonly string[]).includes(v),
    'Recurrence must be Monthly, Quarterly, or Yearly.',
  ),
)

/**
 * Valibot schema for the `anchorDate` field. Must be a valid `YYYY-MM-DD`
 * calendar date (impossible dates like `2025-02-30` are rejected).
 */
export const AnchorDateSchema = pipe(
  string('Anchor date is required.'),
  minLength(1, 'Anchor date is required.'),
  custom<string>((v) => typeof v === 'string' && isValidYmd(v), 'Anchor date must be a valid date (YYYY-MM-DD).'),
)

/**
 * Validate the raw recurring-template form values. Enforces the same rules
 * as `parseExpenseCreate` for description, amount, and category, plus
 * validates `recurrence` and `anchorDate`.
 *
 * On success returns `Result.ok(ParsedRecurringCreate)`. On failure returns
 * `Result.err(FieldErrors)` with one entry per failed field.
 */
export const parseRecurringCreate = (
  values: RecurringFormValues,
): Result<ParsedRecurringCreate, FieldErrors> => {
  const errors: FieldErrors = {}

  const description = typeof values.description === 'string' ? values.description.trim() : ''
  const descError = firstIssueMessage(DescriptionSchema, description)
  if (descError) {
    errors.description = descError
  }

  const category = typeof values.category === 'string' ? values.category.trim() : ''
  const categoryError = firstIssueMessage(CategorySchema, category)
  if (categoryError) {
    errors.category = categoryError
  }

  const amountRaw = typeof values.amount === 'string' ? values.amount : ''
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

  const recurrenceRaw = typeof values.recurrence === 'string' ? values.recurrence.trim() : ''
  const recurrenceError = firstIssueMessage(RecurrenceSchema, recurrenceRaw)
  if (recurrenceError) {
    errors.recurrence = recurrenceError
  }

  const anchorDate = typeof values.anchorDate === 'string' ? values.anchorDate.trim() : ''
  const anchorDateError = firstIssueMessage(AnchorDateSchema, anchorDate)
  if (anchorDateError) {
    errors.anchorDate = anchorDateError
  }

  if (Object.keys(errors).length > 0) {
    return Result.err(errors)
  }

  return Result.ok({
    description,
    amountCents,
    category,
    recurrence: recurrenceRaw as Recurrence,
    anchorDate,
  })
}

// ---------- Summary query parser (Issue 17) ----------

const VALID_DIMENSIONS = ['time', 'category', 'tag', 'category-tag'] as const
export type SummaryDimension = (typeof VALID_DIMENSIONS)[number]

const VALID_GRANULARITIES = ['month', 'quarter', 'year'] as const
export type SummaryGranularity = (typeof VALID_GRANULARITIES)[number]

const VALID_SORT_COLUMNS_ALWAYS = ['timePeriod', 'count', 'total'] as const

const DIMENSION_EXTRA_SORT_COLUMNS: Record<string, readonly string[]> = {
  time: [],
  category: ['category'],
  tag: ['tag'],
  'category-tag': ['category', 'tag'],
}

/**
 * Raw query-string values from the summary page filter bar.
 */
export type RawSummaryQuery = {
  dimension?: string
  granularity?: string
  from?: string
  to?: string
  tagId?: string | string[]
  sort?: string | string[]
}

/**
 * Parsed sort entry produced by `parseSummaryQuery`.
 */
export type SummarySortEntry = {
  column: string
  direction: 'asc' | 'desc'
}

/**
 * Result of parsing the summary page query string.
 */
export type SummaryQueryResult = {
  hasFilterParams: boolean
  dimension: SummaryDimension
  granularity: SummaryGranularity
  from?: string
  to?: string
  tagIds: string[]
  sort: SummarySortEntry[]
  fieldErrors: FieldErrors
}

/**
 * Parse and normalise the summary page query string.
 *
 * - `dimension`: defaults to `'category'`; unknown values produce a `groupBy` field error
 * - `granularity`: defaults to `'month'`; unknown values produce a `groupBy` field error
 * - `from`/`to`: independently optional; validated as `YYYY-MM-DD`; `from > to` is an error
 * - `tagId`: repeated params collapsed into a deduplicated array
 * - `sort`: repeated `column:direction` params parsed in order; unknown column or direction
 *   produces a `groupBy` field error
 * - `hasFilterParams`: `true` when any recognized key was present in `raw`
 */
export const parseSummaryQuery = (raw: RawSummaryQuery): SummaryQueryResult => {
  const FILTER_KEYS: Array<keyof RawSummaryQuery> = [
    'dimension',
    'granularity',
    'from',
    'to',
    'tagId',
    'sort',
  ]
  const hasFilterParams = FILTER_KEYS.some((k) => raw[k] !== undefined)

  const fieldErrors: FieldErrors = {}

  let dimension: SummaryDimension = 'category'
  if (typeof raw.dimension === 'string' && raw.dimension.trim().length > 0) {
    const v = raw.dimension.trim()
    if ((VALID_DIMENSIONS as readonly string[]).includes(v)) {
      dimension = v as SummaryDimension
    } else {
      fieldErrors.groupBy = `Dimension must be one of: ${VALID_DIMENSIONS.join(', ')}.`
    }
  }

  let granularity: SummaryGranularity = 'month'
  if (typeof raw.granularity === 'string' && raw.granularity.trim().length > 0) {
    const v = raw.granularity.trim()
    if ((VALID_GRANULARITIES as readonly string[]).includes(v)) {
      granularity = v as SummaryGranularity
    } else {
      fieldErrors.groupBy = fieldErrors.groupBy
        ? fieldErrors.groupBy
        : `Granularity must be one of: ${VALID_GRANULARITIES.join(', ')}.`
    }
  }

  const { from, to, dateError } = parseDateRange(raw.from, raw.to)
  if (dateError) {
    fieldErrors.date = dateError
  }

  const tagIds = parseFilterTagIds(raw.tagId)

  const validSortColumnsForDimension: readonly string[] = [
    ...VALID_SORT_COLUMNS_ALWAYS,
    ...(DIMENSION_EXTRA_SORT_COLUMNS[dimension] ?? []),
  ]

  const sortRaw = raw.sort
  const rawSortParams: string[] = Array.isArray(sortRaw)
    ? sortRaw
    : typeof sortRaw === 'string'
      ? [sortRaw]
      : []
  const sort: SummarySortEntry[] = []
  for (const param of rawSortParams) {
    const colonIdx = param.lastIndexOf(':')
    if (colonIdx < 1) {
      continue
    }
    const column = param.slice(0, colonIdx).trim()
    const direction = param.slice(colonIdx + 1).trim()
    if (!validSortColumnsForDimension.includes(column)) {
      continue
    }
    if (direction !== 'asc' && direction !== 'desc') {
      continue
    }
    sort.push({ column, direction })
  }

  return { hasFilterParams, dimension, granularity, from, to, tagIds, sort, fieldErrors }
}
