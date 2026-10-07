import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedCategories } from '../support/db-helpers'

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

const fillValidEntry = async (page: any, description: string) => {
  await page.getByTestId('expense-form-description').fill(description)
  await page.getByTestId('expense-form-amount').fill('12.34')
  await page.getByTestId('expense-form-date').fill(todayEt())
  await page.getByTestId('expense-form-category').fill('Food')
}

test.describe('Expense entry form — resilient submit retry and backoff', () => {
  test(
    'retries a transient 5xx response and then renders the normal success page',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)
      await fillValidEntry(page, 'Retry after failure')

      let interceptedPost = false
      let postCount = 0
      await page.route(BASE_URLS.EXPENSES, async (route: any) => {
        if (route.request().method() !== 'POST' || interceptedPost) {
          await route.continue()
          return
        }
        interceptedPost = true
        await route.fulfill({ status: 503, body: 'Temporary failure' })
      })
      page.on('request', (request: any) => {
        if (request.url() === BASE_URLS.EXPENSES && request.method() === 'POST') {
          postCount += 1
        }
      })

      await page.getByTestId('expense-form-create').click()

      await expect(page.getByTestId('expense-row-description').first()).toHaveText(
        'Retry after failure',
      )
      expect(postCount).toBe(2)
    }),
  )

  test(
    'renders a validation response immediately without retrying',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)
      await page.getByTestId('expense-form-amount').fill('12.34')
      await page.getByTestId('expense-form-date').fill(todayEt())
      await page.getByTestId('expense-form-category').fill('Food')

      let postCount = 0
      page.on('request', (request: any) => {
        if (request.url() === BASE_URLS.EXPENSES && request.method() === 'POST') {
          postCount += 1
        }
      })

      await page.getByTestId('expense-form-create').click()

      await expect(page.getByTestId('expense-form-description-error')).toBeVisible()
      expect(postCount).toBe(1)
    }),
  )
})
