import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedCategories, seedExpenses } from '../support/db-helpers'

// Matches `tagNameMax` in src/lib/expense-validators.ts — tests use the
// larger (non-production) value. Keep in sync.
const tagNameMax = 22

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
  tags: string
}

const fillEntryForm = async (page: any, opts: EntryOpts) => {
  await page.getByTestId('expense-form-description').fill(opts.description)
  await page.getByTestId('expense-form-amount').fill(opts.amount)
  await page.getByTestId('expense-form-date').fill(opts.date)
  await page.getByTestId('expense-form-category').fill(opts.category)
  await page.getByTestId('expense-form-tags').fill(opts.tags)
}

const submitEntryForm = async (page: any) => {
  await page.getByTestId('expense-form-create').click()
}

test.describe('Tags (no-JS CSV) + inline tag creation', () => {
  // This spec exercises the no-JS server flow: the entry form posts a raw
  // tags CSV in the original `expense-form-tags` text input. Issue 07
  // mounts a chip picker on that input when JS is enabled (which would
  // convert it to type='hidden'), so disable JS here to keep the test
  // pinned to the no-JS path. The JS-on equivalent is `07-tag-chip-picker-js.spec.ts`.
  test.use({ javaScriptEnabled: false })

  test(
    'mixed existing+new tags routes through confirmation, dedup applies, list shows alphabetical tags',
    testWithDatabase(async ({ page }) => {
      // Seed an existing category and an existing tag named `groceries`.
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['groceries'],
        },
      ])

      await signInAndGoToExpenses(page)

      await fillEntryForm(page, {
        description: 'Weekly shop',
        amount: '42.50',
        date: todayEt(),
        category: 'food',
        tags: 'food, groceries, food',
      })
      await submitEntryForm(page)

      await expect(page.getByTestId('confirm-create-new-page')).toBeVisible()
      // No new category line (category exists).
      await expect(page.getByTestId('confirm-create-new-category-line')).toHaveCount(0)
      // Exactly one new tag: `food` (`groceries` is existing).
      const tagLines = page.getByTestId('confirm-create-new-tag-line')
      await expect(tagLines).toHaveCount(1)
      await expect(tagLines.first()).toContainText("'food'")
      await expect(page.getByTestId('confirm-create-new-tags')).toHaveText('food, groceries')

      await page.getByTestId('confirm-create-new-confirm').click()
      await page.waitForURL(BASE_URLS.EXPENSES)

      // The new "Weekly shop" row should have alphabetized tags.
      const weeklyRow = page
        .getByTestId('expense-row')
        .filter({ hasText: 'Weekly shop' })
      await expect(weeklyRow).toHaveCount(1)
      await expect(weeklyRow.getByTestId('expense-row-tags')).toHaveText('food, groceries')
    }),
  )

  test(
    'brand-new category + new tags lists every new name; second submit takes the existing-match branch',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)

      await fillEntryForm(page, {
        description: 'Rent payment',
        amount: '1000',
        date: todayEt(),
        category: 'Groceries',
        tags: 'Rent, Utilities',
      })
      await submitEntryForm(page)

      await expect(page.getByTestId('confirm-create-new-page')).toBeVisible()
      await expect(page.getByTestId('confirm-create-new-category-line')).toContainText(
        "'groceries'",
      )
      const tagLines = page.getByTestId('confirm-create-new-tag-line')
      await expect(tagLines).toHaveCount(2)
      // Alphabetical: rent, utilities
      await expect(tagLines.nth(0)).toContainText("'rent'")
      await expect(tagLines.nth(1)).toContainText("'utilities'")

      await page.getByTestId('confirm-create-new-confirm').click()
      await page.waitForURL(BASE_URLS.EXPENSES)

      const rentRow = page
        .getByTestId('expense-row')
        .filter({ hasText: 'Rent payment' })
      await expect(rentRow).toHaveCount(1)
      await expect(rentRow.getByTestId('expense-row-category')).toHaveText('groceries')
      await expect(rentRow.getByTestId('expense-row-tags')).toHaveText('rent, utilities')

      // Second submission — every name now exists. No confirmation page.
      await fillEntryForm(page, {
        description: 'Snacks',
        amount: '7.00',
        date: todayEt(),
        category: 'GROCERIES',
        tags: 'Rent',
      })
      await submitEntryForm(page)

      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('confirm-create-new-page')).toHaveCount(0)
      const snacksRow = page
        .getByTestId('expense-row')
        .filter({ hasText: 'Snacks' })
      await expect(snacksRow).toHaveCount(1)
      await expect(snacksRow.getByTestId('expense-row-tags')).toHaveText('rent')
    }),
  )

  test(
    'cancel preserves the raw typed tag CSV (case + duplicates) and creates nothing',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)

      const rawTagInput = 'Food, food, Groceries'
      await fillEntryForm(page, {
        description: 'Weekly shop',
        amount: '42.50',
        date: todayEt(),
        category: 'food',
        tags: rawTagInput,
      })
      await submitEntryForm(page)

      await expect(page.getByTestId('confirm-create-new-page')).toBeVisible()
      await page.getByTestId('confirm-create-new-cancel').click()

      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('expense-form')).toBeVisible()
      await expect(page.getByTestId('expense-form-description')).toHaveValue('Weekly shop')
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('42.50')
      await expect(page.getByTestId('expense-form-date')).toHaveValue(todayEt())
      await expect(page.getByTestId('expense-form-category')).toHaveValue('food')
      await expect(page.getByTestId('expense-form-tags')).toHaveValue(rawTagInput)
      await expect(page.getByTestId('expense-row')).toHaveCount(0)
    }),
  )

  test(
    'over-max tag name shows tags field error and skips the confirmation page',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)

      const tooLong = 'g'.repeat(tagNameMax + 1)
      await fillEntryForm(page, {
        description: 'Big tag',
        amount: '5.00',
        date: todayEt(),
        category: 'food',
        tags: `food, ${tooLong}`,
      })
      await submitEntryForm(page)

      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('confirm-create-new-page')).toHaveCount(0)
      await expect(page.getByTestId('expense-form-tags-error')).toBeVisible()
      await expect(page.getByTestId('expense-form-description')).toHaveValue('Big tag')
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('5.00')
      await expect(page.getByTestId('expense-form-date')).toHaveValue(todayEt())
      await expect(page.getByTestId('expense-form-category')).toHaveValue('food')
      await expect(page.getByTestId('expense-form-tags')).toHaveValue(`food, ${tooLong}`)
      await expect(page.getByTestId('expense-row')).toHaveCount(0)
    }),
  )

  test(
    'whitespace-only tag CSV creates the expense with no tags attached',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)

      await fillEntryForm(page, {
        description: 'Plain expense',
        amount: '5.00',
        date: todayEt(),
        category: 'food',
        tags: ' , ,   ',
      })
      await submitEntryForm(page)

      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('confirm-create-new-page')).toHaveCount(0)
      const row = page.getByTestId('expense-row').filter({ hasText: 'Plain expense' })
      await expect(row).toHaveCount(1)
      await expect(row.getByTestId('expense-row-tags')).toHaveText('')
    }),
  )
})
