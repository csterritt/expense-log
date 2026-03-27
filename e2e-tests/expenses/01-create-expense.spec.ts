import { expect, test } from '@playwright/test'

import { clickLink, fillInput, isElementVisible } from '../support/finders'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { TEST_USERS, BASE_URLS } from '../support/test-data'

test(
  'can view expenses list page when signed in',
  testWithDatabase(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.EXPENSES)
    expect(page.url()).toContain('/expenses')
    expect(await isElementVisible(page, 'expenses-page')).toBe(true)
  })
)

test('redirects to sign-in when accessing expenses without auth', async ({ page }) => {
  await page.goto(BASE_URLS.EXPENSES)
  expect(page.url()).toContain('/auth/sign-in')
})

test(
  'can create a new expense with amount, date, and description',
  testWithDatabase(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.EXPENSES)

    await fillInput(page, 'expense-amount-input', '12.50')
    await fillInput(page, 'expense-date-input', '2025-03-01')
    await fillInput(page, 'expense-description-input', 'Coffee and snacks')
    await clickLink(page, 'create-expense-action')

    expect(page.url()).toContain('/expenses')
    await expect(page.getByRole('alert')).toHaveText('Expense added successfully.')
    await expect(page.getByTestId('expense-history')).toContainText('Coffee and snacks')
  })
)

test(
  'new expense appears in history list after creation',
  testWithDatabase(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.EXPENSES)

    await fillInput(page, 'expense-amount-input', '99.99')
    await fillInput(page, 'expense-date-input', '2025-03-15')
    await fillInput(page, 'expense-description-input', 'Team lunch')
    await clickLink(page, 'create-expense-action')

    await expect(page.getByTestId('expense-history')).toContainText('Team lunch')
    await expect(page.getByTestId('expense-history')).toContainText('$99.99')
  })
)

test(
  'can create expense with a new category typed in',
  testWithDatabase(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.EXPENSES)

    await fillInput(page, 'expense-amount-input', '25.00')
    await fillInput(page, 'expense-date-input', '2025-03-10')
    await fillInput(page, 'expense-description-input', 'Grocery run')
    await fillInput(page, 'expense-new-category-input', 'Groceries')
    await clickLink(page, 'create-expense-action')

    await expect(page.getByTestId('expense-history')).toContainText('Grocery run')
    await expect(page.getByTestId('expense-history')).toContainText('Groceries')
  })
)
