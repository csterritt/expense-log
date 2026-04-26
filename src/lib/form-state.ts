/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Single-use flash payload for re-rendering a form on the next GET after a
 * validation-failure redirect.
 *
 * The payload is stored in a dedicated cookie (`COOKIES.FORM_ERRORS`) as a
 * JSON string and consumed exactly once by the next GET handler. The GET
 * handler reads it via `readAndClearFormState` and threads it into the
 * template so inputs can be re-rendered with `value={formValues.xxx}` and
 * inline per-field error messages.
 *
 * @module lib/form-state
 */
import { Context } from 'hono'

import { COOKIES, HTML_STATUS } from '../constants'
import { Bindings } from '../local-types'
import { addCookie, removeCookie, retrieveCookie } from './cookie-support'
import type { FieldErrors } from './expense-validators'

/**
 * Per-field sticky values for the expense entry form. Each field is kept as a
 * string (exactly what the user typed) so the form can redisplay the raw
 * input without re-parsing.
 */
export type ExpenseFormValues = {
  description?: string
  amount?: string
  date?: string
  categoryId?: string
}

/**
 * The round-tripped payload. Generic enough to host other forms later; today
 * `values` is typed as `ExpenseFormValues`.
 */
export type FormState = {
  fieldErrors: FieldErrors
  values: ExpenseFormValues
}

/**
 * Redirect back to `redirectUrl` with `fieldErrors` + `values` stashed in a
 * single-use cookie. The next GET handler should call
 * `readAndClearFormState` to retrieve and clear it.
 */
export const redirectWithFormErrors = <E extends { Bindings: Bindings }>(
  c: Context<E>,
  redirectUrl: string,
  fieldErrors: FieldErrors,
  values: ExpenseFormValues,
): Response => {
  const payload: FormState = { fieldErrors, values }
  addCookie(c, COOKIES.FORM_ERRORS, encodeURIComponent(JSON.stringify(payload)))
  return c.redirect(redirectUrl, HTML_STATUS.SEE_OTHER)
}

/**
 * Read and clear the single-use form-state cookie. Returns `undefined` when
 * no cookie is present or the payload fails to parse.
 */
export const readAndClearFormState = <E extends { Bindings: Bindings }>(
  c: Context<E>,
): FormState | undefined => {
  const raw = retrieveCookie(c, COOKIES.FORM_ERRORS)
  if (!raw) {
    return undefined
  }
  removeCookie(c, COOKIES.FORM_ERRORS)
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as FormState
    if (!parsed || typeof parsed !== 'object') {
      return undefined
    }
    return {
      fieldErrors: parsed.fieldErrors ?? {},
      values: parsed.values ?? {},
    }
  } catch {
    return undefined
  }
}
