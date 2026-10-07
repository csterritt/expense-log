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

const navigationCount = async (page: any): Promise<number> =>
  page.evaluate(() => performance.getEntriesByType('navigation').length)

test.describe('Expense entry form — resilient submit exhaustion UX', () => {
  test(
    'keeps a fully completed form ready for manual retry after five failed attempts',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'Food',
          tagNames: ['Groceries', 'Work'],
        },
      ])
      await signInAndGoToExpenses(page)

      await page.getByTestId('expense-form-description').fill('Exhaustion retry')
      await page.getByTestId('expense-form-amount').fill('12.34')
      await page.getByTestId('expense-form-date').fill(todayEt())
      await page.getByTestId('expense-form-category').fill('New category')
      const expenseForm = page.getByTestId('expense-form')
      await expenseForm.getByTestId('tag-chip-Groceries').click()
      await expenseForm.getByTestId('tag-chip-Work').click()
      await page.getByTestId('new-tags-input').fill('New tag')

      const beforeNavigationCount = await navigationCount(page)
      let postCount = 0
      const failAllPosts = async (route: any) => {
        if (route.request().method() !== 'POST') {
          await route.continue()
          return
        }
        postCount += 1
        await route.fulfill({ status: 503, body: 'Temporary failure' })
      }
      await page.route(BASE_URLS.EXPENSES, failAllPosts)

      await page.getByTestId('expense-form-create').click()

      const errorBanner = page.getByTestId('expense-form-exhaustion-error')
      await expect(errorBanner).toBeVisible()
      await expect(errorBanner).toContainText('could not be completed')
      await expect(page.getByTestId('expense-form-create')).toBeEnabled()
      expect(postCount).toBe(5)
      expect(await navigationCount(page)).toBe(beforeNavigationCount)
      await expect(page.getByTestId('expense-form-description')).toHaveValue('Exhaustion retry')
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('12.34')
      await expect(page.getByTestId('expense-form-date')).toHaveValue(todayEt())
      await expect(page.getByTestId('expense-form-category')).toHaveValue('New category')
      await expect(expenseForm.getByTestId('tag-chip-Groceries').locator('input')).toBeChecked()
      await expect(expenseForm.getByTestId('tag-chip-Work').locator('input')).toBeChecked()
      await expect(page.getByTestId('new-tags-input')).toHaveValue('New tag')

      await page.unroute(BASE_URLS.EXPENSES, failAllPosts)
      await page.getByTestId('expense-form-create').click()
      await expect(page.getByTestId('confirm-create-new-page')).toBeVisible()
      await page.getByTestId('confirm-create-new-confirm').click()
      await expect(page.getByTestId('expense-row-description').first()).toHaveText(
        'Exhaustion retry',
      )
    }),
  )
})
