import { expect, test } from '@playwright/test'

import { clickLink, fillInput, isElementVisible } from '../support/finders'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { clearExpenses, seedExpenses } from '../support/db-helpers'
import { TEST_USERS, BASE_URLS } from '../support/test-data'

const testWithExpenses = (
  testFn: ({ page, request }: { page: any; request: any }) => Promise<void>
) => {
  return testWithDatabase(async ({ page, request }) => {
    await seedExpenses()
    await testFn({ page, request })
    await clearExpenses()
  })
}

test(
  'can view tags page when signed in',
  testWithDatabase(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.TAGS)
    expect(page.url()).toContain('/tags')
    expect(await isElementVisible(page, 'tags-page')).toBe(true)
  })
)

test('redirects to sign-in when accessing tags without auth', async ({ page }) => {
  await page.goto(BASE_URLS.TAGS)
  expect(page.url()).toContain('/auth/sign-in')
})

test(
  'tags page shows existing tags',
  testWithExpenses(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.TAGS)
    await expect(page.getByTestId('edit-tag-name-tag-work-001')).toHaveValue('work')
    await expect(page.getByTestId('edit-tag-name-tag-personal-001')).toHaveValue('personal')
  })
)

test(
  'can rename a tag',
  testWithExpenses(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.TAGS)

    await fillInput(page, 'edit-tag-name-tag-work-001', 'office')
    await clickLink(page, 'update-tag-tag-work-001')

    await expect(page.getByRole('alert')).toHaveText('Tag updated successfully.')
    await expect(page.getByTestId('edit-tag-name-tag-work-001')).toHaveValue('office')
  })
)

test(
  'can delete a tag',
  testWithExpenses(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.TAGS)

    await clickLink(page, 'delete-tag-tag-personal-001')

    await expect(page.getByRole('alert')).toHaveText('Tag deleted successfully.')
    await expect(page.getByTestId('tag-row-tag-personal-001')).not.toBeVisible()
  })
)
