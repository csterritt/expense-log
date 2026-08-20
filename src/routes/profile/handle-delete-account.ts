/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route handler for account deletion requests from profile page.
 * @module routes/profile/handleDeleteAccount
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { redirectWithMessage, redirectWithError } from '../../lib/redirects'
import { PATHS, STANDARD_SECURE_HEADERS } from '../../constants'
import type { AuthUser, Bindings, DrizzleClient } from '../../local-types'
import { signedInAccess } from '../../middleware/signed-in-access'
import { deleteUserAccount } from '../../lib/db/auth-access'
import { createAuth } from '../../lib/auth'
import { logError, logInfo, sanitizeError } from '../../lib/logger'

/**
 * Attach the delete account handler to the app.
 * @param app - Hono app instance
 */
export const handleDeleteAccount = (app: Hono<{ Bindings: Bindings }>): void => {
  app.post(
    PATHS.PROFILE_DELETE,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context) => {
      try {
        const user = c.get('user') as AuthUser
        const db = c.get('db') as DrizzleClient

        if (!user || !user.id) {
          logError('Delete account: No user found in session')
          return redirectWithError(c, PATHS.AUTH.SIGN_IN, 'Please sign in to delete your account.')
        }

        const userId = user.id
        logInfo('Deleting account', { userId })

        const result = await deleteUserAccount(db, userId)

        if (result.isErr) {
          logError('Delete account error', { userId, error: sanitizeError(result.error) })
          return redirectWithError(
            c,
            PATHS.PROFILE,
            'An error occurred while deleting your account. Please try again.',
          )
        }

        if (!result.value) {
          logError('Delete account: User not found in database', { userId })
          return redirectWithError(c, PATHS.PROFILE, 'Unable to delete account. Please try again.')
        }

        logInfo('Account deleted successfully', { userId })

        const authUrl = new URL(c.req.url)
        authUrl.pathname = '/api/auth/sign-out'
        const authResponse = await createAuth(c.env).handler(
          new Request(authUrl.toString(), {
            method: 'POST',
            headers: c.req.raw.headers,
          }),
        )
        const redirectResponse = redirectWithMessage(
          c,
          PATHS.AUTH.SIGN_IN,
          'Your account has been successfully deleted.',
        )
        const allCookieHeaders = authResponse.headers.getSetCookie?.() || []
        allCookieHeaders.forEach((cookie) => {
          redirectResponse.headers.append('Set-Cookie', cookie)
        })

        return redirectResponse
      } catch (error) {
        logError('Delete account handler error', { error: sanitizeError(error) })
        return redirectWithError(c, PATHS.PROFILE, 'An error occurred. Please try again.')
      }
    },
  )
}
