import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'

const signInAndGoToSummary = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
  await page.goto(BASE_URLS.SUMMARY)
}

test.describe('Summary page', () => {
  test(
    'renders date-range controls',
    testWithDatabase(async ({ page }) => {
      await signInAndGoToSummary(page)

      await expect(page.getByTestId('summary-page')).toBeVisible()
      await expect(page.getByTestId('summary-from')).toBeVisible()
      await expect(page.getByTestId('summary-to')).toBeVisible()
    }),
  )
})
