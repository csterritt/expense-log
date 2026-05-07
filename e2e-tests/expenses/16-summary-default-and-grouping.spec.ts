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

test.describe('Summary page — default load and grouping', () => {
  test(
    'first load shows the summary page with filter bar and table',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2024-01-15',
          description: 'Lunch',
          amountCents: 1000,
          categoryName: 'food',
          tagNames: ['work'],
        },
        {
          date: '2024-02-20',
          description: 'Dinner',
          amountCents: 2000,
          categoryName: 'food',
          tagNames: ['work'],
        },
      ])

      await signInAndGoToSummary(page)

      await expect(page.getByTestId('summary-page')).toBeVisible()
      await expect(page.getByTestId('summary-filter-bar')).toBeVisible()
      await expect(page.getByTestId('summary-table')).toBeVisible()
    }),
  )

  test(
    'default grouping is by month with correct rows',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2024-01-15',
          description: 'Lunch',
          amountCents: 1000,
          categoryName: 'food',
          tagNames: ['work'],
        },
        {
          date: '2024-01-20',
          description: 'Dinner',
          amountCents: 2000,
          categoryName: 'food',
          tagNames: ['work'],
        },
        {
          date: '2024-02-05',
          description: 'Breakfast',
          amountCents: 500,
          categoryName: 'food',
          tagNames: ['work'],
        },
      ])

      await signInAndGoToSummary(page)

      const rows = page.getByTestId('summary-row')
      await expect(rows).toHaveCount(2)

      await expect(rows.nth(0).getByTestId('summary-row-date')).toHaveText('2024-01')
      await expect(rows.nth(0).getByTestId('summary-row-total')).toHaveText('$30.00')
      await expect(rows.nth(0).getByTestId('summary-row-count')).toHaveText('2')

      await expect(rows.nth(1).getByTestId('summary-row-date')).toHaveText('2024-02')
      await expect(rows.nth(1).getByTestId('summary-row-total')).toHaveText('$5.00')
      await expect(rows.nth(1).getByTestId('summary-row-count')).toHaveText('1')
    }),
  )

  test(
    'switching to year grouping shows yearly aggregates',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2024-01-15',
          description: 'Lunch',
          amountCents: 1000,
          categoryName: 'food',
          tagNames: ['work'],
        },
        {
          date: '2024-06-20',
          description: 'Dinner',
          amountCents: 2000,
          categoryName: 'food',
          tagNames: ['work'],
        },
        {
          date: '2025-02-05',
          description: 'Breakfast',
          amountCents: 500,
          categoryName: 'food',
          tagNames: ['work'],
        },
      ])

      await signInAndGoToSummary(page)

      await page.getByTestId('summary-group-by').selectOption('year')
      await page.getByTestId('summary-apply-filters').click()

      await page.waitForURL(/\/summary/)

      const rows = page.getByTestId('summary-row')
      await expect(rows).toHaveCount(2)

      await expect(rows.nth(0).getByTestId('summary-row-date')).toHaveText('2024')
      await expect(rows.nth(0).getByTestId('summary-row-total')).toHaveText('$30.00')
      await expect(rows.nth(0).getByTestId('summary-row-count')).toHaveText('2')

      await expect(rows.nth(1).getByTestId('summary-row-date')).toHaveText('2025')
      await expect(rows.nth(1).getByTestId('summary-row-total')).toHaveText('$5.00')
      await expect(rows.nth(1).getByTestId('summary-row-count')).toHaveText('1')
    }),
  )

  test(
    'grand total row shows correct aggregates',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2024-01-15',
          description: 'Lunch',
          amountCents: 1000,
          categoryName: 'food',
          tagNames: ['work'],
        },
        {
          date: '2024-01-20',
          description: 'Dinner',
          amountCents: 2000,
          categoryName: 'food',
          tagNames: ['work'],
        },
      ])

      await signInAndGoToSummary(page)

      await expect(page.getByTestId('summary-grand-total')).toHaveText('$30.00')
      await expect(page.getByTestId('summary-grand-count')).toHaveText('2')
    }),
  )

  test(
    'filter bar shows category dropdown with seeded categories',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2024-01-15',
          description: 'Lunch',
          amountCents: 1000,
          categoryName: 'food',
        },
        {
          date: '2024-01-20',
          description: 'Electric',
          amountCents: 500,
          categoryName: 'utilities',
        },
      ])

      await signInAndGoToSummary(page)

      const categorySelect = page.getByTestId('summary-category')
      await expect(categorySelect).toBeVisible()

      const options = await categorySelect.locator('option').allTextContents()
      expect(options).toContain('food')
      expect(options).toContain('utilities')
    }),
  )
})
