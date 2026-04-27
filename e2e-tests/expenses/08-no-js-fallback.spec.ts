import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedCategories } from '../support/db-helpers'

test.use({ javaScriptEnabled: false })

const signInAndGoToExpenses = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
  await page.goto(BASE_URLS.EXPENSES)
}

test.describe('No-JS fallback', () => {
  test(
    'category and tags inputs remain plain text and form submits successfully',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'food' }])
      await signInAndGoToExpenses(page)

      // Category input is a plain text field without combobox enhancements.
      const categoryInput = page.getByTestId('expense-form-category')
      await expect(categoryInput).toHaveAttribute('type', 'text')
      await expect(categoryInput).not.toHaveAttribute('role', 'combobox')
      await expect(page.getByTestId('category-combobox-dropdown')).not.toBeVisible()

      // Tags input is a plain text field without chip-picker enhancements.
      const tagsInput = page.getByTestId('expense-form-tags')
      await expect(tagsInput).toHaveAttribute('type', 'text')
      await expect(page.getByTestId('tag-chip-picker-chips')).not.toBeVisible()

      // Fill and submit the form using plain text values.
      await page.getByTestId('expense-form-description').fill('No-JS expense')
      await page.getByTestId('expense-form-amount').fill('56.78')
      await categoryInput.fill('food')
      await tagsInput.fill('plain, text, tags')
      await page.getByTestId('expense-form-create').click()
      await page.waitForURL(BASE_URLS.EXPENSES)

      // The expense row should appear with the plain-text tags.
      const firstRowDesc = page.getByTestId('expense-row-description').first()
      await expect(firstRowDesc).toHaveText('No-JS expense')
      const firstRowAmount = page.getByTestId('expense-row-amount').first()
      await expect(firstRowAmount).toHaveText('56.78')
      const firstRowTags = page.getByTestId('expense-row-tags').first()
      await expect(firstRowTags).toContainText('plain')
      await expect(firstRowTags).toContainText('text')
      await expect(firstRowTags).toContainText('tags')
    }),
  )
})
