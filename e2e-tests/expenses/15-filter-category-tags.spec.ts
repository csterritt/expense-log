import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedExpenses, seedTags } from '../support/db-helpers'

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

test.describe('Expense filter bar — category and tag filters', () => {
  const filterBar = (page: any) => page.getByTestId('expense-filter-bar')
  test(
    'category dropdown filters results to matching category',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedExpenses([
        {
          date: today,
          description: 'Food expense',
          amountCents: 100,
          categoryName: 'food',
        },
        {
          date: today,
          description: 'Utilities expense',
          amountCents: 200,
          categoryName: 'utilities',
        },
      ])

      await signInAndGoToExpenses(page)

      const categorySelect = page.getByTestId('filter-category')
      await expect(categorySelect).toBeVisible()
      await categorySelect.selectOption({ label: 'food' })
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).toContain('Food expense')
      expect(descriptions).not.toContain('Utilities expense')
    }),
  )

  test(
    'all-categories option returns all expenses',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedExpenses([
        {
          date: today,
          description: 'Food expense',
          amountCents: 100,
          categoryName: 'food',
        },
        {
          date: today,
          description: 'Utilities expense',
          amountCents: 200,
          categoryName: 'utilities',
        },
      ])

      await signInAndGoToExpenses(page)

      const categorySelect = page.getByTestId('filter-category')
      await categorySelect.selectOption({ value: '' })
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).toContain('Food expense')
      expect(descriptions).toContain('Utilities expense')
    }),
  )

  test(
    'tag checkboxes are displayed when tags exist',
    testWithDatabase(async ({ page }) => {
      await seedTags([{ name: 'work' }, { name: 'personal' }])
      await signInAndGoToExpenses(page)

      await expect(filterBar(page).getByTestId('tag-chip-work')).toBeVisible()
      await expect(filterBar(page).getByTestId('tag-chip-personal')).toBeVisible()
    }),
  )

  test(
    'tag OR filter returns expenses with any selected tag',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedExpenses([
        {
          date: today,
          description: 'Work only',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['work'],
        },
        {
          date: today,
          description: 'Personal only',
          amountCents: 200,
          categoryName: 'food',
          tagNames: ['personal'],
        },
        {
          date: today,
          description: 'No tags',
          amountCents: 300,
          categoryName: 'food',
        },
      ])

      await signInAndGoToExpenses(page)

      await filterBar(page).getByTestId('tag-chip-work').click()
      await filterBar(page).getByTestId('tag-chip-personal').click()
      await filterBar(page).getByTestId('filter-tag-mode-or').check()
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).toContain('Work only')
      expect(descriptions).toContain('Personal only')
      expect(descriptions).not.toContain('No tags')
    }),
  )

  test(
    'tag AND filter returns only expenses with all selected tags',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedExpenses([
        {
          date: today,
          description: 'Work only',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['work'],
        },
        {
          date: today,
          description: 'Personal only',
          amountCents: 200,
          categoryName: 'food',
          tagNames: ['personal'],
        },
        {
          date: today,
          description: 'Both tags',
          amountCents: 300,
          categoryName: 'food',
          tagNames: ['work', 'personal'],
        },
      ])

      await signInAndGoToExpenses(page)

      await filterBar(page).getByTestId('tag-chip-work').click()
      await filterBar(page).getByTestId('tag-chip-personal').click()
      await filterBar(page).getByTestId('filter-tag-mode-and').check()
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).not.toContain('Work only')
      expect(descriptions).not.toContain('Personal only')
      expect(descriptions).toContain('Both tags')
    }),
  )

  test(
    'single-tag filter with OR mode returns only that tagged expense',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedExpenses([
        {
          date: today,
          description: 'Has work tag',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['work'],
        },
        {
          date: today,
          description: 'No tags',
          amountCents: 200,
          categoryName: 'food',
        },
      ])

      await signInAndGoToExpenses(page)

      await filterBar(page).getByTestId('tag-chip-work').click()
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).toContain('Has work tag')
      expect(descriptions).not.toContain('No tags')
    }),
  )

  test(
    'tag selection persists after submit',
    testWithDatabase(async ({ page }) => {
      await seedTags([{ name: 'work' }])
      await signInAndGoToExpenses(page)

      await filterBar(page).getByTestId('tag-chip-work').click()
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      await expect(filterBar(page).getByTestId('tag-chip-work')).toBeChecked()
    }),
  )
})
