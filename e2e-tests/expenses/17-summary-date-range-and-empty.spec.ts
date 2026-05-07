import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedExpenses } from '../support/db-helpers'

const todayEt = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

const signInAndGoToSummary = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
  await page.goto(BASE_URLS.SUMMARY)
}

test.describe('Summary page — date-range filter and empty state', () => {
  test(
    'date range filter narrows results to matching period',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2024-01-15',
          description: 'January expense',
          amountCents: 1000,
          categoryName: 'food',
          tagNames: ['work'],
        },
        {
          date: '2024-03-20',
          description: 'March expense',
          amountCents: 2000,
          categoryName: 'food',
          tagNames: ['work'],
        },
        {
          date: '2024-06-05',
          description: 'June expense',
          amountCents: 500,
          categoryName: 'food',
          tagNames: ['work'],
        },
      ])

      await signInAndGoToSummary(page)

      await page.getByTestId('summary-from').fill('2024-02-01')
      await page.getByTestId('summary-to').fill('2024-05-31')
      await page.getByTestId('summary-apply-filters').click()

      await page.waitForURL(/\/summary/)

      const rows = page.getByTestId('summary-row')
      await expect(rows).toHaveCount(1)
      await expect(rows.nth(0).getByTestId('summary-row-date')).toHaveText('2024-03')
    }),
  )

  test(
    'empty state shown when no expenses match filters',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2024-01-15',
          description: 'Lunch',
          amountCents: 1000,
          categoryName: 'food',
        },
      ])

      await signInAndGoToSummary(page)

      await page.getByTestId('summary-from').fill('2025-01-01')
      await page.getByTestId('summary-to').fill('2025-12-31')
      await page.getByTestId('summary-apply-filters').click()

      await page.waitForURL(/\/summary/)

      await expect(page.getByTestId('summary-empty')).toBeVisible()
      await expect(page.getByTestId('summary-table')).toHaveCount(0)
    }),
  )

  test(
    'empty state shown when no expenses exist at all',
    testWithDatabase(async ({ page }) => {
      await signInAndGoToSummary(page)

      await expect(page.getByTestId('summary-empty')).toBeVisible()
      await expect(page.getByTestId('summary-table')).toHaveCount(0)
    }),
  )

  test(
    'category filter narrows results to matching category',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2024-01-15',
          description: 'Food expense',
          amountCents: 1000,
          categoryName: 'food',
          tagNames: ['work'],
        },
        {
          date: '2024-01-20',
          description: 'Utilities expense',
          amountCents: 500,
          categoryName: 'utilities',
          tagNames: ['work'],
        },
      ])

      await signInAndGoToSummary(page)

      await page.getByTestId('summary-category').selectOption({ label: 'food' })
      await page.getByTestId('summary-apply-filters').click()

      await page.waitForURL(/\/summary/)

      const rows = page.getByTestId('summary-row')
      await expect(rows).toHaveCount(1)
      await expect(rows.nth(0).getByTestId('summary-row-category')).toHaveText('food')
    }),
  )

  test(
    'tag filter narrows results to matching tag',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2024-01-15',
          description: 'Work lunch',
          amountCents: 1000,
          categoryName: 'food',
          tagNames: ['work'],
        },
        {
          date: '2024-01-20',
          description: 'Personal dinner',
          amountCents: 2000,
          categoryName: 'food',
          tagNames: ['personal'],
        },
      ])

      await signInAndGoToSummary(page)

      const workTag = page.getByTestId('summary-tag-work')
      await workTag.click()
      await page.getByTestId('summary-apply-filters').click()

      await page.waitForURL(/\/summary/)

      const rows = page.getByTestId('summary-row')
      await expect(rows).toHaveCount(1)
      await expect(rows.nth(0).getByTestId('summary-row-tag')).toHaveText('work')
    }),
  )
})
