import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedRecurringTemplates } from '../support/db-helpers'

const EXPENSES_URL = 'http://localhost:3000/expenses'
const BASE = 'http://localhost:3000'

/**
 * Navigate the Playwright page to /auth/set-clock/:delta so the server's
 * clock cookie is set to the given ET date (at noon ET).
 */
const setClockToDate = async (page: any, isoDate: string): Promise<void> => {
  const targetMs = new Date(`${isoDate}T12:00:00-05:00`).getTime()
  const delta = targetMs - Date.now()
  await page.goto(`${BASE}/auth/set-clock/${delta}`)
}

/**
 * POST /test/run-cron using the page's own request context (which shares
 * cookies — session + delta — with the Playwright page).
 */
const runCron = async (page: any): Promise<{ generated: number; skipped: number; failed: string[] }> => {
  const resp = await page.request.post(`${BASE}/test/run-cron`)
  return resp.json()
}

const signIn = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
}

test.use({ javaScriptEnabled: false })

test.describe('Cron materialization — 28th-shift across February (Issue 14)', () => {
  test(
    'Monthly template anchored on 31st: generates Feb 28, Mar 31, Apr 30 in correct order with badge',
    testWithDatabase(async ({ page }) => {
      // Use a fixed past year so all clock advances are unambiguous.
      const year = 2024
      const anchorDate = `${year}-01-31`
      // Set createdAt to Jan 1 so the first-occurrence rule does not block Jan 31.
      // (We want Jan 31 as the first valid occurrence, but the 4 clock advances
      // start at mid-Feb, so Jan 31 will be generated on the Mar 1 advance.)
      // Actually: template createdAt = Jan 31 itself → first occurrence is Feb 28.
      const createdAtIso = `${year}-01-31T00:00:00Z`

      await signIn(page)

      await seedRecurringTemplates([
        {
          description: 'Monthly rent',
          amountCents: 120000,
          categoryName: 'housing',
          recurrence: 'Monthly',
          anchorDate,
          createdAtIso,
        },
      ])

      // Advance 1 — mid-Feb (before Feb 28): expect 0 generated
      await setClockToDate(page, `${year}-02-15`)
      const r1 = await runCron(page)
      expect(r1.generated).toBe(0)

      // Advance 2 — Mar 1 (after Feb 28): expect 1 generated
      await setClockToDate(page, `${year}-03-01`)
      const r2 = await runCron(page)
      expect(r2.generated).toBe(1)

      // Advance 3 — Apr 1 (after Mar 31): expect 1 generated
      await setClockToDate(page, `${year}-04-01`)
      const r3 = await runCron(page)
      expect(r3.generated).toBe(1)

      // Advance 4 — May 1 (after Apr 30): expect 1 generated
      await setClockToDate(page, `${year}-05-01`)
      const r4 = await runCron(page)
      expect(r4.generated).toBe(1)

      // Visit /expenses with a wide enough date range to capture all rows
      await page.goto(`${EXPENSES_URL}?from=${year}-01-01&to=${year}-12-31`)

      // Collect all expense rows
      const rows = page.getByTestId('expense-row')
      await expect(rows).toHaveCount(3)

      // Dates must be exactly Feb 28, Mar 31, Apr 30 (table is date-desc so reverse order)
      const dates = rows.getByTestId('expense-row-date')
      await expect(dates.nth(0)).toHaveText(`${year}-04-30`)
      await expect(dates.nth(1)).toHaveText(`${year}-03-31`)
      await expect(dates.nth(2)).toHaveText(`${year}-02-28`)

      // Every row should show the recurring badge and underlined description
      const badges = rows.getByTestId('expense-row-recurring-badge')
      await expect(badges).toHaveCount(3)

      const descCells = rows.getByTestId('expense-row-description')
      for (let i = 0; i < 3; i++) {
        await expect(descCells.nth(i).locator('span.underline')).toBeVisible()
      }
    }),
  )
})
