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

test.describe('Expense entry form — tag chip-checkbox UI', () => {
  test(
    'every seeded tag appears as chip-checkbox in alphabetical order with wrap',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['food', 'gift', 'lego', 'restaurant'],
        },
      ])

      await signInAndGoToExpenses(page)

      const chipBlock = page.getByTestId('tag-chip-checkboxes')
      await expect(chipBlock).toBeVisible()

      const chips = chipBlock.locator('[data-testid^="tag-chip-"]')
      await expect(chips).toHaveCount(4)

      const names = await chips.allTextContents()
      const lower = names.map((n) => n.trim().toLowerCase())
      expect(lower).toEqual([...lower].sort())

      await expect(chipBlock).toHaveCSS('display', 'flex')

      const foodChip = page.getByTestId('tag-chip-food')
      await expect(foodChip).toBeVisible()
      const giftChip = page.getByTestId('tag-chip-gift')
      await expect(giftChip).toBeVisible()
      const legoChip = page.getByTestId('tag-chip-lego')
      await expect(legoChip).toBeVisible()
      const restaurantChip = page.getByTestId('tag-chip-restaurant')
      await expect(restaurantChip).toBeVisible()
    }),
  )

  test(
    'toggling two chips on and submitting attaches both tags',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['food', 'gift', 'lego', 'restaurant'],
        },
      ])

      await signInAndGoToExpenses(page)

      const foodLabel = page.getByTestId('tag-chip-food')
      await foodLabel.click()

      const restaurantLabel = page.getByTestId('tag-chip-restaurant')
      await restaurantLabel.click()

      const foodInput = foodLabel.locator('input[type="checkbox"]')
      await expect(foodInput).toBeChecked()
      const restaurantInput = restaurantLabel.locator('input[type="checkbox"]')
      await expect(restaurantInput).toBeChecked()

      const giftInput = page.getByTestId('tag-chip-gift').locator('input[type="checkbox"]')
      await expect(giftInput).not.toBeChecked()

      await page.getByTestId('expense-form-description').fill('Dinner out')
      await page.getByTestId('expense-form-amount').fill('35.00')
      await page.getByTestId('expense-form-date').fill(todayEt())
      await page.getByTestId('expense-form-category').fill('food')
      await page.getByTestId('expense-form-create').click()

      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('confirm-create-new-page')).toHaveCount(0)

      const row = page.getByTestId('expense-row').filter({ hasText: 'Dinner out' })
      await expect(row).toHaveCount(1)
      const rowTags = row.getByTestId('expense-row-tags')
      const tagText = await rowTags.textContent()
      expect(tagText).toContain('food')
      expect(tagText).toContain('restaurant')
      expect(tagText).not.toContain('gift')
      expect(tagText).not.toContain('lego')
    }),
  )

  test(
    'selected chip is visually distinct from unselected chip',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['food', 'gift'],
        },
      ])

      await signInAndGoToExpenses(page)

      const foodLabel = page.getByTestId('tag-chip-food')
      const giftLabel = page.getByTestId('tag-chip-gift')

      const foodClassBefore = await foodLabel.getAttribute('class')
      const giftClassBefore = await giftLabel.getAttribute('class')
      expect(foodClassBefore).toEqual(giftClassBefore)

      await foodLabel.click()

      const foodClassAfter = await foodLabel.getAttribute('class')
      const giftClassAfter = await giftLabel.getAttribute('class')

      expect(foodClassAfter).not.toEqual(foodClassBefore)
      expect(giftClassAfter).toEqual(giftClassBefore)
    }),
  )

  test(
    'chip inputs have name=tagId and value=<ulid>',
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

      const chipBlock = page.getByTestId('tag-chip-checkboxes')
      const checkboxes = chipBlock.locator('input[type="checkbox"]')
      await expect(checkboxes).toHaveCount(1)

      const name = await checkboxes.first().getAttribute('name')
      const value = await checkboxes.first().getAttribute('value')
      expect(name).toBe('tagId')
      expect(value).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
    }),
  )
})
