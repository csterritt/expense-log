import { expect, test, type Route } from '@playwright/test'

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

test.describe('Expense entry form — no-JS fallback', () => {
  test.use({ javaScriptEnabled: false })

  test(
    'native checkboxes toggle and form submits correctly with JS disabled',
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

      const chipBlock = page.getByTestId('tag-chip-checkboxes')
      await expect(chipBlock).toBeVisible()

      const foodLabel = page.getByTestId('tag-chip-food')
      await foodLabel.click()
      const foodInput = foodLabel.locator('input[type="checkbox"]')
      await expect(foodInput).toBeChecked()

      await page.getByTestId('expense-form-description').fill('No-JS test')
      await page.getByTestId('expense-form-amount').fill('15.00')
      await page.getByTestId('expense-form-date').fill(todayEt())
      await page.getByTestId('expense-form-category').fill('food')
      await page.getByTestId('expense-form-create').click()

      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('confirm-create-new-page')).toHaveCount(0)

      const row = page.getByTestId('expense-row').filter({ hasText: 'No-JS test' })
      await expect(row).toHaveCount(1)
      const tagText = await row.getByTestId('expense-row-tags').textContent()
      expect(tagText).toContain('food')
      expect(tagText).not.toContain('gift')
    }),
  )

  test(
    'newTags text field submits as-is with JS disabled, reaches confirmation page',
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
      await newTagsInput.fill('brandnew')

      await page.getByTestId('expense-form-description').fill('No-JS new tag')
      await page.getByTestId('expense-form-amount').fill('7.00')
      await page.getByTestId('expense-form-date').fill(todayEt())
      await page.getByTestId('expense-form-category').fill('food')
      await page.getByTestId('expense-form-create').click()

      await expect(page.getByTestId('confirm-create-new-page')).toBeVisible()
      const tagLines = page.getByTestId('confirm-create-new-tag-line')
      await expect(tagLines).toHaveCount(1)
      await expect(tagLines.first()).toContainText('brandnew')

      await page.getByTestId('confirm-create-new-confirm').click()
      await page.waitForURL(BASE_URLS.EXPENSES)

      const row = page.getByTestId('expense-row').filter({ hasText: 'No-JS new tag' })
      await expect(row).toHaveCount(1)
      const tagText = await row.getByTestId('expense-row-tags').textContent()
      expect(tagText).toContain('brandnew')
    }),
  )

  test(
    'round-trip values are preserved on validation error with JS disabled',
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

      await page.getByTestId('tag-chip-food').click()

      await page.getByTestId('expense-form-description').fill('Round trip no-js')
      await page.getByTestId('expense-form-amount').fill('not-a-number')
      await page.getByTestId('expense-form-date').fill(todayEt())
      await page.getByTestId('expense-form-category').fill('food')
      await page.getByTestId('expense-form-create').click()

      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('expense-form-amount-error')).toBeVisible()
      await expect(page.getByTestId('expense-form-description')).toHaveValue('Round trip no-js')
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('not-a-number')

      const foodInput = page
        .getByTestId('tag-chip-food')
        .locator('input[type="checkbox"]')
      await expect(foodInput).toBeChecked()
    }),
  )
})

test.describe('Expense entry form — broken-JS fallback', () => {
  test(
    'a throwing tag-chip-checkboxes.js does not block native checkbox toggling or form submission',
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

      await page.route('**/js/tag-chip-checkboxes.js', (route: Route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: 'throw new Error("injected error");',
        })
      })

      await signInAndGoToExpenses(page)

      const chipBlock = page.getByTestId('tag-chip-checkboxes')
      await expect(chipBlock).toBeVisible()

      const foodLabel = page.getByTestId('tag-chip-food')
      await foodLabel.click()
      const foodInput = foodLabel.locator('input[type="checkbox"]')
      await expect(foodInput).toBeChecked()

      await page.getByTestId('expense-form-description').fill('Broken JS test')
      await page.getByTestId('expense-form-amount').fill('20.00')
      await page.getByTestId('expense-form-date').fill(todayEt())
      await page.getByTestId('expense-form-category').fill('food')
      await page.getByTestId('expense-form-create').click()

      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('confirm-create-new-page')).toHaveCount(0)

      const row = page.getByTestId('expense-row').filter({ hasText: 'Broken JS test' })
      await expect(row).toHaveCount(1)
      const tagText = await row.getByTestId('expense-row-tags').textContent()
      expect(tagText).toContain('food')
    }),
  )
})
