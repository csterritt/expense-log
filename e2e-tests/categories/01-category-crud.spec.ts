import { expect, test } from '@playwright/test'

import { clickLink, fillInput, isElementVisible } from '../support/finders'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { clearExpenses, seedExpenses } from '../support/db-helpers'
import { TEST_USERS, BASE_URLS } from '../support/test-data'

const testWithExpenses = (
  testFn: ({ page, request }: { page: any; request: any }) => Promise<void>,
) => {
  return testWithDatabase(async ({ page, request }) => {
    await seedExpenses()
    await testFn({ page, request })
    await clearExpenses()
  })
}

test(
  'can view categories page when signed in',
  testWithDatabase(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.CATEGORIES)
    expect(page.url()).toContain('/categories')
    expect(await isElementVisible(page, 'categories-page')).toBe(true)
  }),
)

test('redirects to sign-in when accessing categories without auth', async ({ page }) => {
  await page.goto(BASE_URLS.CATEGORIES)
  expect(page.url()).toContain('/auth/sign-in')
})

test(
  'categories page shows existing categories',
  testWithExpenses(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.CATEGORIES)
    await expect(page.getByTestId('edit-category-name-cat-food-001')).toHaveValue('Food')
    await expect(page.getByTestId('edit-category-name-cat-transport-001')).toHaveValue('Transport')
  }),
)

test(
  'can rename a category',
  testWithExpenses(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.CATEGORIES)

    await fillInput(page, 'edit-category-name-cat-food-001', 'Dining')
    await clickLink(page, 'update-category-cat-food-001')

    await expect(page.getByRole('alert')).toHaveText('Category updated successfully.')
    await expect(page.getByTestId('edit-category-name-cat-food-001')).toHaveValue('Dining')
  }),
)

test(
  'can delete a category not in use',
  testWithExpenses(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.CATEGORIES)

    await clickLink(page, 'delete-category-cat-transport-001')

    await expect(page.getByRole('alert')).toHaveText('Category deleted successfully.')
    await expect(page.getByTestId('category-row-cat-transport-001')).not.toBeVisible()
  }),
)
