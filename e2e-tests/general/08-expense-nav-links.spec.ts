import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'

const NAV_LINKS = [
  { testId: 'expenses-nav', path: '/expenses', heading: 'Expenses' },
  { testId: 'categories-nav', path: '/categories', heading: 'Categories' },
  { testId: 'tags-nav', path: '/tags', heading: 'Tags' },
  { testId: 'summary-nav', path: '/summary', heading: 'Summary' },
  { testId: 'recurring-nav', path: '/recurring', heading: 'Recurring' },
] as const

test.describe('Header nav links for expense feature', () => {
  test('nav links are not visible when signed out', async ({ page }) => {
    await page.goto(BASE_URLS.HOME)
    for (const { testId } of NAV_LINKS) {
      await expect(page.getByTestId(testId)).toHaveCount(0)
    }
  })

  test(
    'nav links are visible when signed in',
    testWithDatabase(async ({ page }) => {
      await page.goto(BASE_URLS.SIGN_IN)
      await submitSignInForm(page, TEST_USERS.KNOWN_USER)

      for (const { testId } of NAV_LINKS) {
        await expect(page.getByTestId(testId)).toBeVisible()
      }
    }),
  )

  for (const { testId, path, heading } of NAV_LINKS) {
    test(
      `clicking ${testId} navigates to ${path}`,
      testWithDatabase(async ({ page }) => {
        await page.goto(BASE_URLS.SIGN_IN)
        await submitSignInForm(page, TEST_USERS.KNOWN_USER)

        await page.getByTestId(testId).first().click()
        await page.waitForURL(`**${path}`)
        expect(page.url()).toContain(path)
        expect(await page.locator('h1').textContent()).toBe(heading)
      }),
    )
  }
})
