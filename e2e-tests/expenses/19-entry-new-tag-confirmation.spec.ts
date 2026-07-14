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

test.describe('Expense entry form — new-tag confirmation flow', () => {
  test(
    'typing two new tag names with mixed separator reaches confirmation page listing both',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'food',
          tagNames: [],
        },
      ])

      await signInAndGoToExpenses(page)

      const newTagsInput = page.getByTestId('new-tags-input')
      await expect(newTagsInput).toBeVisible()
      await newTagsInput.fill('lunch, dinner')

      await page.getByTestId('expense-form-description').fill('Mixed tags')
      await page.getByTestId('expense-form-amount').fill('25.00')
      await page.getByTestId('expense-form-date').fill(todayEt())
      await page.getByTestId('expense-form-category').fill('food')
      await page.getByTestId('expense-form-create').click()

      await expect(page.getByTestId('confirm-create-new-page')).toBeVisible()

      const tagLines = page.getByTestId('confirm-create-new-tag-line')
      await expect(tagLines).toHaveCount(2)

      const tagTexts = await tagLines.allTextContents()
      const sorted = tagTexts.map((t) => t.toLowerCase())
      expect(sorted.some((t) => t.includes('dinner'))).toBe(true)
      expect(sorted.some((t) => t.includes('lunch'))).toBe(true)

      await page.getByTestId('confirm-create-new-confirm').click()
      await page.waitForURL(BASE_URLS.EXPENSES)

      const row = page.getByTestId('expense-row').filter({ hasText: 'Mixed tags' })
      await expect(row).toHaveCount(1)
      const tagText = await row.getByTestId('expense-row-tags').textContent()
      expect(tagText).toContain('dinner')
      expect(tagText).toContain('lunch')
    }),
  )

  test(
    'typing Food in new-tags while food chip is selected attaches food exactly once',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['food'],
        },
      ])

      await signInAndGoToExpenses(page)

      const foodLabel = page.getByTestId('tag-chip-food')
      await foodLabel.click()

      const newTagsInput = page.getByTestId('new-tags-input')
      await expect(newTagsInput).toBeVisible()
      await newTagsInput.fill('Food')

      await page.getByTestId('expense-form-description').fill('Dedup test')
      await page.getByTestId('expense-form-amount').fill('10.00')
      await page.getByTestId('expense-form-date').fill(todayEt())
      await page.getByTestId('expense-form-category').fill('food')
      await page.getByTestId('expense-form-create').click()

      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('confirm-create-new-page')).toHaveCount(0)

      const row = page.getByTestId('expense-row').filter({ hasText: 'Dedup test' })
      await expect(row).toHaveCount(1)

      const tagText = await row.getByTestId('expense-row-tags').textContent()
      const count = (tagText ?? '').split('food').length - 1
      expect(count).toBe(1)
    }),
  )

  test(
    'mixed comma and whitespace separator in new-tags creates all named tags',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'food',
          tagNames: [],
        },
      ])

      await signInAndGoToExpenses(page)

      const newTagsInput = page.getByTestId('new-tags-input')
      await newTagsInput.fill('alpha, beta gamma')

      await page.getByTestId('expense-form-description').fill('Separator test')
      await page.getByTestId('expense-form-amount').fill('5.00')
      await page.getByTestId('expense-form-date').fill(todayEt())
      await page.getByTestId('expense-form-category').fill('food')
      await page.getByTestId('expense-form-create').click()

      await expect(page.getByTestId('confirm-create-new-page')).toBeVisible()
      const tagLines = page.getByTestId('confirm-create-new-tag-line')
      await expect(tagLines).toHaveCount(3)

      await page.getByTestId('confirm-create-new-confirm').click()
      await page.waitForURL(BASE_URLS.EXPENSES)

      const row = page.getByTestId('expense-row').filter({ hasText: 'Separator test' })
      await expect(row).toHaveCount(1)
      const tagText = await row.getByTestId('expense-row-tags').textContent()
      expect(tagText).toContain('alpha')
      expect(tagText).toContain('beta')
      expect(tagText).toContain('gamma')
    }),
  )
})
