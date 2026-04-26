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

/**
 * Per-field error messages produced by `parseExpenseCreate`. Any missing key
 * means that field passed validation.
 */
export type FieldErrors = {
  description?: string
  amount?: string
  date?: string
  category?: string
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

// ---------- Description ----------

/**
 * Valibot schema for the `description` field.
 *
 * Trims and requires non-empty, `<= descriptionMax` characters.
 */
export const DescriptionSchema = pipe(
  string('Description is required.'),
  custom<string>(
    (v) => typeof v === 'string' && v.trim().length > 0,
    'Description is required.',
  ),
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
  custom<string>(
    (v) => typeof v === 'string' && v.trim().length > 0,
    'Category is required.',
  ),
)

// ---------- Amount ----------

/**
 * Valibot schema for the raw string form of `amount`. Actual numeric parsing
 * (and the bulk of the failure cases) happens in `parseAmount`; this schema
 * only guards that we have a string to pass in.
 */
export const AmountSchema = pipe(
  string('Amount is required.'),
  custom<string>(
    (v) => typeof v === 'string' && v.trim().length > 0,
    'Amount is required.',
  ),
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
  custom<string>(
    (v) => typeof v === 'string' && v.trim().length > 0,
    'Category name is required.',
  ),
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
