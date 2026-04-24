import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedExpenses } from '../support/db-helpers'

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

/** Offset the given `YYYY-MM-DD` by a number of months, clamped to day-15 for safety. */
const ymdMonthsAgo = (today: string, months: number, day: number): string => {
  const [yStr, mStr] = today.split('-')
  const year = parseInt(yStr, 10)
  const month = parseInt(mStr, 10) // 1-12
  let newMonth = month - months
  let newYear = year
  while (newMonth < 1) {
    newMonth += 12
    newYear -= 1
  }
  return `${newYear.toString().padStart(4, '0')}-${newMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

test.describe('Expenses list rendering', () => {
  test(
    'renders only in-window expenses, sorted date desc then case-insensitive description asc',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      const thisMonthEarly = ymdMonthsAgo(today, 0, 5)
      const thisMonthEarlySame = ymdMonthsAgo(today, 0, 5)
      const oneMonthBack = ymdMonthsAgo(today, 1, 15)
      const twoMonthsBack = ymdMonthsAgo(today, 2, 10)
      const outsideWindow = ymdMonthsAgo(today, 4, 1)

      // Two expenses on the same date to exercise the case-insensitive
      // description tiebreak (alpha comes before beta regardless of case).
      await seedExpenses([
        {
          date: thisMonthEarly,
          description: 'beta lunch',
          amountCents: 123456,
          categoryName: 'Food',
          tagNames: ['work', 'client'],
        },
        {
          date: thisMonthEarlySame,
          description: 'Alpha breakfast',
          amountCents: 100,
          categoryName: 'Food',
        },
        {
          date: oneMonthBack,
          description: 'Gas',
          amountCents: 4567,
          categoryName: 'Transport',
          tagNames: ['road-trip'],
        },
        {
          date: twoMonthsBack,
          description: 'Electric bill',
          amountCents: 987600,
          categoryName: 'Utilities',
        },
        {
          date: outsideWindow,
          description: 'Historical purchase',
          amountCents: 500,
          categoryName: 'Misc',
        },
      ])

      await page.goto(BASE_URLS.SIGN_IN)
      await submitSignInForm(page, TEST_USERS.KNOWN_USER)

      await page.goto(BASE_URLS.EXPENSES)

      const table = page.getByTestId('expenses-table')
      await expect(table).toBeVisible()

      const rows = page.getByTestId('expense-row')
      await expect(rows).toHaveCount(4)

      const descriptions = await page
        .getByTestId('expense-row-description')
        .allTextContents()
      expect(descriptions).toEqual([
        'Alpha breakfast',
        'beta lunch',
        'Gas',
        'Electric bill',
      ])

      const dates = await page.getByTestId('expense-row-date').allTextContents()
      expect(dates).toEqual([
        thisMonthEarlySame,
        thisMonthEarly,
        oneMonthBack,
        twoMonthsBack,
      ])

      const amounts = await page.getByTestId('expense-row-amount').allTextContents()
      expect(amounts).toEqual(['1.00', '1,234.56', '45.67', '9,876.00'])

      const tagCells = await page.getByTestId('expense-row-tags').allTextContents()
      expect(tagCells[1]).toContain('work')
      expect(tagCells[1]).toContain('client')
      expect(tagCells[2]).toBe('road-trip')

      // Out-of-window row must not appear
      await expect(
        page.getByText('Historical purchase', { exact: true }),
      ).toHaveCount(0)
    }),
  )
})
