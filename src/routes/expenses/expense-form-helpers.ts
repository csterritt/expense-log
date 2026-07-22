/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Helper functions for expense form handling.
 * @module routes/expenses/expense-form-helpers
 */

import { Context } from 'hono'
import { Bindings, AuthUser } from '../../local-types'
import { PATHS } from '../../constants'
import type { SubmissionOutcome } from '../../lib/submission-idempotency'
import type { ExpenseFormState } from './expense-form'

/**
 * The canonical success outcome for a committed expense create — the
 * post-redirect-get target plus its flash message. Shared by the direct-create
 * and confirm-create handlers so a replayed submit reproduces the same result.
 */
export const EXPENSE_ADDED_OUTCOME: SubmissionOutcome = {
  path: PATHS.EXPENSES,
  message: 'Expense added.',
}

/**
 * Read the signed-in user's id from the request context. Callers are behind
 * the `signedInAccess` middleware, so `user` is guaranteed present.
 *
 * @param c - The Hono context
 * @returns The signed-in user's id
 */
export const requireUserId = (c: Context<{ Bindings: Bindings }>): string =>
  (c.get('user') as AuthUser).id

/**
 * Creates an empty expense form state with default values.
 *
 * @param today - Today's date in ET format
 * @returns An empty expense form state
 */
export const emptyState = (today: string): ExpenseFormState => ({
  fieldErrors: {},
  values: {
    description: '',
    amount: '',
    date: today,
    category: '',
    tags: '',
    tagIds: [],
    newTags: '',
  },
})

/**
 * Reads and parses the raw form body from a request.
 *
 * @param c - The Hono context
 * @returns The parsed form values as strings
 */
export const readRawBody = async (c: Context<{ Bindings: Bindings }>) => {
  const form = await c.req.parseBody({ all: true })
  const rawTagId = form['tagId']
  const tagId: string[] = Array.isArray(rawTagId)
    ? rawTagId.filter((v): v is string => typeof v === 'string')
    : typeof rawTagId === 'string'
      ? [rawTagId]
      : []
  return {
    description: typeof form.description === 'string' ? form.description : '',
    amount: typeof form.amount === 'string' ? form.amount : '',
    date: typeof form.date === 'string' ? form.date : '',
    category: typeof form.category === 'string' ? form.category : '',
    tags: typeof form.tags === 'string' ? form.tags : '',
    tagId,
    newTags: typeof form.newTags === 'string' ? form.newTags : '',
    action: typeof form.action === 'string' ? form.action : '',
    submissionKey: typeof form.submissionKey === 'string' ? form.submissionKey : '',
  }
}
