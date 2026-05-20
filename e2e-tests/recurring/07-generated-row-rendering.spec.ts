import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedRecurringTemplates, seedExpenses } from '../support/db-helpers'

const EXPENSES_URL = 'http://localhost:3000/expenses'
const BASE = 'http://localhost:3000'

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

test.use({ javaScriptEnabled: false })

test.describe('Generated row rendering and provenance (Issue 14)', () => {
  test(
    'generated rows show badge and underline; manual rows do not; edit preserves badge; re-run is idempotent',
    testWithDatabase(async ({ page }) => {
      const year = 2024

      await signIn(page)

      // Seed a manual expense (no recurringId)
      await seedExpenses([
        {
          date: `${year}-03-05`,
          description: 'Manual coffee',
          amountCents: 450,
          categoryName: 'food',
        },
      ])

      // Seed a recurring template
      await seedRecurringTemplates([
        {
          description: 'Monthly gym',
          amountCents: 4500,
          categoryName: 'health',
          recurrence: 'Monthly',
          anchorDate: `${year}-03-01`,
          createdAtIso: `${year}-02-01T00:00:00Z`,
        },
      ])

      // Advance clock to Mar 15 and run cron → generates Mar 1
      await setClockToDate(page, `${year}-03-15`)
      const r1 = await runCron(page)
      expect(r1.generated).toBe(1)

      // Visit /expenses with date range covering both rows
      await page.goto(`${EXPENSES_URL}?from=${year}-01-01&to=${year}-12-31`)
      await expect(page.getByTestId('expense-row')).toHaveCount(2)

      // Find the generated row (has the badge)
      const generatedRow = page
        .getByTestId('expense-row')
        .filter({ has: page.getByTestId('expense-row-recurring-badge') })
      await expect(generatedRow).toHaveCount(1)
      await expect(generatedRow.getByTestId('expense-row-recurring-badge')).toBeVisible()
      await expect(generatedRow.getByTestId('expense-row-description').locator('span.underline')).toBeVisible()

      // The manual row must NOT have a badge
      const manualRow = page
        .getByTestId('expense-row')
        .filter({ hasNot: page.getByTestId('expense-row-recurring-badge') })
      await expect(manualRow).toHaveCount(1)

      // Edit the generated row: change the amount
      await generatedRow.getByTestId('expense-row-edit').click()
      await expect(page.getByTestId('expense-edit-page')).toBeVisible()
      await page.getByTestId('expense-form-amount').fill('50.00')
      await page.getByTestId('expense-form-save').click()

      // Back on /expenses — the edited row should still have the badge
      await page.goto(`${EXPENSES_URL}?from=${year}-01-01&to=${year}-12-31`)
      const editedGeneratedRow = page
        .getByTestId('expense-row')
        .filter({ has: page.getByTestId('expense-row-recurring-badge') })
      await expect(editedGeneratedRow).toHaveCount(1)
      await expect(editedGeneratedRow.getByTestId('expense-row-recurring-badge')).toBeVisible()

      // Re-run cron on same clock → idempotent (unique index blocks re-insert)
      const r2 = await runCron(page)
      expect(r2.generated).toBe(0)

      await page.goto(`${EXPENSES_URL}?from=${year}-01-01&to=${year}-12-31`)
      // Still 2 rows (no duplicate added)
      await expect(page.getByTestId('expense-row')).toHaveCount(2)
    }),
  )
})
