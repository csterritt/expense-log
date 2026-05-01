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

test.describe('Edit expense — consolidated confirmation flow', () => {
  // Pin to the no-JS path so the chip picker / combobox don't transform inputs.
  test.use({ javaScriptEnabled: false })

  test(
    'adding a brand-new tag routes through confirmation and saves on confirm',
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

      // Append a brand-new tag.
      await page.getByTestId('expense-form-tags').fill('groceries, rent')
      await page.getByTestId('expense-form-save').click()

      await expect(page.getByTestId('confirm-edit-new-page')).toBeVisible()
      // No new category line.
      await expect(page.getByTestId('confirm-edit-new-category-line')).toHaveCount(0)
      const tagLines = page.getByTestId('confirm-edit-new-tag-line')
      await expect(tagLines).toHaveCount(1)
      await expect(tagLines.first()).toContainText("'rent'")
      // Preview is alphabetized.
      await expect(page.getByTestId('confirm-edit-new-tags')).toHaveText('groceries, rent')

      await page.getByTestId('confirm-edit-new-confirm').click()
      await page.waitForURL(BASE_URLS.EXPENSES)

      const row = page.getByTestId('expense-row').filter({ hasText: 'Weekly shop' })
      await expect(row).toHaveCount(1)
      await expect(row.getByTestId('expense-row-tags')).toHaveText('groceries, rent')
    }),
  )

  test(
    'cancel preserves typed values and makes no DB changes',
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

      // Brand-new category and brand-new tag.
      await page.getByTestId('expense-form-category').fill('Utilities')
      await page.getByTestId('expense-form-tags').fill('groceries, Internet')
      await page.getByTestId('expense-form-save').click()

      await expect(page.getByTestId('confirm-edit-new-page')).toBeVisible()
      await expect(page.getByTestId('confirm-edit-new-category-line')).toContainText("'utilities'")
      const tagLines = page.getByTestId('confirm-edit-new-tag-line')
      await expect(tagLines).toHaveCount(1)
      await expect(tagLines.first()).toContainText("'internet'")

      await page.getByTestId('confirm-edit-new-cancel').click()
      await page.waitForURL(editUrl)

      // Every typed value preserved.
      await expect(page.getByTestId('expense-form-description')).toHaveValue('Weekly shop')
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('42.50')
      await expect(page.getByTestId('expense-form-category')).toHaveValue('Utilities')
      await expect(page.getByTestId('expense-form-tags')).toHaveValue('groceries, Internet')

      // Go back to the list and confirm the row is unchanged.
      await page.goto(BASE_URLS.EXPENSES)
      const row = page.getByTestId('expense-row').filter({ hasText: 'Weekly shop' })
      await expect(row).toHaveCount(1)
      await expect(row.getByTestId('expense-row-category')).toHaveText('food')
      await expect(row.getByTestId('expense-row-tags')).toHaveText('groceries')
    }),
  )

  test(
    'brand-new category + new tag lists every new name and saves on confirm',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'Coffee',
          amountCents: 500,
          categoryName: 'food',
          tagNames: [],
        },
      ])

      await signInAndGoToExpenses(page)
      await page.getByTestId('expense-row-edit').first().click()

      await page.getByTestId('expense-form-category').fill('Beverages')
      await page.getByTestId('expense-form-tags').fill('caffeine')
      await page.getByTestId('expense-form-save').click()

      await expect(page.getByTestId('confirm-edit-new-page')).toBeVisible()
      await expect(page.getByTestId('confirm-edit-new-category-line')).toContainText("'beverages'")
      const tagLines = page.getByTestId('confirm-edit-new-tag-line')
      await expect(tagLines).toHaveCount(1)
      await expect(tagLines.first()).toContainText("'caffeine'")

      await page.getByTestId('confirm-edit-new-confirm').click()
      await page.waitForURL(BASE_URLS.EXPENSES)

      const row = page.getByTestId('expense-row').filter({ hasText: 'Coffee' })
      await expect(row).toHaveCount(1)
      await expect(row.getByTestId('expense-row-category')).toHaveText('beverages')
      await expect(row.getByTestId('expense-row-tags')).toHaveText('caffeine')
    }),
  )
})
