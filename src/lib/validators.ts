/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Validation schemas for API requests using Valibot.
 * @module lib/validators
 */
import {
  object,
  string,
  safeParse,
  minLength,
  maxLength,
  pipe,
  custom,
  optional,
  type BaseSchema,
  type BaseIssue,
  type InferOutput,
} from 'valibot'
import { VALIDATION } from '../constants'

// Email validation function
const validateEmail = (value: unknown) => {
  if (typeof value !== 'string') {
    return false
  }
  const v = value.trim().toLowerCase()
  return VALIDATION.EMAIL_PATTERN.test(v)
}

// Name validation: only letters, numbers, hyphens, underscores, and spaces
const NAME_PATTERN = /^[a-zA-Z0-9_\- ]+$/
const validateNameCharacters = (value: unknown): boolean => {
  if (typeof value !== 'string') {
    return false
  }
  const trimmed = value.trim()
  return trimmed.length > 0 && NAME_PATTERN.test(trimmed)
}

/**
 * Email validation schema
 * - Must be a string
 * - Between 1 and 254 characters (standard email length limits)
 * - Must match email regex pattern
 */
export const EmailSchema = pipe(
  string(VALIDATION.REQUIRED),
  minLength(1, VALIDATION.EMAIL_INVALID),
  maxLength(254, VALIDATION.EMAIL_INVALID),
  custom(validateEmail),
)

/**
 * Interest sign-up form schema
 */
export const InterestSignUpFormSchema = object({
  email: EmailSchema,
})

/**
 * Forgot password form schema
 */
export const ForgotPasswordFormSchema = object({
  email: EmailSchema,
})

/**
 * Sign-in form schema
 */
export const SignInSchema = object({
  email: EmailSchema,
  password: pipe(string(VALIDATION.REQUIRED), minLength(1, 'Password is required.')),
})

/**
 * Open sign-up form schema
 */
export const SignUpFormSchema = object({
  name: pipe(
    string(VALIDATION.REQUIRED),
    minLength(1, VALIDATION.NAME_REQUIRED),
    maxLength(100, 'Name must be 100 characters or fewer'),
    custom(
      validateNameCharacters,
      'Name can only contain letters, numbers, hyphens, underscores, and spaces.',
    ),
  ),
  email: EmailSchema,
  password: pipe(
    string(VALIDATION.REQUIRED),
    minLength(8, VALIDATION.PASSWORD_MIN_LENGTH),
    maxLength(128, 'Password must be at most 128 characters long'),
  ),
})

/**
 * Gated sign-up form schema
 */
export const GatedSignUpFormSchema = object({
  code: pipe(
    string(VALIDATION.REQUIRED),
    minLength(8, 'Sign-up code must be at least 8 characters long.'),
    maxLength(64, 'Sign-up code is too long.'),
    custom((v) => typeof v === 'string' && v.trim().length > 0, 'Sign-up code is required'),
  ),
  name: pipe(
    string(VALIDATION.REQUIRED),
    minLength(1, VALIDATION.NAME_REQUIRED),
    maxLength(100, 'Name must be 100 characters or fewer'),
    custom(
      validateNameCharacters,
      'Name can only contain letters, numbers, hyphens, underscores, and spaces.',
    ),
  ),
  email: EmailSchema,
  password: pipe(
    string(VALIDATION.REQUIRED),
    minLength(8, VALIDATION.PASSWORD_MIN_LENGTH),
    maxLength(128, 'Password must be at most 128 characters long'),
  ),
})

/**
 * Resend verification email form schema
 */
export const ResendEmailFormSchema = object({
  email: EmailSchema,
})

/**
 * Reset password form schema
 */
export const ResetPasswordFormSchema = pipe(
  object({
    token: pipe(
      string(VALIDATION.REQUIRED),
      minLength(1, 'Invalid reset token. Please request a new password reset link.'),
    ),
    password: pipe(string(VALIDATION.REQUIRED), minLength(8, VALIDATION.PASSWORD_MIN_LENGTH)),
    confirmPassword: pipe(
      string(VALIDATION.REQUIRED),
      minLength(8, VALIDATION.PASSWORD_MIN_LENGTH),
    ),
  }),
  custom((data) => {
    const d = data as { password: string; confirmPassword: string }
    return d && d.password === d.confirmPassword
  }, 'Passwords do not match. Please try again.'),
)

/**
 * Change password form schema (for profile page)
 */
export const ChangePasswordFormSchema = pipe(
  object({
    currentPassword: pipe(
      string(VALIDATION.REQUIRED),
      minLength(1, 'Current password is required.'),
    ),
    newPassword: pipe(string(VALIDATION.REQUIRED), minLength(8, VALIDATION.PASSWORD_MIN_LENGTH)),
    confirmPassword: pipe(
      string(VALIDATION.REQUIRED),
      minLength(8, VALIDATION.PASSWORD_MIN_LENGTH),
    ),
    userInfo: optional(
      pipe(
        string(),
        custom(
          (v) =>
            typeof v === 'string' &&
            (v.trim() === '' || (/^\s*\d+\s*$/.test(v) && parseInt(v, 10) >= 0)),
          'User information must be a non-negative number.',
        ),
      ),
    ),
  }),
  custom((data) => {
    const d = data as { newPassword: string; confirmPassword: string }
    return d && d.newPassword === d.confirmPassword
  }, 'New passwords do not match. Please try again.'),
)

// const descriptionMax = 500 // PRODUCTION:UNCOMMENT
const descriptionMax = 502

// const categoryNameMax = 100 // PRODUCTION:UNCOMMENT
const categoryNameMax = 102

// const tagNameMax = 100 // PRODUCTION:UNCOMMENT
const tagNameMax = 102

const VALID_PERIODS = ['daily', 'weekly', 'monthly', 'yearly']

/**
 * Expense create/update form schema
 */
export const ExpenseFormSchema = object({
  amount: pipe(
    string('Amount is required.'),
    minLength(1, 'Amount is required.'),
    custom(
      (v) =>
        typeof v === 'string' && /^\d+(\.\d{1,2})?$/.test(v.trim()) && parseFloat(v.trim()) > 0,
      'Amount must be a positive number (e.g. 12.50).',
    ),
  ),
  date: pipe(
    string('Date is required.'),
    minLength(1, 'Date is required.'),
    custom(
      (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim()),
      'Date must be in YYYY-MM-DD format.',
    ),
  ),
  description: pipe(
    string('Description is required.'),
    minLength(1, 'Description is required.'),
    maxLength(descriptionMax, 'Description must be 500 characters or fewer.'),
  ),
  categoryId: optional(pipe(string())),
  newCategory: optional(
    pipe(string(), maxLength(categoryNameMax, 'Category name must be 100 characters or fewer.')),
  ),
  tags: optional(pipe(string())),
  newTags: optional(pipe(string())),
})

/**
 * Category name schema
 */
export const CategoryNameSchema = object({
  name: pipe(
    string('Category name is required.'),
    minLength(1, 'Category name is required.'),
    maxLength(categoryNameMax, 'Category name must be 100 characters or fewer.'),
  ),
})

/**
 * Tag name schema
 */
export const TagNameSchema = object({
  name: pipe(
    string('Tag name is required.'),
    minLength(1, 'Tag name is required.'),
    maxLength(tagNameMax, 'Tag name must be 100 characters or fewer.'),
  ),
})

/**
 * Recurring expense form schema
 */
export const RecurringExpenseFormSchema = object({
  amount: pipe(
    string('Amount is required.'),
    minLength(1, 'Amount is required.'),
    custom(
      (v) =>
        typeof v === 'string' && /^\d+(\.\d{1,2})?$/.test(v.trim()) && parseFloat(v.trim()) > 0,
      'Amount must be a positive number (e.g. 12.50).',
    ),
  ),
  description: pipe(
    string('Description is required.'),
    minLength(1, 'Description is required.'),
    maxLength(descriptionMax, 'Description must be 500 characters or fewer.'),
  ),
  period: pipe(
    string('Period is required.'),
    minLength(1, 'Period is required.'),
    custom(
      (v) => typeof v === 'string' && VALID_PERIODS.includes(v.trim()),
      'Period must be one of: daily, weekly, monthly, yearly.',
    ),
  ),
  nextRunDate: pipe(
    string('Next run date is required.'),
    minLength(1, 'Next run date is required.'),
    custom(
      (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim()),
      'Next run date must be in YYYY-MM-DD format.',
    ),
  ),
  categoryId: optional(pipe(string())),
  newCategory: optional(
    pipe(string(), maxLength(categoryNameMax, 'Category name must be 100 characters or fewer.')),
  ),
})

/**
 * Dynamic path parameter validation schemas
 */
export const PathSignInValidationParamSchema = object({
  validationSuccessful: optional(
    pipe(
      string(),
      custom((v) => v === 'true', 'Invalid validation flag.'),
    ),
  ),
})

/**
 * Helper function to validate request data against a schema
 * @param data - The data to validate
 * @param schema - The schema to validate against
 * @returns A tuple with [isValid, result, error]
 */
export function validateRequest<T extends BaseSchema<unknown, unknown, BaseIssue<unknown>>>(
  data: unknown,
  schema: T,
): [boolean, InferOutput<T> | null, string | null] {
  const result = safeParse(schema, data)

  if (result.success) {
    return [true, result.output, null]
  } else {
    // Extract human-readable error message from validation error
    let errorMessage = result.issues
      .map((issue) => issue.message || `Invalid ${issue.path?.map((p) => p.key).join('.')}`)
      .join(', ')
    if (errorMessage?.startsWith('Invalid type: Expected unknown')) {
      errorMessage = VALIDATION.EMAIL_INVALID
    }

    return [false, null, errorMessage]
  }
}
