import { test, expect } from '@playwright/test'

import { BASE_URLS, ERROR_MESSAGES } from '../support/test-data'
import { verifyAlert } from '../support/finders'
import { verifyOnSignInPage } from '../support/page-verifiers'

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
})
