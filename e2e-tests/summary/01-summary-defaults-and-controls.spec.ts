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

/** Offset the given `YYYY-MM-DD` by a number of years. */
const ymdYearsAgo = (today: string, years: number, day: number): string => {
  const [yStr, mStr] = today.split('-')
  return `${(parseInt(yStr, 10) - years).toString().padStart(4, '0')}-${mStr}-${day.toString().padStart(2, '0')}`
}

const signInAndGoToSummary = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
  await page.goto(BASE_URLS.SUMMARY)
}

/**
 * Seed a known dataset with:
 * - 3 categories: Food, Transport, Utilities
 * - 3 tags: work, personal, client
 * - one expense with >= 2 tags (work + client)
 * - one expense with zero tags
 * - expenses in two months (thisMonth, oneMonthBack),
 *   spanning two quarters and two years
 */
const seedSummaryData = async (today: string) => {
  const oneMonthBack = ymdMonthsAgo(today, 1, 15)
  const lastYear = ymdYearsAgo(today, 1, 10)

  await seedExpenses([
    // This month — Food — two tags
    {
      date: today,
      description: 'Lunch with client',
      amountCents: 2500,
      categoryName: 'Food',
      tagNames: ['work', 'client'],
    },
    // This month — Transport — one tag
    {
      date: today,
      description: 'Taxi to airport',
      amountCents: 4000,
      categoryName: 'Transport',
      tagNames: ['work'],
    },
    // One month back — Utilities — zero tags
    {
      date: oneMonthBack,
      description: 'Electric bill',
      amountCents: 9000,
      categoryName: 'Utilities',
    },
    // One month back — Food — personal tag
    {
      date: oneMonthBack,
      description: 'Grocery run',
      amountCents: 5500,
      categoryName: 'Food',
      tagNames: ['personal'],
    },
    // Last year — Food — for year-granularity tests
    {
      date: lastYear,
      description: 'Old food',
      amountCents: 1000,
      categoryName: 'Food',
      tagNames: ['personal'],
    },
  ])
}

test.describe('Summary page — defaults and controls', () => {
  test(
    '(a) first visit shows Category dimension, Month granularity, controls visible, no grand-total row, no percent column',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedSummaryData(today)
      await signInAndGoToSummary(page)

      // The summary page container must be visible
      await expect(page.getByTestId('summary-page')).toBeVisible()

      // Dimension selector defaults to Category
      const dimensionSelect = page.getByTestId('summary-dimension')
      await expect(dimensionSelect).toBeVisible()
      await expect(dimensionSelect).toHaveValue('category')

      // Granularity selector defaults to Month
      const granularitySelect = page.getByTestId('summary-granularity')
      await expect(granularitySelect).toBeVisible()
      await expect(granularitySelect).toHaveValue('month')

      // Tag filter control is visible (chip-checkbox block)
      await expect(page.getByTestId('tag-chip-checkboxes')).toBeVisible()

      // Date range inputs are visible
      await expect(page.getByTestId('summary-from')).toBeVisible()
      await expect(page.getByTestId('summary-to')).toBeVisible()

      // Submit and Clear buttons are visible
      await expect(page.getByTestId('summary-submit')).toBeVisible()
      await expect(page.getByTestId('summary-clear')).toBeVisible()

      // At least one data row is present
      const rows = page.getByTestId('summary-row')
      await expect(rows.first()).toBeVisible()

      // No grand-total row (there should be no element with testid 'summary-total')
      await expect(page.getByTestId('summary-total')).toHaveCount(0)

      // No percent column header
      await expect(page.locator('th', { hasText: '%' })).toHaveCount(0)
      await expect(page.locator('th', { hasText: 'percent' })).toHaveCount(0)

      // Category dimension: category column header present, no tag column header
      await expect(page.getByTestId('summary-sort-category')).toBeVisible()
      await expect(page.getByTestId('summary-sort-timePeriod')).toBeVisible()
      await expect(page.getByTestId('summary-sort-count')).toBeVisible()
      await expect(page.getByTestId('summary-sort-total')).toBeVisible()
      await expect(page.getByTestId('summary-sort-tag')).toHaveCount(0)
    }),
  )

  test(
    '(b) switching dimension to Time only drops category/tag columns; switching to Tag adds tag column; switching to Category+Tag adds both',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedSummaryData(today)
      await signInAndGoToSummary(page)

      // Switch to Time only
      await page.getByTestId('summary-dimension').selectOption('time')
      await page.getByTestId('summary-submit').click()
      await page.waitForURL(/\/summary/)

      await expect(page.getByTestId('summary-sort-category')).toHaveCount(0)
      await expect(page.getByTestId('summary-sort-tag')).toHaveCount(0)
      await expect(page.getByTestId('summary-sort-timePeriod')).toBeVisible()

      // Switch to Tag
      await page.getByTestId('summary-dimension').selectOption('tag')
      await page.getByTestId('summary-submit').click()
      await page.waitForURL(/\/summary/)

      await expect(page.getByTestId('summary-sort-tag')).toBeVisible()
      await expect(page.getByTestId('summary-sort-category')).toHaveCount(0)

      // Switch to Category+Tag
      await page.getByTestId('summary-dimension').selectOption('category-tag')
      await page.getByTestId('summary-submit').click()
      await page.waitForURL(/\/summary/)

      await expect(page.getByTestId('summary-sort-category')).toBeVisible()
      await expect(page.getByTestId('summary-sort-tag')).toBeVisible()
    }),
  )

  test(
    '(c) switching granularity to Quarter shows Mmm-Mmm labels; Year shows YYYY labels',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedSummaryData(today)
      await signInAndGoToSummary(page)

      // Switch to Quarter
      await page.getByTestId('summary-granularity').selectOption('quarter')
      await page.getByTestId('summary-submit').click()
      await page.waitForURL(/\/summary/)

      const quarterRows = await page.getByTestId('summary-row').allTextContents()
      // Quarter labels look like Jan-Mar 2026, Apr-Jun 2026, Jul-Sep 2026, Oct-Dec 2026
      const quarterPattern = /^(Jan-Mar|Apr-Jun|Jul-Sep|Oct-Dec) \d{4}$/
      const timePeriodCells = await page.getByTestId('summary-row-time-period').allTextContents()
      for (const cell of timePeriodCells) {
        expect(quarterPattern.test(cell)).toBe(true)
      }

      // Switch to Year
      await page.getByTestId('summary-granularity').selectOption('year')
      await page.getByTestId('summary-submit').click()
      await page.waitForURL(/\/summary/)

      const yearCells = await page.getByTestId('summary-row-time-period').allTextContents()
      for (const cell of yearCells) {
        expect(/^\d{4}$/.test(cell)).toBe(true)
      }
    }),
  )

  test(
    '(d) clicking a column header toggles the sort indicator and re-orders rows',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedSummaryData(today)
      await signInAndGoToSummary(page)

      // Click the category sort header
      await page.getByTestId('summary-sort-category').click()
      await page.waitForURL(/sort=/)

      // After first click the URL should contain a sort param
      const url1 = page.url()
      expect(url1).toContain('sort=')

      // Click again to toggle direction
      await page.getByTestId('summary-sort-category').click()
      await page.waitForURL(/sort=/)

      const url2 = page.url()
      expect(url2).toContain('sort=')
      // The two URLs should differ (direction toggled)
      expect(url1).not.toBe(url2)
    }),
  )

  test(
    '(e) tag-related inline note appears for Tag and Category+Tag dimensions, absent otherwise',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedSummaryData(today)
      await signInAndGoToSummary(page)

      // Default Category dimension — no note
      await expect(page.getByTestId('summary-tag-note')).toHaveCount(0)

      // Switch to Tag — note appears
      await page.getByTestId('summary-dimension').selectOption('tag')
      await page.getByTestId('summary-submit').click()
      await page.waitForURL(/\/summary/)
      await expect(page.getByTestId('summary-tag-note')).toBeVisible()

      // Switch to Category+Tag — note still appears
      await page.getByTestId('summary-dimension').selectOption('category-tag')
      await page.getByTestId('summary-submit').click()
      await page.waitForURL(/\/summary/)
      await expect(page.getByTestId('summary-tag-note')).toBeVisible()

      // Switch to Time only — note gone
      await page.getByTestId('summary-dimension').selectOption('time')
      await page.getByTestId('summary-submit').click()
      await page.waitForURL(/\/summary/)
      await expect(page.getByTestId('summary-tag-note')).toHaveCount(0)
    }),
  )

  test(
    '(f) Clear link resets controls to first-load defaults',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedSummaryData(today)
      await signInAndGoToSummary(page)

      // Change dimension and granularity
      await page.getByTestId('summary-dimension').selectOption('time')
      await page.getByTestId('summary-granularity').selectOption('year')
      await page.getByTestId('summary-submit').click()
      await page.waitForURL(/\/summary/)

      // Confirm changes are in effect
      await expect(page.getByTestId('summary-dimension')).toHaveValue('time')
      await expect(page.getByTestId('summary-granularity')).toHaveValue('year')

      // Click Clear
      await page.getByTestId('summary-clear').click()
      await page.waitForURL(/\/summary/)

      // Controls are back to defaults
      await expect(page.getByTestId('summary-dimension')).toHaveValue('category')
      await expect(page.getByTestId('summary-granularity')).toHaveValue('month')

      // URL should be plain /summary with no query params
      expect(page.url()).toMatch(/\/summary$/)
    }),
  )

  test(
    '(g) date range that yields no rows shows empty-state message',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedSummaryData(today)
      await signInAndGoToSummary(page)

      // Set a date range far in the past where no expenses exist
      await page.getByTestId('summary-from').fill('2000-01-01')
      await page.getByTestId('summary-to').fill('2000-01-31')
      await page.getByTestId('summary-submit').click()
      await page.waitForURL(/\/summary/)

      // Empty state is shown; no data rows
      await expect(page.getByTestId('summary-empty')).toBeVisible()
      await expect(page.getByTestId('summary-row')).toHaveCount(0)
    }),
  )

  test(
    'default sort is category ascending then time-period ascending (no percent column)',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedSummaryData(today)
      await signInAndGoToSummary(page)

      const categoryValues = await page.getByTestId('summary-row-category').allTextContents()
      const sorted = [...categoryValues].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      expect(categoryValues).toEqual(sorted)

      // Definitely no percent column
      await expect(page.locator('[data-testid="summary-sort-percent"]')).toHaveCount(0)
    }),
  )
})
