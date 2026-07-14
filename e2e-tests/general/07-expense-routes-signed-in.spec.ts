import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'

const ROUTES = [
  { path: '/expenses', heading: 'Expenses' },
  { path: '/categories', heading: 'Categories' },
  { path: '/tags', heading: 'Tags' },
  { path: '/summary', heading: 'Summary' },
  { path: '/recurring', heading: 'Recurring' },
] as const

test.describe('Expense feature routes: signed-in headings and empty state', () => {
  for (const { path, heading } of ROUTES) {
    test(
      `signed-in visit to ${path} renders expected heading`,
      testWithDatabase(async ({ page }) => {
        await page.goto(BASE_URLS.SIGN_IN)
        await submitSignInForm(page, TEST_USERS.KNOWN_USER)

        const response = await page.goto(`${BASE_URLS.HOME}${path}`)
        expect(response?.status()).toBe(200)
        expect(await page.locator('h1').textContent()).toBe(heading)
      }),
    )
  }

  test(
    'signed-in /expenses renders the empty-state message',
    testWithDatabase(async ({ page }) => {
      await page.goto(BASE_URLS.SIGN_IN)
      await submitSignInForm(page, TEST_USERS.KNOWN_USER)

      await page.goto(`${BASE_URLS.HOME}/expenses`)
      const emptyState = page.getByTestId('expenses-empty-state')
      await expect(emptyState).toBeVisible()
      await expect(emptyState).toHaveText('No expenses yet')
    }),
  )
})
