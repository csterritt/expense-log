import { expect, test } from '@playwright/test'

import { clickLink } from '../support/finders'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedExpenses, clearExpenses } from '../support/db-helpers'
import { TEST_USERS, BASE_URLS } from '../support/test-data'

const testWithExpenses = (
  testFn: ({ page, request }: { page: any; request: any }) => Promise<void>,
) => {
  return testWithDatabase(async ({ page, request }) => {
    await seedExpenses()
    await testFn({ page, request })
    await clearExpenses()
  })
}

test(
  'can delete an expense and it is removed from the list',
  testWithExpenses(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.EXPENSES)

    await expect(page.getByTestId('expense-history')).toContainText('Lunch at cafe')

    await clickLink(page, 'delete-expense-exp-001')

    expect(page.url()).toContain('/expenses')
    await expect(page.getByRole('alert')).toHaveText('Expense deleted successfully.')
    await expect(page.getByTestId('expense-history')).not.toContainText('Lunch at cafe')
  }),
)

test(
  'other expenses remain after deleting one',
  testWithExpenses(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.EXPENSES)

    await clickLink(page, 'delete-expense-exp-001')

    await expect(page.getByTestId('expense-history')).toContainText('Monthly bus pass')
  }),
)
