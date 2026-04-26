import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedCategories } from '../support/db-helpers'

// Matches `descriptionMax` in src/lib/expense-validators.ts — tests use the
// larger (non-production) value. Keep in sync.
const descriptionMax = 202

/**
 * Returns today's date in `America/New_York` as `YYYY-MM-DD`. Matches the
 * `todayEt()` helper. Used to keep new expense rows inside the
 * `defaultRangeEt()` window so they render after creation.
 */
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
  categoryLabel?: string // when undefined, leave the category input blank
}

const fillForm = async (page: any, opts: EntryOpts) => {
  const desc = page.getByTestId('expense-form-description')
  const amt = page.getByTestId('expense-form-amount')
  const date = page.getByTestId('expense-form-date')
  const cat = page.getByTestId('expense-form-category')

  await desc.fill(opts.description)
  await amt.fill(opts.amount)
  await date.fill(opts.date)
  if (opts.categoryLabel !== undefined) {
    await cat.fill(opts.categoryLabel)
  } else {
    await cat.fill('')
  }
}

const submit = async (page: any) => {
  await page.getByTestId('expense-form-create').click()
  await page.waitForURL(BASE_URLS.EXPENSES)
}

test.describe('Expense entry form: field-level validation errors', () => {
  test(
    'empty description: error shown, other fields preserved',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)

      await fillForm(page, {
        description: '',
        amount: '12.34',
        date: '2024-05-01',
        categoryLabel: 'Food',
      })
      await submit(page)

      await expect(page.getByTestId('expense-form-description-error')).toBeVisible()
      await expect(page.getByTestId('expense-form-description')).toHaveValue('')
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('12.34')
      await expect(page.getByTestId('expense-form-date')).toHaveValue('2024-05-01')
      await expect(page.getByTestId('expense-form-category')).toHaveValue('Food')
      await expect(page.getByTestId('expense-row')).toHaveCount(0)
    }),
  )

  test(
    'over-max description: error shown, other fields preserved',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)

      const tooLong = 'a'.repeat(descriptionMax + 1)
      await fillForm(page, {
        description: tooLong,
        amount: '5.00',
        date: '2024-05-01',
        categoryLabel: 'Food',
      })
      await submit(page)

      await expect(page.getByTestId('expense-form-description-error')).toBeVisible()
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('5.00')
      await expect(page.getByTestId('expense-form-date')).toHaveValue('2024-05-01')
      await expect(page.getByTestId('expense-row')).toHaveCount(0)
    }),
  )

  test(
    'bad amounts: each variant shows amount error and preserves other fields',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)

      const bad = ['1.234', '-5', '0', 'abc']
      for (const amount of bad) {
        await fillForm(page, {
          description: `Try ${amount}`,
          amount,
          date: '2024-05-01',
          categoryLabel: 'Food',
        })
        await submit(page)

        await expect(page.getByTestId('expense-form-amount-error')).toBeVisible()
        await expect(page.getByTestId('expense-form-description')).toHaveValue(`Try ${amount}`)
        await expect(page.getByTestId('expense-form-amount')).toHaveValue(amount)
        await expect(page.getByTestId('expense-form-date')).toHaveValue('2024-05-01')
        await expect(page.getByTestId('expense-row')).toHaveCount(0)
      }
    }),
  )

  test(
    'invalid date 2025-13-40: date error shown, other fields preserved',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)

      await fillForm(page, {
        description: 'Bad date',
        amount: '7.50',
        date: '2025-13-40',
        categoryLabel: 'Food',
      })
      await submit(page)

      await expect(page.getByTestId('expense-form-date-error')).toBeVisible()
      await expect(page.getByTestId('expense-form-description')).toHaveValue('Bad date')
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('7.50')
      await expect(page.getByTestId('expense-form-date')).toHaveValue('2025-13-40')
      await expect(page.getByTestId('expense-row')).toHaveCount(0)
    }),
  )

  test(
    'no category selected: category error shown, other fields preserved',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)

      await fillForm(page, {
        description: 'No cat',
        amount: '3.00',
        date: '2024-05-01',
        // categoryLabel undefined -> placeholder remains selected, categoryId=''
      })
      await submit(page)

      await expect(page.getByTestId('expense-form-category-error')).toBeVisible()
      await expect(page.getByTestId('expense-form-description')).toHaveValue('No cat')
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('3.00')
      await expect(page.getByTestId('expense-form-date')).toHaveValue('2024-05-01')
      await expect(page.getByTestId('expense-row')).toHaveCount(0)
    }),
  )

  test(
    'multiple invalid fields at once: all errors shown simultaneously',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)

      await fillForm(page, {
        description: '',
        amount: '1.234',
        date: '2025-13-40',
        // no category
      })
      await submit(page)

      await expect(page.getByTestId('expense-form-description-error')).toBeVisible()
      await expect(page.getByTestId('expense-form-amount-error')).toBeVisible()
      await expect(page.getByTestId('expense-form-date-error')).toBeVisible()
      await expect(page.getByTestId('expense-form-category-error')).toBeVisible()

      // Sticky values preserved exactly as submitted.
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('1.234')
      await expect(page.getByTestId('expense-form-date')).toHaveValue('2025-13-40')
    }),
  )

  test(
    'fix and resubmit after error: row is created, form clears',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)

      await fillForm(page, {
        description: 'Lunch',
        amount: '0',
        date: todayEt(),
        categoryLabel: 'Food',
      })
      await submit(page)
      await expect(page.getByTestId('expense-form-amount-error')).toBeVisible()

      // Only fix the bad amount. Other values should have been preserved.
      await page.getByTestId('expense-form-amount').fill('9.99')
      await submit(page)

      await expect(page.getByTestId('expense-form-amount-error')).toHaveCount(0)
      await expect(page.getByTestId('expense-row')).toHaveCount(1)
      await expect(page.getByTestId('expense-form-description')).toHaveValue('')
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('')
    }),
  )
})
