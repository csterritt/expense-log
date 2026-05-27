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

test.describe('Expense entry form — tamper and validation-error preservation', () => {
  test(
    'cancelling confirmation preserves chip selections and new-tags text',
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

      await page.getByTestId('tag-chip-food').click()

      const newTagsInput = page.getByTestId('new-tags-input')
      await newTagsInput.fill('mynewtag')

      await page.getByTestId('expense-form-description').fill('Cancel test')
      await page.getByTestId('expense-form-amount').fill('12.00')
      await page.getByTestId('expense-form-date').fill(todayEt())
      await page.getByTestId('expense-form-category').fill('food')
      await page.getByTestId('expense-form-create').click()

      await expect(page.getByTestId('confirm-create-new-page')).toBeVisible()
      await page.getByTestId('confirm-create-new-cancel').click()

      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('expense-form')).toBeVisible()

      await expect(page.getByTestId('expense-form-description')).toHaveValue('Cancel test')
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('12.00')
      await expect(page.getByTestId('expense-form-date')).toHaveValue(todayEt())
      await expect(page.getByTestId('expense-form-category')).toHaveValue('food')

      const foodInput = page
        .getByTestId('tag-chip-food')
        .locator('input[type="checkbox"]')
      await expect(foodInput).toBeChecked()

      const giftInput = page
        .getByTestId('tag-chip-gift')
        .locator('input[type="checkbox"]')
      await expect(giftInput).not.toBeChecked()

      const restoredNewTags = page.getByTestId('new-tags-input')
      await expect(restoredNewTags).toHaveValue('mynewtag')
    }),
  )

  test(
    'submitting a non-ULID tagId in the form body shows a recoverable error with values preserved',
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

      await page.getByTestId('expense-form-description').fill('Tamper test')
      await page.getByTestId('expense-form-amount').fill('8.00')
      await page.getByTestId('expense-form-date').fill(todayEt())
      await page.getByTestId('expense-form-category').fill('food')

      await page.evaluate(() => {
        const form = document.querySelector('[data-testid="expense-form"]') as HTMLFormElement
        const hidden = document.createElement('input')
        hidden.type = 'hidden'
        hidden.name = 'tagId'
        hidden.value = 'not-a-valid-ulid'
        form.appendChild(hidden)
      })

      await page.getByTestId('expense-form-create').click()

      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('expense-form')).toBeVisible()

      await expect(page.getByTestId('expense-form-description')).toHaveValue('Tamper test')
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('8.00')
      await expect(page.getByTestId('expense-form-date')).toHaveValue(todayEt())
      await expect(page.getByTestId('expense-form-category')).toHaveValue('food')
    }),
  )

  test(
    'submitting an unknown but syntactically valid tagId shows a recoverable global error',
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

      await page.getByTestId('expense-form-description').fill('Unknown tag test')
      await page.getByTestId('expense-form-amount').fill('9.00')
      await page.getByTestId('expense-form-date').fill(todayEt())
      await page.getByTestId('expense-form-category').fill('food')

      await page.evaluate(() => {
        const form = document.querySelector('[data-testid="expense-form"]') as HTMLFormElement
        const hidden = document.createElement('input')
        hidden.type = 'hidden'
        hidden.name = 'tagId'
        hidden.value = '01HWXYZABCDEFGHJKMNPQRSTVW'
        form.appendChild(hidden)
      })

      await page.getByTestId('expense-form-create').click()

      await page.waitForURL(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('expense-form')).toBeVisible()

      await expect(page.getByTestId('expense-form-description')).toHaveValue('Unknown tag test')
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('9.00')
      await expect(page.getByTestId('expense-form-date')).toHaveValue(todayEt())
      await expect(page.getByTestId('expense-form-category')).toHaveValue('food')
    }),
  )
})
