/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Context } from 'hono'

import type { Bindings } from '../local-types'

/**
 * Returns the current time as a Date object. Use this instead of calling new Date() directly.
 * Optionally, pass arguments to forward to Date constructor.
 * @module lib/time-access
 */

export const getCurrentTime = (c: Context, ...args: (string | number | Date)[]): Date => {
    if (args.length === 0) {
      return new Date()
    }

    return new Date(...(args as ConstructorParameters<typeof Date>))
 } 
