import { test, expect } from '@playwright/test'

import { BASE_URLS, ERROR_MESSAGES } from '../support/test-data'
import { verifyAlert } from '../support/finders'
import { verifyOnSignInPage } from '../support/page-verifiers'
import { skipIfNotExactMode } from '../support/mode-helpers'
import type { SignUpMode } from '../support/mode-helpers'

const EXPENSE_PATHS = ['/expenses', '/categories', '/tags', '/summary', '/recurring'] as const

const PROTECTED_ROUTES = [
  { method: 'GET', path: '/expenses' },
  { method: 'POST', path: '/expenses' },
  { method: 'POST', path: '/expenses/confirm-create-new' },
  { method: 'GET', path: '/expenses/test-id/edit' },
  { method: 'POST', path: '/expenses/test-id/edit' },
  { method: 'POST', path: '/expenses/test-id/confirm-edit-new' },
  { method: 'GET', path: '/expenses/test-id/delete' },
  { method: 'POST', path: '/expenses/test-id/delete' },
  { method: 'GET', path: '/categories' },
  { method: 'POST', path: '/categories' },
  { method: 'POST', path: '/categories/test-id/rename' },
  { method: 'POST', path: '/categories/merge-confirm' },
  { method: 'POST', path: '/categories/test-id/delete' },
  { method: 'GET', path: '/tags' },
  { method: 'POST', path: '/tags' },
  { method: 'POST', path: '/tags/test-id/rename' },
  { method: 'POST', path: '/tags/merge-confirm' },
  { method: 'POST', path: '/tags/test-id/delete' },
  { method: 'GET', path: '/summary' },
  { method: 'GET', path: '/recurring' },
  { method: 'GET', path: '/recurring/new' },
  { method: 'POST', path: '/recurring' },
  { method: 'POST', path: '/recurring/confirm-create-new' },
  { method: 'GET', path: '/recurring/test-id/edit' },
  { method: 'POST', path: '/recurring/test-id/edit' },
  { method: 'POST', path: '/recurring/test-id/confirm-edit-new' },
  { method: 'GET', path: '/recurring/test-id/delete' },
  { method: 'POST', path: '/recurring/test-id/delete' },
  { method: 'GET', path: '/profile' },
  { method: 'POST', path: '/profile' },
  { method: 'GET', path: '/profile/delete-confirm' },
  { method: 'POST', path: '/profile/delete' },
] as const

const SIGN_UP_MODES = [
  'OPEN_SIGN_UP',
  'NO_SIGN_UP',
  'GATED_SIGN_UP',
  'INTEREST_SIGN_UP',
  'BOTH_SIGN_UP',
] as const satisfies readonly SignUpMode[]

test.describe('Authorization boundaries', () => {
  for (const path of EXPENSE_PATHS) {
    test(`visiting ${path} signed out redirects to sign-in with auth error`, async ({ page }) => {
      await page.goto(`${BASE_URLS.HOME}${path}`)

      expect(page.url()).toContain('/auth/sign-in')
      await verifyOnSignInPage(page)
      await verifyAlert(page, ERROR_MESSAGES.MUST_SIGN_IN)
    })
  }

  for (const { method, path } of PROTECTED_ROUTES) {
    test(`${method} ${path} rejects an unauthenticated request`, async ({ request }) => {
      const response = await request.fetch(path, {
        method,
        headers: { Origin: BASE_URLS.HOME },
        maxRedirects: 0,
      })

      expect(response.status()).toBe(303)
      expect(response.headers().location).toContain('/auth/sign-in')
    })
  }

  for (const mode of SIGN_UP_MODES) {
    test(`direct Better Auth signup is unavailable in ${mode}`, async ({ request }) => {
      await skipIfNotExactMode(mode)

      const response = await request.post('/api/auth/sign-up/email', {
        data: {
          name: 'Raw API Signup',
          email: `raw-api-signup-${mode.toLowerCase()}@example.com`,
          password: 'raw-api-password-123',
        },
      })

      expect(response.status()).toBe(404)
    })
  }

  test('explicitly enabled test routes are reachable by the E2E runner', async ({ request }) => {
    const response = await request.get('/test/sign-up-mode')

    expect(response.status()).toBe(200)
    expect(SIGN_UP_MODES).toContain((await response.text()).trim() as SignUpMode)
  })
})
