import { expect, test } from '@playwright/test'

import { isElementVisible } from '../support/finders'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { clearExpenses, seedExpenses } from '../support/db-helpers'
import { TEST_USERS, BASE_URLS } from '../support/test-data'

const testWithExpenses = (
  testFn: ({ page, request }: { page: any; request: any }) => Promise<void>
) => {
  return testWithDatabase(async ({ page, request }) => {
    await seedExpenses()
    await testFn({ page, request })
    await clearExpenses()
  })
}

test(
  'can view expense summary page when signed in',
  testWithDatabase(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.EXPENSES_SUMMARY)
    expect(page.url()).toContain('/expenses/summary')
    expect(await isElementVisible(page, 'summary-page')).toBe(true)
  })
)

test('redirects to sign-in when accessing summary without auth', async ({ page }) => {
  await page.goto(BASE_URLS.EXPENSES_SUMMARY)
  expect(page.url()).toContain('/auth/sign-in')
})

test(
  'summary page shows totals per category',
  testWithExpenses(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.EXPENSES_SUMMARY)

    await expect(page.getByTestId('summary-page')).toContainText('Food')
    await expect(page.getByTestId('summary-page')).toContainText('Transport')
    await expect(page.getByTestId('summary-page')).toContainText('$12.50')
    await expect(page.getByTestId('summary-page')).toContainText('$35.00')
  })
)

test(
  'summary page shows totals per tag',
  testWithExpenses(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.EXPENSES_SUMMARY)

    await expect(page.getByTestId('summary-page')).toContainText('work')
    await expect(page.getByTestId('summary-page')).toContainText('personal')
  })
)

test(
  'summary page shows overall total',
  testWithExpenses(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.EXPENSES_SUMMARY)

    await expect(page.getByTestId('summary-total')).toContainText('$47.50')
  })
)
