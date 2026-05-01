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

test.describe('Delete expense', () => {
  test.use({ javaScriptEnabled: false })

  test(
    'cancel from delete page returns to edit and makes no changes',
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
      const editUrl = page.url()

      await page.getByTestId('expense-edit-delete').click()

      const confirmPage = page.getByTestId('confirm-delete-expense-page')
      await expect(confirmPage).toBeVisible()
      await expect(page.getByTestId('confirm-delete-expense-date')).toHaveText(todayEt())
      await expect(page.getByTestId('confirm-delete-expense-description')).toHaveText('Weekly shop')
      await expect(page.getByTestId('confirm-delete-expense-amount')).toHaveText('42.50')
      await expect(page.getByTestId('confirm-delete-expense-category')).toHaveText('food')
      await expect(page.getByTestId('confirm-delete-expense-tags')).toHaveText('groceries')

      await page.getByTestId('confirm-delete-expense-cancel').click()
      await page.waitForURL(editUrl)
      await expect(page.getByTestId('expense-edit-page')).toBeVisible()

      // Row still exists.
      await page.goto(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('expense-row')).toHaveCount(1)
    }),
  )

  test(
    'confirm deletes the expense and removes its row from the list',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'Weekly shop',
          amountCents: 4250,
          categoryName: 'food',
          tagNames: ['groceries'],
        },
        {
          date: todayEt(),
          description: 'Other',
          amountCents: 1000,
          categoryName: 'food',
          tagNames: [],
        },
      ])

      await signInAndGoToExpenses(page)
      await expect(page.getByTestId('expense-row')).toHaveCount(2)

      // Edit the "Weekly shop" row specifically.
      const targetRow = page.getByTestId('expense-row').filter({ hasText: 'Weekly shop' })
      await targetRow.getByTestId('expense-row-edit').click()

      await page.getByTestId('expense-edit-delete').click()
      await expect(page.getByTestId('confirm-delete-expense-page')).toBeVisible()
      await page.getByTestId('confirm-delete-expense-confirm').click()

      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('expense-row').filter({ hasText: 'Weekly shop' })).toHaveCount(
        0,
      )
      await expect(page.getByTestId('expense-row')).toHaveCount(1)
      await expect(page.getByTestId('expense-row').filter({ hasText: 'Other' })).toHaveCount(1)
    }),
  )

  test(
    'unknown id on delete GET redirects back to /expenses',
    testWithDatabase(async ({ page }) => {
      await signInAndGoToExpenses(page)
      await page.goto('http://localhost:3000/expenses/no-such-id/delete')
      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('confirm-delete-expense-page')).toHaveCount(0)
    }),
  )
})
