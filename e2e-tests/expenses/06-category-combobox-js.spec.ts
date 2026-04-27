import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedCategories } from '../support/db-helpers'

const signInAndGoToExpenses = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
  await page.goto(BASE_URLS.EXPENSES)
}

test.describe('Category combobox (JS on)', () => {
  test(
    'filters, selects by click, selects by keyboard, and shows a Create row',
    testWithDatabase(async ({ page }) => {
      await seedCategories([
        { name: 'food' },
        { name: 'transport' },
        { name: 'utilities' },
      ])
      await signInAndGoToExpenses(page)

      const catInput = page.getByTestId('expense-form-category')

      // Focus opens the dropdown with all categories
      await catInput.focus()
      const dropdown = page.getByTestId('category-combobox-dropdown')
      await expect(dropdown).toBeVisible()
      await expect(page.getByTestId('category-combobox-option-food')).toBeVisible()
      await expect(page.getByTestId('category-combobox-option-transport')).toBeVisible()
      await expect(page.getByTestId('category-combobox-option-utilities')).toBeVisible()

      // Filtering by typing partial text
      await catInput.fill('tra')
      await expect(page.getByTestId('category-combobox-option-transport')).toBeVisible()
      await expect(page.getByTestId('category-combobox-option-food')).not.toBeVisible()
      await expect(page.getByTestId('category-combobox-option-utilities')).not.toBeVisible()

      // Click-select an option
      await page.getByTestId('category-combobox-option-transport').click()
      await expect(catInput).toHaveValue('transport')
      await expect(dropdown).not.toBeVisible()

      // Keyboard-only selection
      await catInput.fill('foo')
      await expect(page.getByTestId('category-combobox-option-food')).toBeVisible()
      await catInput.press('ArrowDown')
      await catInput.press('Enter')
      await expect(catInput).toHaveValue('food')

      // Create row for a new category
      await catInput.fill('brand-new')
      const createRow = page.getByTestId('category-combobox-create')
      await expect(createRow).toBeVisible()

      // Select the Create row by click
      await createRow.click()
      await expect(catInput).toHaveValue('brand-new')
      await expect(dropdown).not.toBeVisible()
    }),
  )
})
