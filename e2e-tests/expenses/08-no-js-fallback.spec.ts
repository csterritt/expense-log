import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { clearDatabase, clearSessions, seedDatabase, seedExpenses } from '../support/db-helpers'

const todayEt = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

test.describe('JS-disabled fallback (Issue 5/6 server flow untouched)', () => {
  test('all-existing values submit directly; new values route through confirmation', async ({
    browser,
  }) => {
    // The default `testWithDatabase` helper only exposes `page`, but here
    // we need `browser` to build a JS-disabled context. Manage the DB
    // lifecycle inline instead.
    await clearDatabase()
    await seedDatabase()
    await clearSessions()
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()

    try {
      await seedExpenses([
          {
            date: todayEt(),
            description: 'seed',
            amountCents: 100,
            categoryName: 'food',
            tagNames: ['groceries'],
          },
        ])

        await page.goto(BASE_URLS.SIGN_IN)
        await submitSignInForm(page, TEST_USERS.KNOWN_USER)
        await page.goto(BASE_URLS.EXPENSES)

        // No combobox dropdown / chip surface should mount when JS is off.
        await page.getByTestId('expense-form-category').focus()
        await expect(page.getByTestId('category-combobox-dropdown')).toHaveCount(0)
        await expect(page.getByTestId('tag-chip-picker-surface')).toHaveCount(0)

        // The category and tags inputs should remain plain text inputs.
        await expect(page.getByTestId('expense-form-category')).toHaveAttribute('type', 'text')
        await expect(page.getByTestId('expense-form-tags')).toHaveAttribute('type', 'text')

        // All-existing submission goes straight to /expenses with no
        // confirmation page.
        await page.getByTestId('expense-form-description').fill('Plain submit')
        await page.getByTestId('expense-form-amount').fill('3.50')
        await page.getByTestId('expense-form-date').fill(todayEt())
        await page.getByTestId('expense-form-category').fill('food')
        await page.getByTestId('expense-form-tags').fill('groceries')
        await page.getByTestId('expense-form-create').click()

        await page.waitForURL(BASE_URLS.EXPENSES)
        await expect(page.getByTestId('confirm-create-new-page')).toHaveCount(0)
        const plainRow = page.getByTestId('expense-row').filter({ hasText: 'Plain submit' })
        await expect(plainRow).toHaveCount(1)
        await expect(plainRow.getByTestId('expense-row-tags')).toHaveText('groceries')

        // Brand-new category + new tag CSV reaches the confirmation page.
        await page.getByTestId('expense-form-description').fill('Brand new')
        await page.getByTestId('expense-form-amount').fill('9.99')
        await page.getByTestId('expense-form-date').fill(todayEt())
        await page.getByTestId('expense-form-category').fill('rent')
        await page.getByTestId('expense-form-tags').fill('utilities, monthly')
        await page.getByTestId('expense-form-create').click()

        await expect(page.getByTestId('confirm-create-new-page')).toBeVisible()
        await page.getByTestId('confirm-create-new-confirm').click()
        await page.waitForURL(BASE_URLS.EXPENSES)

        const newRow = page.getByTestId('expense-row').filter({ hasText: 'Brand new' })
        await expect(newRow).toHaveCount(1)
        await expect(newRow.getByTestId('expense-row-category')).toHaveText('rent')
        await expect(newRow.getByTestId('expense-row-tags')).toHaveText('monthly, utilities')
    } finally {
      await context.close()
      await clearDatabase()
    }
  })
})
