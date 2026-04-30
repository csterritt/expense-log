import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedExpenses } from '../support/db-helpers'

const todayEt = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

const signInAndGoToExpenses = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
  await page.goto(BASE_URLS.EXPENSES)
}

test.describe('Edit expense (no new items)', () => {
  // Pin to the no-JS path so the chip picker / combobox don't transform inputs.
  test.use({ javaScriptEnabled: false })

  test(
    'edit page pre-populates every field from the existing expense',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'Weekly shop',
          amountCents: 4250,
          categoryName: 'food',
          tagNames: ['groceries', 'dairy'],
        },
      ])

      await signInAndGoToExpenses(page)

      const row = page.getByTestId('expense-row').first()
      await row.getByTestId('expense-row-edit').click()

      await expect(page.getByTestId('expense-edit-page')).toBeVisible()
      await expect(page).toHaveURL(/\/expenses\/[^/]+\/edit$/)
      await expect(page.getByTestId('expense-form-description')).toHaveValue('Weekly shop')
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('42.50')
      await expect(page.getByTestId('expense-form-date')).toHaveValue(todayEt())
      await expect(page.getByTestId('expense-form-category')).toHaveValue('food')
      // Tags joined as alphabetized CSV.
      await expect(page.getByTestId('expense-form-tags')).toHaveValue('dairy, groceries')
      await expect(page.getByTestId('expense-form-save')).toBeVisible()
    }),
  )

  test(
    'changing the amount saves and shows the updated row',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'Weekly shop',
          amountCents: 4250,
          categoryName: 'food',
          tagNames: ['groceries'],
        },
      ])

      await signInAndGoToExpenses(page)
      await page.getByTestId('expense-row-edit').first().click()

      await page.getByTestId('expense-form-amount').fill('12.34')
      await page.getByTestId('expense-form-save').click()

      await page.waitForURL(BASE_URLS.EXPENSES)
      const row = page.getByTestId('expense-row').filter({ hasText: 'Weekly shop' })
      await expect(row).toHaveCount(1)
      await expect(row.getByTestId('expense-row-amount')).toHaveText('12.34')
      await expect(row.getByTestId('expense-row-description')).toHaveText('Weekly shop')
      await expect(row.getByTestId('expense-row-category')).toHaveText('food')
      await expect(row.getByTestId('expense-row-tags')).toHaveText('groceries')
    }),
  )

  test(
    'changing description and date saves both fields',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'Old desc',
          amountCents: 1000,
          categoryName: 'food',
          tagNames: [],
        },
      ])

      await signInAndGoToExpenses(page)
      await page.getByTestId('expense-row-edit').first().click()

      // Pick a date within the default 2-month range (yesterday in ET).
      const yesterday = new Date()
      yesterday.setUTCDate(yesterday.getUTCDate() - 1)
      const newDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(yesterday)

      await page.getByTestId('expense-form-description').fill('New desc')
      await page.getByTestId('expense-form-date').fill(newDate)
      await page.getByTestId('expense-form-save').click()

      await page.waitForURL(BASE_URLS.EXPENSES)
      const row = page.getByTestId('expense-row').filter({ hasText: 'New desc' })
      await expect(row).toHaveCount(1)
      await expect(row.getByTestId('expense-row-date')).toHaveText(newDate)
      await expect(row.getByTestId('expense-row-description')).toHaveText('New desc')
    }),
  )

  test(
    'unknown id redirects back to /expenses with an error',
    testWithDatabase(async ({ page }) => {
      await signInAndGoToExpenses(page)
      await page.goto('http://localhost:3000/expenses/no-such-id/edit')
      await page.waitForURL(BASE_URLS.EXPENSES)
      // No edit page rendered.
      await expect(page.getByTestId('expense-edit-page')).toHaveCount(0)
    }),
  )
})
