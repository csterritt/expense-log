import { expect, test } from '@playwright/test'

import { clickLink, fillInput } from '../support/finders'
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
  'can navigate to edit expense page',
  testWithExpenses(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.EXPENSES)

    await clickLink(page, 'edit-expense-exp-001')

    expect(page.url()).toContain('/expenses/')
    expect(page.url()).toContain('/edit')
  }),
)

test(
  'edit expense form is pre-filled with existing values',
  testWithExpenses(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.EXPENSES)
    await clickLink(page, 'edit-expense-exp-001')

    const amountInput = page.getByTestId('expense-amount-input')
    const descriptionInput = page.getByTestId('expense-description-input')

    await expect(amountInput).toHaveValue('12.50')
    await expect(descriptionInput).toHaveValue('Lunch at cafe')
  }),
)

test(
  'can update an expense description',
  testWithExpenses(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.EXPENSES)
    await clickLink(page, 'edit-expense-exp-001')

    await fillInput(page, 'expense-description-input', 'Updated lunch description')
    await clickLink(page, 'update-expense-action')

    expect(page.url()).toContain('/expenses')
    await expect(page.getByRole('alert')).toHaveText('Expense updated successfully.')
    await expect(page.getByTestId('expense-history')).toContainText('Updated lunch description')
  }),
)
