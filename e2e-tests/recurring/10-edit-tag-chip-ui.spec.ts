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

const RECURRING_URL = 'http://localhost:3000/recurring'

const signInAndGoToEditRecurring = async (page: any, id: string) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
  await page.goto(`http://localhost:3000/recurring/${id}/edit`)
}

test.describe('Recurring edit form — tag chip-checkbox UI', () => {
  test(
    'pre-existing tag attachments render as selected chips on initial load',
    testWithDatabase(async ({ page }) => {
      const [id] = await seedRecurringTemplates([
        {
          description: 'Monthly gym',
          amountCents: 5000,
          categoryName: 'health',
          tagNames: ['food', 'gift'],
          recurrence: 'Monthly',
          anchorDate: todayEt(),
        },
      ])

      await signInAndGoToEditRecurring(page, id)
      await expect(page.getByTestId('recurring-edit-page')).toBeVisible()

      const foodInput = page.getByTestId('tag-chip-food').locator('input[type="checkbox"]')
      await expect(foodInput).toBeChecked()
      const giftInput = page.getByTestId('tag-chip-gift').locator('input[type="checkbox"]')
      await expect(giftInput).toBeChecked()
    }),
  )

  test(
    'all seeded tags appear as chip-checkboxes in alphabetical order with wrap',
    testWithDatabase(async ({ page }) => {
      const [id] = await seedRecurringTemplates([
        {
          description: 'Monthly gym',
          amountCents: 5000,
          categoryName: 'health',
          tagNames: ['food', 'gift', 'lego', 'restaurant'],
          recurrence: 'Monthly',
          anchorDate: todayEt(),
        },
      ])

      await signInAndGoToEditRecurring(page, id)
      await expect(page.getByTestId('recurring-edit-page')).toBeVisible()

      const chipBlock = page.getByTestId('tag-chip-checkboxes')
      await expect(chipBlock).toBeVisible()
      await expect(chipBlock).toHaveCSS('display', 'flex')

      const chips = chipBlock.locator('[data-testid^="tag-chip-"]')
      await expect(chips).toHaveCount(4)

      const names = await chips.allTextContents()
      const lower = names.map((n) => n.trim().toLowerCase())
      expect(lower).toEqual([...lower].sort())
    }),
  )

  test(
    'selected chip is visually distinct from unselected chip on edit form',
    testWithDatabase(async ({ page }) => {
      const [id] = await seedRecurringTemplates([
        {
          description: 'Monthly gym',
          amountCents: 5000,
          categoryName: 'health',
          tagNames: ['food', 'gift'],
          recurrence: 'Monthly',
          anchorDate: todayEt(),
        },
      ])

      await signInAndGoToEditRecurring(page, id)
      await expect(page.getByTestId('recurring-edit-page')).toBeVisible()

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
    'chip inputs have name=tagId and value=<ulid> on the edit form',
    testWithDatabase(async ({ page }) => {
      const [id] = await seedRecurringTemplates([
        {
          description: 'Monthly gym',
          amountCents: 5000,
          categoryName: 'health',
          tagNames: ['food'],
          recurrence: 'Monthly',
          anchorDate: todayEt(),
        },
      ])

      await signInAndGoToEditRecurring(page, id)
      await expect(page.getByTestId('recurring-edit-page')).toBeVisible()

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
    'new-tag input is present on the edit form',
    testWithDatabase(async ({ page }) => {
      const [id] = await seedRecurringTemplates([
        {
          description: 'Monthly gym',
          amountCents: 5000,
          categoryName: 'health',
          tagNames: ['food'],
          recurrence: 'Monthly',
          anchorDate: todayEt(),
        },
      ])

      await signInAndGoToEditRecurring(page, id)
      await expect(page.getByTestId('recurring-edit-page')).toBeVisible()

      await expect(page.getByTestId('new-tags-input')).toBeVisible()
    }),
  )

  test(
    'toggling a chip off detaches the corresponding tag on save',
    testWithDatabase(async ({ page }) => {
      const [id] = await seedRecurringTemplates([
        {
          description: 'Monthly gym',
          amountCents: 5000,
          categoryName: 'health',
          tagNames: ['food', 'gift'],
          recurrence: 'Monthly',
          anchorDate: todayEt(),
        },
      ])

      await signInAndGoToEditRecurring(page, id)
      await expect(page.getByTestId('recurring-edit-page')).toBeVisible()

      const foodLabel = page.getByTestId('tag-chip-food')
      await foodLabel.click()
      const foodInput = foodLabel.locator('input[type="checkbox"]')
      await expect(foodInput).not.toBeChecked()

      const giftInput = page.getByTestId('tag-chip-gift').locator('input[type="checkbox"]')
      await expect(giftInput).toBeChecked()

      await page.getByTestId('recurring-form-save').click()
      await page.waitForURL(RECURRING_URL)

      const row = page.getByTestId('recurring-row').filter({ hasText: 'Monthly gym' })
      await expect(row).toHaveCount(1)
      const tagText = await row.getByTestId('recurring-row-tags').textContent()
      expect(tagText).toContain('gift')
      expect(tagText).not.toContain('food')
    }),
  )

  test(
    'toggling a chip on adds that tag on save',
    testWithDatabase(async ({ page }) => {
      const [id] = await seedRecurringTemplates([
        {
          description: 'Monthly gym',
          amountCents: 5000,
          categoryName: 'health',
          tagNames: ['food', 'gift'],
          recurrence: 'Monthly',
          anchorDate: todayEt(),
        },
      ])

      await signInAndGoToEditRecurring(page, id)
      await expect(page.getByTestId('recurring-edit-page')).toBeVisible()

      const foodLabel = page.getByTestId('tag-chip-food')
      await foodLabel.click()
      await foodLabel.click()

      const foodInput = foodLabel.locator('input[type="checkbox"]')
      await expect(foodInput).toBeChecked()

      await page.getByTestId('recurring-form-save').click()
      await page.waitForURL(RECURRING_URL)

      const row = page.getByTestId('recurring-row').filter({ hasText: 'Monthly gym' })
      await expect(row).toHaveCount(1)
      const tagText = await row.getByTestId('recurring-row-tags').textContent()
      expect(tagText).toContain('food')
      expect(tagText).toContain('gift')
    }),
  )

  test(
    'typing a new tag name reaches the recurring edit confirmation page',
    testWithDatabase(async ({ page }) => {
      const [id] = await seedRecurringTemplates([
        {
          description: 'Monthly gym',
          amountCents: 5000,
          categoryName: 'health',
          tagNames: ['food'],
          recurrence: 'Monthly',
          anchorDate: todayEt(),
        },
      ])

      await signInAndGoToEditRecurring(page, id)
      await expect(page.getByTestId('recurring-edit-page')).toBeVisible()

      await page.getByTestId('new-tags-input').fill('brandnewtag')
      await page.getByTestId('recurring-form-save').click()

      await expect(page.getByTestId('confirm-recurring-edit-new-page')).toBeVisible()
      await expect(page.getByTestId('confirm-recurring-edit-new-tag-line')).toContainText('brandnewtag')
    }),
  )

  test(
    'cancelling the confirmation preserves chip selections and new-tags text',
    testWithDatabase(async ({ page }) => {
      const [id] = await seedRecurringTemplates([
        {
          description: 'Monthly gym',
          amountCents: 5000,
          categoryName: 'health',
          tagNames: ['food', 'gift'],
          recurrence: 'Monthly',
          anchorDate: todayEt(),
        },
      ])

      await signInAndGoToEditRecurring(page, id)
      await expect(page.getByTestId('recurring-edit-page')).toBeVisible()

      const foodLabel = page.getByTestId('tag-chip-food')
      const foodInput = foodLabel.locator('input[type="checkbox"]')
      await expect(foodInput).toBeChecked()

      await page.getByTestId('new-tags-input').fill('brandnewtag')
      await page.getByTestId('recurring-form-save').click()

      await expect(page.getByTestId('confirm-recurring-edit-new-page')).toBeVisible()

      await page.getByTestId('confirm-recurring-edit-new-cancel').click()
      await expect(page).toHaveURL(`http://localhost:3000/recurring/${id}/edit`)

      const restoredFoodInput = page.getByTestId('tag-chip-food').locator('input[type="checkbox"]')
      await expect(restoredFoodInput).toBeChecked()

      await expect(page.getByTestId('new-tags-input')).toHaveValue('brandnewtag')
    }),
  )
})
