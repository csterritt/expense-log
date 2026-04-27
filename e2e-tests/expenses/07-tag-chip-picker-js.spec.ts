import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedCategories, seedExpenses } from '../support/db-helpers'

const signInAndGoToExpenses = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
  await page.goto(BASE_URLS.EXPENSES)
}

test.describe('Tag chip picker (JS on)', () => {
  test(
    'adds chips by click and keyboard, removes by click and backspace, and submits successfully',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'food' }])
      await seedExpenses([
        {
          date: '2024-01-15',
          description: 'seeded-expense',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['groceries'],
        },
      ])
      await signInAndGoToExpenses(page)

      // Tags JSON is present from the seeded expense.
      const tagInput = page.getByPlaceholder('e.g. food, groceries')
      await tagInput.focus()

      // Click-select an existing tag suggestion.
      await expect(page.getByTestId('tag-chip-picker-option-groceries')).toBeVisible()
      await page.getByTestId('tag-chip-picker-option-groceries').click()
      await expect(page.getByTestId('tag-chip-picker-chips')).toContainText('groceries')

      // Add a brand-new tag via comma.
      await tagInput.fill('new-tag')
      await tagInput.press(',')
      await expect(page.getByTestId('tag-chip-picker-chips')).toContainText('new-tag')

      // Add another tag via Enter using the suggestion list.
      await tagInput.fill('foo')
      await expect(page.getByTestId('tag-chip-picker-create')).toBeVisible()
      await tagInput.press('Enter')
      await expect(page.getByTestId('tag-chip-picker-chips')).toContainText('foo')

      // Hidden input stays in sync.
      const hiddenInput = page.locator('input[type="hidden"][name="tags"]')
      await expect(hiddenInput).toHaveValue('groceries,new-tag,foo')

      // Remove a chip by clicking its × button.
      await page.getByTestId('tag-chip-picker-remove-new-tag').click()
      await expect(page.getByTestId('tag-chip-picker-chips')).not.toContainText('new-tag')
      await expect(hiddenInput).toHaveValue('groceries,foo')

      // Remove last chip by pressing Backspace when the text input is empty.
      await tagInput.fill('')
      await tagInput.press('Backspace')
      await expect(page.getByTestId('tag-chip-picker-chips')).not.toContainText('foo')
      await expect(hiddenInput).toHaveValue('groceries')

      // Fill the rest of the form and submit.
      await page.getByTestId('expense-form-description').fill('Chip test')
      await page.getByTestId('expense-form-amount').fill('12.34')
      await page.getByTestId('expense-form-category').fill('food')

      // Re-add a couple of tags so the submitted expense carries them.
      await tagInput.fill('fun')
      await tagInput.press('Enter')
      await tagInput.fill('work')
      await tagInput.press('Enter')

      await page.getByTestId('expense-form-create').click()
      await page.waitForURL(BASE_URLS.EXPENSES)

      // Verify the new row renders with the expected tags.
      const firstRowTags = page.getByTestId('expense-row-tags').first()
      await expect(firstRowTags).toContainText('fun')
      await expect(firstRowTags).toContainText('work')
    }),
  )
})
