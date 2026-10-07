import { expect, test } from '@playwright/test'

import { seedCategories } from '../support/db-helpers'
import { submitSignInForm } from '../support/form-helpers'
import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { testWithDatabase } from '../support/test-helpers'

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

test.describe('Expense entry form — host error retry', () => {
  test(
    'retries a host failure and then renders the normal success page',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)
      await fillValidEntry(page, 'Retry after host error page')

      let serveErrorPage = true
      let postCount = 0
      await page.route('**/*', async (route: any) => {
        const request = route.request()
        if (request.method() === 'POST' && request.url() === BASE_URLS.EXPENSES) {
          postCount += 1
          if (serveErrorPage) {
            serveErrorPage = false
            await route.fulfill({ status: 503, body: 'Host error page' })
            return
          }
        }
        await route.continue()
      })

      await page.getByTestId('expense-form-create').click()

      await expect(page.getByTestId('expense-row-description').first()).toHaveText(
        'Retry after host error page',
      )
      expect(postCount).toBe(2)
    }),
  )
})
