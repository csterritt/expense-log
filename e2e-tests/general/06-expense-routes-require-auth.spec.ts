import { test, expect } from '@playwright/test'

import { BASE_URLS, ERROR_MESSAGES } from '../support/test-data'
import { verifyAlert } from '../support/finders'
import { verifyOnSignInPage } from '../support/page-verifiers'
import { testWithDatabase } from '../support/test-helpers'

const EXPENSE_PATHS = ['/expenses', '/categories', '/tags', '/summary', '/recurring'] as const

test.describe('Expense feature routes: unauthenticated redirects', () => {
  for (const path of EXPENSE_PATHS) {
    test(`visiting ${path} signed out redirects to sign-in with auth error`, async ({ page }) => {
      await page.goto(`${BASE_URLS.HOME}${path}`)

      expect(page.url()).toContain('/auth/sign-in')
      await verifyOnSignInPage(page)
      await verifyAlert(page, ERROR_MESSAGES.MUST_SIGN_IN)
    })
  }

  test(
    'direct Better Auth signup is not publicly available',
    testWithDatabase(async ({ request }) => {
      const response = await request.post('/api/auth/sign-up/email', {
        data: {
          name: 'Raw API Signup',
          email: 'raw-api-signup@example.com',
          password: 'raw-api-password-123',
        },
      })

      expect(response.status()).toBe(404)
    }),
  )
})
