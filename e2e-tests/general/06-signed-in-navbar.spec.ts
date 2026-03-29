import { expect, test } from '@playwright/test'

import { isElementVisible } from '../support/finders'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { TEST_USERS, BASE_URLS } from '../support/test-data'

test.describe('Signed-in Navbar Links', () => {
  test(
    'navbar shows expense-related links when signed in',
    testWithDatabase(async ({ page }) => {
      await page.goto(BASE_URLS.SIGN_IN)
      await submitSignInForm(page, TEST_USERS.KNOWN_USER)

      await page.goto(BASE_URLS.HOME)

      expect(await isElementVisible(page, 'nav-expenses-action')).toBe(true)
      expect(await isElementVisible(page, 'nav-categories-action')).toBe(true)
      expect(await isElementVisible(page, 'nav-tags-action')).toBe(true)
      expect(await isElementVisible(page, 'nav-recurring-action')).toBe(true)
      expect(await isElementVisible(page, 'nav-summary-action')).toBe(true)
    }),
  )

  test(
    'navbar expense link navigates to expenses page',
    testWithDatabase(async ({ page }) => {
      await page.goto(BASE_URLS.SIGN_IN)
      await submitSignInForm(page, TEST_USERS.KNOWN_USER)

      await page.goto(BASE_URLS.HOME)
      await page.click('[data-testid="nav-expenses-action"]')
      expect(page.url()).toContain('/expenses')
    }),
  )

  test('navbar does not show expense links when signed out', async ({ page }) => {
    await page.goto(BASE_URLS.HOME)

    expect(await isElementVisible(page, 'nav-expenses-action')).toBe(false)
    expect(await isElementVisible(page, 'nav-categories-action')).toBe(false)
    expect(await isElementVisible(page, 'nav-tags-action')).toBe(false)
    expect(await isElementVisible(page, 'nav-recurring-action')).toBe(false)
    expect(await isElementVisible(page, 'nav-summary-action')).toBe(false)
  })
})
