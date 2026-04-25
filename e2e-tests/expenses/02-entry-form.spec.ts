import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedCategories } from '../support/db-helpers'

/**
 * Returns the current date in `America/New_York` as `YYYY-MM-DD`.
 * Matches the behaviour of `src/lib/et-date.ts` `todayEt`.
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

const submitEntryForm = async (
  page: any,
  opts: { description: string; amount: string; categoryName: string; date?: string },
) => {
  const descInput = page.getByTestId('expense-form-description')
  await descInput.fill(opts.description)
  const amountInput = page.getByTestId('expense-form-amount')
  await amountInput.fill(opts.amount)
  if (opts.date) {
    await page.getByTestId('expense-form-date').fill(opts.date)
  }
  await page.getByTestId('expense-form-category').selectOption({ label: opts.categoryName })
  await page.getByTestId('expense-form-create').click()
}

test.describe('Expense entry form', () => {
  test(
    'renders with today (ET) defaulted and category select populated',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)

      const form = page.getByTestId('expense-form')
      await expect(form).toBeVisible()

      const dateInput = page.getByTestId('expense-form-date')
      await expect(dateInput).toHaveValue(todayEt())

      const select = page.getByTestId('expense-form-category')
      await expect(select.locator('option', { hasText: 'Food' })).toHaveCount(1)
    }),
  )

  test(
    'accepts each amount variant, posts, redirects, and renders formatted rows',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)

      // All rows share the same date (today), so the ordering tiebreak is
      // case-insensitive description ASC. Submitting in reverse-alpha order
      // ensures each new row sorts to the top of the list.
      const cases: Array<{ input: string; description: string; formatted: string }> = [
        { input: '1234.56', description: 'Zzz plain decimal', formatted: '1,234.56' },
        { input: '1,234.56', description: 'Yyy comma decimal', formatted: '1,234.56' },
        { input: '1234', description: 'Xxx integer only', formatted: '1,234.00' },
        { input: '.50', description: 'Www leading dot', formatted: '0.50' },
      ]

      for (const c of cases) {
        await submitEntryForm(page, {
          description: c.description,
          amount: c.input,
          categoryName: 'Food',
        })

        await page.waitForURL(BASE_URLS.EXPENSES)

        const firstRowDesc = page.getByTestId('expense-row-description').first()
        await expect(firstRowDesc).toHaveText(c.description)

        const firstRowAmount = page.getByTestId('expense-row-amount').first()
        await expect(firstRowAmount).toHaveText(c.formatted)

        // Form should be cleared on next render
        await expect(page.getByTestId('expense-form-description')).toHaveValue('')
        await expect(page.getByTestId('expense-form-amount')).toHaveValue('')
      }

      await expect(page.getByTestId('expense-row')).toHaveCount(cases.length)
    }),
  )

  test(
    'rejects zero and non-numeric amounts with no new row created',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)

      // HTML validation blocks many bad inputs client-side; we bypass by using
      // `inputmode='decimal'` + `type=text`, so zero reaches the server and
      // produces a server-side flash error.
      await submitEntryForm(page, {
        description: 'Zero should fail',
        amount: '0',
        categoryName: 'Food',
      })
      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.locator('[role="alert"].alert-error')).toBeVisible()
      await expect(page.getByTestId('expense-row')).toHaveCount(0)

      await submitEntryForm(page, {
        description: 'abc should fail',
        amount: 'abc',
        categoryName: 'Food',
      })
      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.locator('[role="alert"].alert-error')).toBeVisible()
      await expect(page.getByTestId('expense-row')).toHaveCount(0)
    }),
  )
})
