/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route handler for updating a tag name.
 * @module routes/tags/handleUpdateTag
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS, EXPENSE_MESSAGES, MESSAGES } from '../../constants'
import type { Bindings, DrizzleClient } from '../../local-types'
import { signedInAccess } from '../../middleware/signed-in-access'
import { redirectWithMessage, redirectWithError } from '../../lib/redirects'
import { validateRequest, TagNameSchema } from '../../lib/validators'
import { updateTag } from '../../lib/expense-db-access'

/**
 * Attach the update tag handler to the app.
 */
export const handleUpdateTag = (app: Hono<{ Bindings: Bindings }>): void => {
  app.post(
    PATHS.TAGS.EDIT,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context) => {
      try {
        const id = c.req.param('id') ?? ''
        const db = c.get('db') as DrizzleClient

        const body = await c.req.parseBody()
        const [ok, data, err] = validateRequest(body, TagNameSchema)

        if (!ok) {
          const commaSpot = err?.indexOf(',') ?? -1
          const errorMsg = commaSpot > -1 ? err!.substring(0, commaSpot) : (err ?? MESSAGES.INVALID_INPUT)
          return redirectWithError(c, PATHS.TAGS.LIST, errorMsg)
        }

        const { name } = data as { name: string }

        const result = await updateTag(db, id, name.trim())

        if (result.isErr) {
          console.error('Update tag error:', result.error)
          return redirectWithError(c, PATHS.TAGS.LIST, MESSAGES.GENERIC_ERROR_TRY_AGAIN)
        }

        if (!result.value) {
          return redirectWithError(c, PATHS.TAGS.LIST, 'Tag not found.')
        }

        return redirectWithMessage(c, PATHS.TAGS.LIST, EXPENSE_MESSAGES.TAG_UPDATED)
      } catch (error) {
        console.error('Update tag handler error:', error)
        return redirectWithError(c, PATHS.TAGS.LIST, MESSAGES.GENERIC_ERROR_TRY_AGAIN)
      }
    }
  )
}
