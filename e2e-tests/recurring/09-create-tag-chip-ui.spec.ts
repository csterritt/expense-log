import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedRecurringTemplates } from '../support/db-helpers'

const todayEt = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

const RECURRING_NEW_URL = 'http://localhost:3000/recurring/new'
const RECURRING_URL = 'http://localhost:3000/recurring'

const signInAndGoToNewRecurring = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
  await page.goto(RECURRING_NEW_URL)
}

test.describe('Recurring create form — tag chip-checkbox UI', () => {
  test(
    'every seeded tag appears as chip-checkbox in alphabetical order with wrap',
    testWithDatabase(async ({ page }) => {
      await seedRecurringTemplates([
        {
          description: 'seed template',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['food', 'gift', 'lego', 'restaurant'],
          recurrence: 'Monthly',
          anchorDate: todayEt(),
        },
      ])

      await signInAndGoToNewRecurring(page)

      const chipBlock = page.getByTestId('tag-chip-checkboxes')
      await expect(chipBlock).toBeVisible()

      const chips = chipBlock.locator('[data-testid^="tag-chip-"]')
      await expect(chips).toHaveCount(4)

      const names = await chips.allTextContents()
      const lower = names.map((n) => n.trim().toLowerCase())
      expect(lower).toEqual([...lower].sort())

      await expect(chipBlock).toHaveCSS('display', 'flex')

      await expect(page.getByTestId('tag-chip-food')).toBeVisible()
      await expect(page.getByTestId('tag-chip-gift')).toBeVisible()
      await expect(page.getByTestId('tag-chip-lego')).toBeVisible()
      await expect(page.getByTestId('tag-chip-restaurant')).toBeVisible()
    }),
  )

  test(
    'selected chip is visually distinct from unselected chip',
    testWithDatabase(async ({ page }) => {
      await seedRecurringTemplates([
        {
          description: 'seed template',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['food', 'gift'],
          recurrence: 'Monthly',
          anchorDate: todayEt(),
        },
      ])

      await signInAndGoToNewRecurring(page)

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
      await seedRecurringTemplates([
        {
          description: 'seed template',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['food'],
          recurrence: 'Monthly',
          anchorDate: todayEt(),
        },
      ])

      await signInAndGoToNewRecurring(page)

      const chipBlock = page.getByTestId('tag-chip-checkboxes')
      const checkboxes = chipBlock.locator('input[type="checkbox"]')
      await expect(checkboxes).toHaveCount(1)

      const name = await checkboxes.first().getAttribute('name')
      const value = await checkboxes.first().getAttribute('value')
      expect(name).toBe('tagId')
      expect(value).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
    }),
  )

  test(
    'new-tag input is present on the create form',
    testWithDatabase(async ({ page }) => {
      await seedRecurringTemplates([
        {
          description: 'seed template',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['food'],
          recurrence: 'Monthly',
          anchorDate: todayEt(),
        },
      ])

      await signInAndGoToNewRecurring(page)

      await expect(page.getByTestId('new-tags-input')).toBeVisible()
    }),
  )

  test(
    'toggling two chips on and submitting attaches both tags to the new recurring template',
    testWithDatabase(async ({ page }) => {
      await seedRecurringTemplates([
        {
          description: 'seed template',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['food', 'gift', 'lego', 'restaurant'],
          recurrence: 'Monthly',
          anchorDate: todayEt(),
        },
      ])

      await signInAndGoToNewRecurring(page)

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

      const today = todayEt()
      await page.getByTestId('recurring-form-description').fill('Monthly gym')
      await page.getByTestId('recurring-form-amount').fill('50.00')
      await page.getByTestId('recurring-form-anchor-date').fill(today)
      await page.getByTestId('recurring-form-category').fill('food')
      await page.getByTestId('recurring-form-recurrence').selectOption('Monthly')
      await page.getByTestId('recurring-form-create').click()

      await page.waitForURL(RECURRING_URL)
      await expect(page.getByTestId('confirm-recurring-create-new-page')).toHaveCount(0)

      const row = page.getByTestId('recurring-row').filter({ hasText: 'Monthly gym' })
      await expect(row).toHaveCount(1)
      const tagText = await row.getByTestId('recurring-row-tags').textContent()
      expect(tagText).toContain('food')
      expect(tagText).toContain('restaurant')
      expect(tagText).not.toContain('gift')
      expect(tagText).not.toContain('lego')
    }),
  )

  test(
    'typing a new tag name reaches the recurring confirmation page',
    testWithDatabase(async ({ page }) => {
      await seedRecurringTemplates([
        {
          description: 'seed template',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['food'],
          recurrence: 'Monthly',
          anchorDate: todayEt(),
        },
      ])

      await signInAndGoToNewRecurring(page)

      await page.getByTestId('new-tags-input').fill('brandnewtag')

      const today = todayEt()
      await page.getByTestId('recurring-form-description').fill('Monthly gym')
      await page.getByTestId('recurring-form-amount').fill('50.00')
      await page.getByTestId('recurring-form-anchor-date').fill(today)
      await page.getByTestId('recurring-form-category').fill('food')
      await page.getByTestId('recurring-form-recurrence').selectOption('Monthly')
      await page.getByTestId('recurring-form-create').click()

      await expect(page.getByTestId('confirm-recurring-create-new-page')).toBeVisible()
      await expect(page.getByTestId('confirm-recurring-create-new-tag-line')).toContainText('brandnewtag')
    }),
  )

  test(
    'cancelling the confirmation preserves chip selections and new-tags text',
    testWithDatabase(async ({ page }) => {
      await seedRecurringTemplates([
        {
          description: 'seed template',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['food', 'gift'],
          recurrence: 'Monthly',
          anchorDate: todayEt(),
        },
      ])

      await signInAndGoToNewRecurring(page)

      const foodLabel = page.getByTestId('tag-chip-food')
      await foodLabel.click()
      const foodInput = foodLabel.locator('input[type="checkbox"]')
      await expect(foodInput).toBeChecked()

      await page.getByTestId('new-tags-input').fill('brandnewtag')

      const today = todayEt()
      await page.getByTestId('recurring-form-description').fill('Monthly gym')
      await page.getByTestId('recurring-form-amount').fill('50.00')
      await page.getByTestId('recurring-form-anchor-date').fill(today)
      await page.getByTestId('recurring-form-category').fill('newcat')
      await page.getByTestId('recurring-form-recurrence').selectOption('Monthly')
      await page.getByTestId('recurring-form-create').click()

      await expect(page.getByTestId('confirm-recurring-create-new-page')).toBeVisible()

      await page.getByTestId('confirm-recurring-create-new-cancel').click()

      await expect(page).toHaveURL(RECURRING_NEW_URL)

      const restoredFoodInput = page.getByTestId('tag-chip-food').locator('input[type="checkbox"]')
      await expect(restoredFoodInput).toBeChecked()

      await expect(page.getByTestId('new-tags-input')).toHaveValue('brandnewtag')
    }),
  )
})
