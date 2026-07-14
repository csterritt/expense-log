import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedCategories } from '../support/db-helpers'

// Matches `categoryNameMax` in src/lib/expense-validators.ts — tests use the
// larger (non-production) value. Keep in sync.
const categoryNameMax = 22

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

type EntryOpts = {
  description: string
  amount: string
  date: string
  category: string
}

const fillEntryForm = async (page: any, opts: EntryOpts) => {
  await page.getByTestId('expense-form-description').fill(opts.description)
  await page.getByTestId('expense-form-amount').fill(opts.amount)
  await page.getByTestId('expense-form-date').fill(opts.date)
  await page.getByTestId('expense-form-category').fill(opts.category)
}

const submitEntryForm = async (page: any) => {
  await page.getByTestId('expense-form-create').click()
}

test.describe('Inline category creation (no-JS path)', () => {
  test(
    'unmatched name renders the consolidated confirmation page',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)

      await fillEntryForm(page, {
        description: 'Weekly shop',
        amount: '42.50',
        date: todayEt(),
        category: 'Groceries',
      })
      await submitEntryForm(page)

      await expect(page.getByTestId('confirm-create-new-page')).toBeVisible()
      await expect(page.getByTestId('confirm-create-new-category-line')).toContainText(
        "'groceries'",
      )
      await expect(page.getByTestId('confirm-create-new-description')).toHaveText('Weekly shop')
      await expect(page.getByTestId('confirm-create-new-amount')).toHaveText('42.50')
      await expect(page.getByTestId('confirm-create-new-date')).toHaveText(todayEt())
      await expect(page.getByTestId('confirm-create-new-category')).toHaveText('groceries')
    }),
  )

  test(
    'cancel preserves every typed value and creates nothing',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)

      await fillEntryForm(page, {
        description: 'Weekly shop',
        amount: '42.50',
        date: todayEt(),
        category: 'Groceries',
      })
      await submitEntryForm(page)

      await expect(page.getByTestId('confirm-create-new-page')).toBeVisible()
      await page.getByTestId('confirm-create-new-cancel').click()

      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('expense-form')).toBeVisible()
      await expect(page.getByTestId('expense-form-description')).toHaveValue('Weekly shop')
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('42.50')
      await expect(page.getByTestId('expense-form-date')).toHaveValue(todayEt())
      await expect(page.getByTestId('expense-form-category')).toHaveValue('Groceries')
      await expect(page.getByTestId('expense-row')).toHaveCount(0)
    }),
  )

  test(
    'confirm creates the category + expense and routes future submits through the existing-match branch',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)

      // First submission: typed `Groceries` is not yet a category.
      await fillEntryForm(page, {
        description: 'Weekly shop',
        amount: '42.50',
        date: todayEt(),
        category: 'Groceries',
      })
      await submitEntryForm(page)

      await expect(page.getByTestId('confirm-create-new-page')).toBeVisible()
      await page.getByTestId('confirm-create-new-confirm').click()

      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('expense-row')).toHaveCount(1)
      await expect(page.getByTestId('expense-row-category').first()).toHaveText('groceries')
      await expect(page.getByTestId('expense-form-description')).toHaveValue('')
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('')
      await expect(page.getByTestId('expense-form-category')).toHaveValue('')

      // Second submission: typed `groceries` (any case) now matches an
      // existing category, so we go directly to /expenses with no
      // confirmation page.
      await fillEntryForm(page, {
        description: 'Snacks',
        amount: '7.00',
        date: todayEt(),
        category: 'GROCERIES',
      })
      await submitEntryForm(page)

      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('confirm-create-new-page')).toHaveCount(0)
      await expect(page.getByTestId('expense-row')).toHaveCount(2)
    }),
  )

  test(
    'over-max category name shows field error and skips the confirmation page',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)

      const tooLong = 'g'.repeat(categoryNameMax + 1)
      await fillEntryForm(page, {
        description: 'Big name',
        amount: '5.00',
        date: todayEt(),
        category: tooLong,
      })
      await submitEntryForm(page)

      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('confirm-create-new-page')).toHaveCount(0)
      await expect(page.getByTestId('expense-form-category-error')).toBeVisible()
      await expect(page.getByTestId('expense-form-description')).toHaveValue('Big name')
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('5.00')
      await expect(page.getByTestId('expense-form-date')).toHaveValue(todayEt())
      await expect(page.getByTestId('expense-form-category')).toHaveValue(tooLong)
      await expect(page.getByTestId('expense-row')).toHaveCount(0)
    }),
  )

  test(
    'whitespace-only category name shows field error and skips the confirmation page',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)

      await fillEntryForm(page, {
        description: 'Blank cat',
        amount: '5.00',
        date: todayEt(),
        category: '   ',
      })
      await submitEntryForm(page)

      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('confirm-create-new-page')).toHaveCount(0)
      await expect(page.getByTestId('expense-form-category-error')).toBeVisible()
      await expect(page.getByTestId('expense-row')).toHaveCount(0)
    }),
  )
})
