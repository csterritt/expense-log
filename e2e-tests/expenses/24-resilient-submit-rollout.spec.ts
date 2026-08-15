import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import {
  seedCategories,
  seedExpenses,
  seedRecurringTemplates,
  seedTags,
} from '../support/db-helpers'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'

const categoriesUrl = 'http://localhost:3000/categories'
const tagsUrl = 'http://localhost:3000/tags'
const recurringUrl = 'http://localhost:3000/recurring'

const todayEt = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

const signIn = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
}

const expectEnhanced = async (form: any, target: string) => {
  await expect(form).toHaveAttribute('data-resilient-submit')
  await expect(form).toHaveAttribute('data-resilient-submit-target', new URL(target).pathname)
  await expect(form.locator('input[name="submissionKey"]')).toHaveValue(/^[0-9A-HJKMNP-TV-Z]{26}$/i)
}

test.describe('Resilient-submit rollout', () => {
  test(
    'enhances every remaining expense, category, tag, and recurring mutation form',
    testWithDatabase(async ({ page }) => {
      const [recurringId] = await seedRecurringTemplates([
        {
          description: 'Rent',
          amountCents: 120000,
          categoryName: 'housing',
          recurrence: 'Monthly',
          anchorDate: '2025-01-15',
        },
      ])
      await seedExpenses([
        {
          date: todayEt(),
          description: 'Lunch',
          amountCents: 1234,
          categoryName: 'food',
        },
      ])
      await seedCategories([{ name: 'utilities' }])
      await seedTags([{ name: 'travel' }])
      await signIn(page)

      await page.goto(BASE_URLS.EXPENSES)
      await page.getByTestId('expense-row-edit').first().click()
      await expectEnhanced(page.getByTestId('expense-form'), BASE_URLS.EXPENSES)
      await page.getByTestId('expense-edit-delete').click()
      await expectEnhanced(page.getByTestId('confirm-delete-expense-form'), BASE_URLS.EXPENSES)

      await page.goto(categoriesUrl)
      await expectEnhanced(
        page.getByTestId('categories-page').locator('form').first(),
        categoriesUrl,
      )
      await expectEnhanced(
        page.getByTestId('category-row').first().locator('form').first(),
        categoriesUrl,
      )
      await expectEnhanced(
        page.getByTestId('category-row').first().locator('form').last(),
        categoriesUrl,
      )

      await page.goto(tagsUrl)
      await expectEnhanced(page.getByTestId('tags-page').locator('form').first(), tagsUrl)
      await expectEnhanced(page.getByTestId('tag-row').first().locator('form').first(), tagsUrl)
      await expectEnhanced(page.getByTestId('tag-row').first().locator('form').last(), tagsUrl)

      await page.goto(`${recurringUrl}/new`)
      await expectEnhanced(page.getByTestId('recurring-form'), recurringUrl)
      await page.goto(`${recurringUrl}/${recurringId}/edit`)
      await expectEnhanced(page.getByTestId('recurring-form'), recurringUrl)
      await page.getByTestId('recurring-edit-delete').click()
      await expectEnhanced(
        page.getByTestId('confirm-delete-recurring-page').locator('form'),
        recurringUrl,
      )
    }),
  )

  test(
    'does not enhance authentication forms',
    testWithDatabase(async ({ page }) => {
      for (const url of [BASE_URLS.SIGN_IN, BASE_URLS.SIGN_UP, BASE_URLS.FORGOT_PASSWORD]) {
        await page.goto(url)
        await expect(page.locator('form[data-resilient-submit]')).toHaveCount(0)
      }
    }),
  )
})
