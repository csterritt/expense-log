import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedRecurringTemplates, seedExpenses } from '../support/db-helpers'

const BASE = 'http://localhost:3000'
const YEAR = 2024

const setClockToDate = async (page: any, isoDate: string): Promise<void> => {
  const targetMs = new Date(`${isoDate}T12:00:00-05:00`).getTime()
  const delta = targetMs - Date.now()
  await page.goto(`${BASE}/auth/set-clock/${delta}`)
}

const runCron = async (page: any): Promise<{ generated: number; skipped: number; failed: string[] }> => {
  const resp = await page.request.post(`${BASE}/test/run-cron`)
  return resp.json()
}

const signIn = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
}

/**
 * Shared setup: seeds one manual expense and one Monthly recurring template
 * (same category 'food', same tag 'work'), runs cron to generate one row,
 * then sets the clock to YEAR-03-15 so the default range covers both rows.
 * Returns after signing in and setting up data.
 */
const setup = async (page: any) => {
  await signIn(page)

  // Manual expense on Feb 10
  await seedExpenses([
    {
      date: `${YEAR}-02-10`,
      description: 'Grocery store',
      amountCents: 3000,
      categoryName: 'food',
      tagNames: ['work'],
    },
  ])

  // Recurring template anchored on Mar 1, createdAt = Feb 1
  // → first valid occurrence is Mar 1
  await seedRecurringTemplates([
    {
      description: 'Grocery subscription',
      amountCents: 1500,
      categoryName: 'food',
      tagNames: ['work'],
      recurrence: 'Monthly',
      anchorDate: `${YEAR}-03-01`,
      createdAtIso: `${YEAR}-02-01T00:00:00Z`,
    },
  ])

  // Set clock to Mar 15 so default range (Jan 15–Mar 15) covers both rows
  await setClockToDate(page, `${YEAR}-03-15`)
  const result = await runCron(page)
  expect(result.generated).toBe(1)
}

test.use({ javaScriptEnabled: false })

test.describe('Generated rows appear in search / filter / summary (Issue 14)', () => {
  test(
    'description text search returns both manual and generated rows',
    testWithDatabase(async ({ page }) => {
      await setup(page)

      await page.goto(
        `${BASE}/expenses?from=${YEAR}-01-01&to=${YEAR}-12-31&description=grocery`,
      )

      const rows = page.getByTestId('expense-row')
      await expect(rows).toHaveCount(2)
    }),
  )

  test(
    'category filter returns both manual and generated rows',
    testWithDatabase(async ({ page }) => {
      await setup(page)

      // Get the category id from the filter bar
      await page.goto(`${BASE}/expenses?from=${YEAR}-01-01&to=${YEAR}-12-31`)
      const categorySelect = page.getByTestId('filter-category')
      const options = await categorySelect.locator('option').all()
      let foodId = ''
      for (const opt of options) {
        const text = await opt.textContent()
        if (text && text.trim().toLowerCase() === 'food') {
          foodId = (await opt.getAttribute('value')) ?? ''
        }
      }
      expect(foodId).not.toBe('')

      await page.goto(
        `${BASE}/expenses?from=${YEAR}-01-01&to=${YEAR}-12-31&categoryId=${foodId}`,
      )
      await expect(page.getByTestId('expense-row')).toHaveCount(2)
    }),
  )

  test(
    'tag filter returns both manual and generated rows',
    testWithDatabase(async ({ page }) => {
      await setup(page)

      // Use filter bar to find and filter by the 'work' tag
      await page.goto(`${BASE}/expenses?from=${YEAR}-01-01&to=${YEAR}-12-31`)
      const workChip = page.getByTestId('expense-filter-bar').getByTestId('tag-chip-work')
      const tagId = await workChip.locator('input').inputValue()
      expect(tagId).not.toBe('')

      await page.goto(
        `${BASE}/expenses?from=${YEAR}-01-01&to=${YEAR}-12-31&tagId=${tagId}`,
      )
      await expect(page.getByTestId('expense-row')).toHaveCount(2)
    }),
  )

  test(
    'summary totals include cents from generated rows',
    testWithDatabase(async ({ page }) => {
      await setup(page)

      // Visit summary with explicit date range; default grouping = month
      await page.goto(
        `${BASE}/summary?from=${YEAR}-01-01&to=${YEAR}-12-31`,
      )

      await expect(page.getByTestId('summary-page')).toBeVisible()

      // Grand total = 3000 (manual) + 1500 (generated) = 4500 cents = $45.00
      await expect(page.getByTestId('summary-grand-total')).toHaveText('$45.00')
      await expect(page.getByTestId('summary-grand-count')).toHaveText('2')
    }),
  )
})
