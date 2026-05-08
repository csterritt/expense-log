/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Helper functions for expense form handling.
 * @module routes/expenses/expense-form-helpers
 */

import { Context } from 'hono'
import { Bindings } from '../../local-types'
import type { ExpenseFormState } from './expense-form'

/**
 * Creates an empty expense form state with default values.
 *
 * @param today - Today's date in ET format
 * @returns An empty expense form state
 */
export const emptyState = (today: string): ExpenseFormState => ({
  fieldErrors: {},
  values: { description: '', amount: '', date: today, category: '', tags: '' },
})

/**
 * Reads and parses the raw form body from a request.
 *
 * @param c - The Hono context
 * @returns The parsed form values as strings
 */
export const readRawBody = async (c: Context<{ Bindings: Bindings }>) => {
  const form = await c.req.parseBody()
  return {
    description: typeof form.description === 'string' ? form.description : '',
    amount: typeof form.amount === 'string' ? form.amount : '',
    date: typeof form.date === 'string' ? form.date : '',
    category: typeof form.category === 'string' ? form.category : '',
    tags: typeof form.tags === 'string' ? form.tags : '',
    action: typeof form.action === 'string' ? form.action : '',
  }
}
