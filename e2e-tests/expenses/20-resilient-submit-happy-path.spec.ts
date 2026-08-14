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

const fillEntryForm = async (page: any, description: string, category: string) => {
  await page.getByTestId('expense-form-description').fill(description)
  await page.getByTestId('expense-form-amount').fill('12.34')
  await page.getByTestId('expense-form-date').fill(todayEt())
  await page.getByTestId('expense-form-category').fill(category)
}

const navigationCount = async (page: any): Promise<number> =>
  page.evaluate(() => performance.getEntriesByType('navigation').length)

test.describe('Expense entry form — resilient submit happy path', () => {
  test(
    'submits via fetch, swaps the success page in place, and prevents duplicate submissions',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)
      await fillEntryForm(page, 'Fetch success', 'Food')

      const beforeNavigationCount = await navigationCount(page)
      let postCount = 0
      page.on('request', (request: any) => {
        if (request.url() === `${BASE_URLS.EXPENSES}` && request.method() === 'POST') {
          postCount++
        }
      })

      await page.getByTestId('expense-form-create').evaluate((button: HTMLButtonElement) => {
        button.click()
        button.click()
      })

      await expect(page.getByTestId('expense-row-description').first()).toHaveText('Fetch success')
      await expect(page.getByTestId('expense-form-create')).toBeEnabled()
      expect(postCount).toBe(1)
      expect(await navigationCount(page)).toBe(beforeNavigationCount)
    }),
  )

  test(
    'swaps confirmation in place and enhances its confirm action',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)
      await fillEntryForm(page, 'Confirm via fetch', 'Food')
      await page.getByTestId('new-tags-input').fill('lunch')

      const beforeNavigationCount = await navigationCount(page)
      await page.getByTestId('expense-form-create').click()

      await expect(page.getByTestId('confirm-create-new-page')).toBeVisible()
      expect(await navigationCount(page)).toBe(beforeNavigationCount)

      await page.getByTestId('confirm-create-new-confirm').click()
      await expect(page.getByTestId('expense-row-description').first()).toHaveText(
        'Confirm via fetch',
      )
      expect(await navigationCount(page)).toBe(beforeNavigationCount)
    }),
  )

  test(
    'uses the native POST path when JavaScript is disabled',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      const browser = page.context().browser()
      if (!browser) {
        throw new Error('Playwright browser is unavailable')
      }
      const context = await browser.newContext({ javaScriptEnabled: false })
      const jsOffPage = await context.newPage()
      try {
        await signInAndGoToExpenses(jsOffPage)
        await fillEntryForm(jsOffPage, 'Native success', 'Food')
        let nativePost = false
        jsOffPage.on('request', (request: any) => {
          if (
            request.url() === BASE_URLS.EXPENSES &&
            request.method() === 'POST' &&
            request.isNavigationRequest()
          ) {
            nativePost = true
          }
        })

        await jsOffPage.getByTestId('expense-form-create').click()

        await expect(jsOffPage.getByTestId('expense-row-description').first()).toHaveText(
          'Native success',
        )
        expect(nativePost).toBe(true)
      } finally {
        await context.close()
      }
    }),
  )
})
