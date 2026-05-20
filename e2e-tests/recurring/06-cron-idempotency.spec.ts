import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedRecurringTemplates } from '../support/db-helpers'

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

test.describe('Cron materialization — first-occurrence, catch-up, idempotency (Issue 14)', () => {
  test(
    'first-occurrence rule: template anchored on day 5, clock on day 10, createdAt same day as anchor — 0 generated',
    testWithDatabase(async ({ page }) => {
      const year = 2024

      await signIn(page)

      await seedRecurringTemplates([
        {
          description: 'First occurrence test',
          amountCents: 5000,
          categoryName: 'utilities',
          recurrence: 'Monthly',
          anchorDate: `${year}-03-05`,
          // createdAt == anchor → first valid occurrence is the NEXT one (Apr 5)
          createdAtIso: `${year}-03-05T00:00:00Z`,
        },
      ])

      await setClockToDate(page, `${year}-03-10`)
      const summary = await runCron(page)
      expect(summary.generated).toBe(0)

      await page.goto(`${EXPENSES_URL}?from=${year}-01-01&to=${year}-12-31`)
      await expect(page.getByTestId('expenses-empty-state')).toBeVisible()
    }),
  )

  test(
    'catch-up: template anchored 3+ months back generates all missed occurrences in one run',
    testWithDatabase(async ({ page }) => {
      const year = 2024

      await signIn(page)

      // createdAt = Jan 1 → first valid occurrence is Jan 15
      await seedRecurringTemplates([
        {
          description: 'Catch-up subscription',
          amountCents: 999,
          categoryName: 'subscriptions',
          recurrence: 'Monthly',
          anchorDate: `${year}-01-15`,
          createdAtIso: `${year}-01-01T00:00:00Z`,
        },
      ])

      // Advance to Apr 20 — should catch up Jan 15, Feb 15, Mar 15, Apr 15
      await setClockToDate(page, `${year}-04-20`)
      const summary = await runCron(page)
      expect(summary.generated).toBe(4)
      expect(summary.failed).toEqual([])

      await page.goto(`${EXPENSES_URL}?from=${year}-01-01&to=${year}-12-31`)
      const rows = page.getByTestId('expense-row')
      await expect(rows).toHaveCount(4)
    }),
  )

  test(
    'idempotency: second run on same clock produces generated=0 and row count unchanged',
    testWithDatabase(async ({ page }) => {
      const year = 2024

      await signIn(page)

      await seedRecurringTemplates([
        {
          description: 'Idempotency check',
          amountCents: 1500,
          categoryName: 'food',
          recurrence: 'Monthly',
          anchorDate: `${year}-02-10`,
          createdAtIso: `${year}-01-01T00:00:00Z`,
        },
      ])

      await setClockToDate(page, `${year}-04-15`)

      // First run: Feb 10, Mar 10, Apr 10 = 3 rows
      const first = await runCron(page)
      expect(first.generated).toBe(3)

      // Second run on same clock: nothing new
      const second = await runCron(page)
      expect(second.generated).toBe(0)
      expect(second.failed).toEqual([])

      // Row count must still be 3
      await page.goto(`${EXPENSES_URL}?from=${year}-01-01&to=${year}-12-31`)
      await expect(page.getByTestId('expense-row')).toHaveCount(3)
    }),
  )
})
