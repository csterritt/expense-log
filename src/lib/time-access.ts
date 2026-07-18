/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Context } from 'hono'

import { addCookie, removeCookie, retrieveCookie } from './cookie-support' // PRODUCTION:REMOVE
import type { Bindings } from '../local-types'

/**
 * Returns the current time as a Date object. Use this instead of calling new Date() directly.
 * Optionally, pass arguments to forward to Date constructor.
 * @module lib/time-access
 */

export const getCurrentTime = (c: Context, ...args: (string | number | Date)[]): Date => {
  const isTestMode = (c as Context<{ Bindings: Bindings }>).env?.NODE_ENV === 'development' // PRODUCTION:REMOVE
   // PRODUCTION:REMOVE-NEXT-LINE
  if (!isTestMode) {
    if (args.length === 0) {
      return new Date()
    }

    return new Date(...(args as ConstructorParameters<typeof Date>))
  } // PRODUCTION:REMOVE
// } // PRODUCTION:UNCOMMENT
// PRODUCTION:STOP

  const ds = retrieveCookie(c, 'delta')
  const delta = parseInt(ds == null || ds.toString().trim() === '' ? '0' : ds)
  if (args.length === 0) {
    return new Date(new Date().getTime() + delta)
  }

  return new Date(new Date(...(args as ConstructorParameters<typeof Date>)).getTime() + delta)
}

export const setCurrentDelta = (c: Context, delta: number): void => {
  addCookie(c, 'delta', String(delta))
}

export const clearCurrentDelta = (c: Context): void => {
  removeCookie(c, 'delta')
}
