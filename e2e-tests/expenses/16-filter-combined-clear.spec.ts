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

const signInAndGoToExpenses = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
  await page.goto(BASE_URLS.EXPENSES)
}

test.describe('Expense filter bar — combined filters and Clear', () => {
  test(
    'combining description + from + category narrows results correctly',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedExpenses([
        {
          date: today,
          description: 'Lunch food',
          amountCents: 100,
          categoryName: 'food',
        },
        {
          date: today,
          description: 'Lunch utilities',
          amountCents: 200,
          categoryName: 'utilities',
        },
        {
          date: '2020-01-01',
          description: 'Lunch old',
          amountCents: 300,
          categoryName: 'food',
        },
      ])

      await signInAndGoToExpenses(page)

      await page.getByTestId('filter-description').fill('Lunch')
      await page.getByTestId('filter-from').fill('2024-01-01')
      await page.getByTestId('filter-category').selectOption({ label: 'food' })
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).toContain('Lunch food')
      expect(descriptions).not.toContain('Lunch utilities')
      expect(descriptions).not.toContain('Lunch old')
    }),
  )

  test(
    'Clear filters link is absent on first load',
    testWithDatabase(async ({ page }) => {
      await signInAndGoToExpenses(page)
      await expect(page.getByTestId('filter-clear')).toHaveCount(0)
    }),
  )

  test(
    'Clear filters link appears after applying a description filter',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedExpenses([
        {
          date: today,
          description: 'Any expense',
          amountCents: 100,
          categoryName: 'food',
        },
      ])

      await signInAndGoToExpenses(page)

      await page.getByTestId('filter-description').fill('Any')
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      await expect(page.getByTestId('filter-clear')).toBeVisible()
    }),
  )

  test(
    'Clear filters link navigates back to unfiltered page and removes filter inputs',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedExpenses([
        {
          date: today,
          description: 'Visible expense',
          amountCents: 100,
          categoryName: 'food',
        },
        {
          date: '2020-01-01',
          description: 'Old expense',
          amountCents: 200,
          categoryName: 'food',
        },
      ])

      await signInAndGoToExpenses(page)

      await page.getByTestId('filter-from').fill('2024-01-01')
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      const descriptionsAfterFilter =
        await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptionsAfterFilter).not.toContain('Old expense')

      await page.getByTestId('filter-clear').click()
      await page.waitForURL(BASE_URLS.EXPENSES)

      await expect(page.getByTestId('filter-description')).toHaveValue('')
      await expect(page.getByTestId('filter-from')).toHaveValue('')
      await expect(page.getByTestId('filter-to')).toHaveValue('')
      await expect(page.getByTestId('filter-clear')).toHaveCount(0)
    }),
  )

  test(
    'empty filter submission shows empty-state when no matches',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedExpenses([
        {
          date: today,
          description: 'Matching expense',
          amountCents: 100,
          categoryName: 'food',
        },
      ])

      await signInAndGoToExpenses(page)

      await page.getByTestId('filter-description').fill('xyznonexistent')
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      await expect(page.getByTestId('expenses-empty-state')).toBeVisible()
    }),
  )

  test(
    'Clear filters after no-result search shows expenses again',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedExpenses([
        {
          date: today,
          description: 'Real expense',
          amountCents: 100,
          categoryName: 'food',
        },
      ])

      await signInAndGoToExpenses(page)

      await page.getByTestId('filter-description').fill('xyznonexistent')
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      await expect(page.getByTestId('expenses-empty-state')).toBeVisible()

      await page.getByTestId('filter-clear').click()
      await page.waitForURL(BASE_URLS.EXPENSES)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).toContain('Real expense')
    }),
  )

  test(
    'description + tag OR filter is additive AND between both fields',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedExpenses([
        {
          date: today,
          description: 'Lunch with work tag',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['work'],
        },
        {
          date: today,
          description: 'Lunch no tag',
          amountCents: 200,
          categoryName: 'food',
        },
        {
          date: today,
          description: 'Dinner with work tag',
          amountCents: 300,
          categoryName: 'food',
          tagNames: ['work'],
        },
      ])

      await signInAndGoToExpenses(page)

      await page.getByTestId('filter-description').fill('Lunch')
      await page.getByTestId('filter-tag-work').check()
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).toContain('Lunch with work tag')
      expect(descriptions).not.toContain('Lunch no tag')
      expect(descriptions).not.toContain('Dinner with work tag')
    }),
  )
})
