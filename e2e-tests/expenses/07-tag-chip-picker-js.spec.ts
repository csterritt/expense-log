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

test.describe('Tag chip-checkbox (JS-on)', () => {
  test(
    'toggle chip to select existing tag + type new tag, submit routes through confirmation',
    testWithDatabase(async ({ page }) => {
      // Seed an existing category and an existing tag named `groceries`.
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['groceries'],
        },
      ])

      await signInAndGoToExpenses(page)

      // Click the groceries chip to select it.
      await page.getByTestId('tag-chip-groceries').click()
      const groceriesInput = page.getByTestId('tag-chip-groceries').locator('input[type="checkbox"]')
      await expect(groceriesInput).toBeChecked()

      // Type a new tag name in the free-text field.
      await page.getByTestId('new-tags-input').fill('food')

      // Submit — should hit the confirmation page for the new `food` tag.
      await page.getByTestId('expense-form-description').fill('Snack run')
      await page.getByTestId('expense-form-amount').fill('5.00')
      await page.getByTestId('expense-form-date').fill(todayEt())
      await page.getByTestId('expense-form-category').fill('food')

      await page.getByTestId('expense-form-create').click()

      await expect(page.getByTestId('confirm-create-new-page')).toBeVisible()
      const tagLines = page.getByTestId('confirm-create-new-tag-line')
      await expect(tagLines).toHaveCount(1)
      await expect(tagLines.first()).toContainText("'food'")

      await page.getByTestId('confirm-create-new-confirm').click()
      await page.waitForURL(BASE_URLS.EXPENSES)

      const row = page.getByTestId('expense-row').filter({ hasText: 'Snack run' })
      await expect(row).toHaveCount(1)
      await expect(row.getByTestId('expense-row-tags')).toHaveText('food, groceries')
    }),
  )

  test(
    'chip selections are preserved after a validation-error round-trip',
    testWithDatabase(async ({ page }) => {
      // Seed `food` category and two tags so chips are available.
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['groceries', 'rent'],
        },
      ])

      await signInAndGoToExpenses(page)

      // Select both chips and submit with an invalid amount.
      await page.getByTestId('tag-chip-groceries').click()
      await page.getByTestId('tag-chip-rent').click()

      await page.getByTestId('expense-form-description').fill('Round trip')
      await page.getByTestId('expense-form-amount').fill('not-a-number')
      await page.getByTestId('expense-form-date').fill(todayEt())
      await page.getByTestId('expense-form-category').fill('food')
      await page.getByTestId('expense-form-create').click()

      // After the validation-error redirect both chips should still be checked.
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('not-a-number')
      const groceriesInput = page.getByTestId('tag-chip-groceries').locator('input[type="checkbox"]')
      const rentInput = page.getByTestId('tag-chip-rent').locator('input[type="checkbox"]')
      await expect(groceriesInput).toBeChecked()
      await expect(rentInput).toBeChecked()
    }),
  )
})
