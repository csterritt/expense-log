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

/** Offset the given `YYYY-MM-DD` by a number of months. */
const ymdMonthsAgo = (today: string, months: number, day: number): string => {
  const [yStr, mStr] = today.split('-')
  const year = parseInt(yStr, 10)
  const month = parseInt(mStr, 10)
  let newMonth = month - months
  let newYear = year
  while (newMonth < 1) {
    newMonth += 12
    newYear -= 1
  }
  return `${newYear.toString().padStart(4, '0')}-${newMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

const signInAndGoToExpenses = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
  await page.goto(BASE_URLS.EXPENSES)
}

test.describe('Expense filter bar — description and date-range', () => {
  test(
    'filter bar is rendered on the expenses page',
    testWithDatabase(async ({ page }) => {
      await signInAndGoToExpenses(page)
      await expect(page.getByTestId('expense-filter-bar')).toBeVisible()
      await expect(page.getByTestId('filter-description')).toBeVisible()
      await expect(page.getByTestId('filter-from')).toBeVisible()
      await expect(page.getByTestId('filter-to')).toBeVisible()
      await expect(page.getByTestId('filter-submit')).toBeVisible()
    }),
  )

  test(
    'first load shows default 2-month window (no filter params)',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      const outsideWindow = ymdMonthsAgo(today, 4, 1)
      const insideWindow = ymdMonthsAgo(today, 1, 15)

      await seedExpenses([
        {
          date: insideWindow,
          description: 'Inside window expense',
          amountCents: 100,
          categoryName: 'Food',
        },
        {
          date: outsideWindow,
          description: 'Outside window expense',
          amountCents: 200,
          categoryName: 'Food',
        },
      ])

      await signInAndGoToExpenses(page)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).toContain('Inside window expense')
      expect(descriptions).not.toContain('Outside window expense')
    }),
  )

  test(
    'description filter: substring, case-insensitive',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedExpenses([
        {
          date: today,
          description: 'Grocery Store',
          amountCents: 100,
          categoryName: 'Food',
        },
        {
          date: today,
          description: 'GROCERY ONLINE',
          amountCents: 200,
          categoryName: 'Food',
        },
        {
          date: today,
          description: 'Gas Station',
          amountCents: 300,
          categoryName: 'Transport',
        },
      ])

      await signInAndGoToExpenses(page)

      await page.getByTestId('filter-description').fill('grocery')
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).toContain('Grocery Store')
      expect(descriptions).toContain('GROCERY ONLINE')
      expect(descriptions).not.toContain('Gas Station')
    }),
  )

  test(
    'from date filter excludes earlier expenses',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2024-03-15',
          description: 'March expense',
          amountCents: 100,
          categoryName: 'Food',
        },
        {
          date: '2024-01-10',
          description: 'January expense',
          amountCents: 200,
          categoryName: 'Food',
        },
      ])

      await signInAndGoToExpenses(page)

      await page.getByTestId('filter-from').fill('2024-03-01')
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).toContain('March expense')
      expect(descriptions).not.toContain('January expense')
    }),
  )

  test(
    'to date filter excludes later expenses',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2024-03-15',
          description: 'March expense',
          amountCents: 100,
          categoryName: 'Food',
        },
        {
          date: '2024-01-10',
          description: 'January expense',
          amountCents: 200,
          categoryName: 'Food',
        },
      ])

      await signInAndGoToExpenses(page)

      await page.getByTestId('filter-to').fill('2024-02-01')
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).not.toContain('March expense')
      expect(descriptions).toContain('January expense')
    }),
  )

  test(
    'open-from: only from set shows all expenses from that date onward',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2020-01-01',
          description: 'Old expense',
          amountCents: 100,
          categoryName: 'Food',
        },
        {
          date: '2025-12-31',
          description: 'Future expense',
          amountCents: 200,
          categoryName: 'Food',
        },
      ])

      await signInAndGoToExpenses(page)

      await page.getByTestId('filter-from').fill('2024-01-01')
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).not.toContain('Old expense')
      expect(descriptions).toContain('Future expense')
    }),
  )

  test(
    'open-to: only to set shows all expenses up to that date',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2020-01-01',
          description: 'Old expense',
          amountCents: 100,
          categoryName: 'Food',
        },
        {
          date: '2025-12-31',
          description: 'Future expense',
          amountCents: 200,
          categoryName: 'Food',
        },
      ])

      await signInAndGoToExpenses(page)

      await page.getByTestId('filter-to').fill('2024-01-01')
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).toContain('Old expense')
      expect(descriptions).not.toContain('Future expense')
    }),
  )

  test(
    'no-filters submit (both from and to empty) returns all expenses',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2020-01-01',
          description: 'Old expense',
          amountCents: 100,
          categoryName: 'Food',
        },
        {
          date: '2025-12-31',
          description: 'Future expense',
          amountCents: 200,
          categoryName: 'Food',
        },
      ])

      await signInAndGoToExpenses(page)

      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).toContain('Old expense')
      expect(descriptions).toContain('Future expense')
    }),
  )

  test(
    'filter values are reflected in the form inputs after submit',
    testWithDatabase(async ({ page }) => {
      await signInAndGoToExpenses(page)

      await page.getByTestId('filter-description').fill('Lunch')
      await page.getByTestId('filter-from').fill('2024-01-01')
      await page.getByTestId('filter-to').fill('2024-12-31')
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      await expect(page.getByTestId('filter-description')).toHaveValue('Lunch')
      await expect(page.getByTestId('filter-from')).toHaveValue('2024-01-01')
      await expect(page.getByTestId('filter-to')).toHaveValue('2024-12-31')
    }),
  )
})
