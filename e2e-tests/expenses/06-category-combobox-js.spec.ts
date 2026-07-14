import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedCategories } from '../support/db-helpers'

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

test.describe('Category combobox (JS-on)', () => {
  test(
    'typing filters and ArrowDown+Enter selects an existing category',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'groceries' }, { name: 'utilities' }])
      await signInAndGoToExpenses(page)

      const categoryInput = page.getByTestId('expense-form-category')
      await categoryInput.click()
      await categoryInput.fill('gr')

      const dropdown = page.getByTestId('category-combobox-dropdown')
      await expect(dropdown).toBeVisible()
      await expect(page.getByTestId('category-combobox-option-groceries')).toBeVisible()
      await expect(page.getByTestId('category-combobox-option-utilities')).toHaveCount(0)

      await categoryInput.press('ArrowDown')
      await categoryInput.press('Enter')

      await expect(categoryInput).toHaveValue('groceries')

      await page.getByTestId('expense-form-description').fill('Weekly shop')
      await page.getByTestId('expense-form-amount').fill('42.50')
      await page.getByTestId('expense-form-date').fill(todayEt())
      await page.getByTestId('expense-form-create').click()

      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('confirm-create-new-page')).toHaveCount(0)
      const row = page.getByTestId('expense-row').filter({ hasText: 'Weekly shop' })
      await expect(row).toHaveCount(1)
      await expect(row.getByTestId('expense-row-category')).toHaveText('groceries')
    }),
  )

  test(
    'typing a brand-new name surfaces the Create row and routes through confirmation',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'groceries' }, { name: 'utilities' }])
      await signInAndGoToExpenses(page)

      const categoryInput = page.getByTestId('expense-form-category')
      await categoryInput.click()
      await categoryInput.fill('rent')

      const createRow = page.getByTestId('category-combobox-create')
      await expect(createRow).toBeVisible()
      await expect(createRow).toContainText("'rent'")

      await createRow.click()
      await expect(categoryInput).toHaveValue('rent')

      await page.getByTestId('expense-form-description').fill('Rent payment')
      await page.getByTestId('expense-form-amount').fill('1000')
      await page.getByTestId('expense-form-date').fill(todayEt())
      await page.getByTestId('expense-form-create').click()

      await expect(page.getByTestId('confirm-create-new-page')).toBeVisible()
      await expect(page.getByTestId('confirm-create-new-category-line')).toContainText("'rent'")
      await page.getByTestId('confirm-create-new-confirm').click()

      await page.waitForURL(BASE_URLS.EXPENSES)
      const row = page.getByTestId('expense-row').filter({ hasText: 'Rent payment' })
      await expect(row).toHaveCount(1)
      await expect(row.getByTestId('expense-row-category')).toHaveText('rent')
    }),
  )
})
