import { expect, test } from '@playwright/test'

import { clickLink, fillInput, isElementVisible } from '../support/finders'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { TEST_USERS, BASE_URLS } from '../support/test-data'

test(
  'can view recurring expenses page when signed in',
  testWithDatabase(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.RECURRING)
    expect(page.url()).toContain('/recurring')
    expect(await isElementVisible(page, 'recurring-page')).toBe(true)
  })
)

test('redirects to sign-in when accessing recurring without auth', async ({ page }) => {
  await page.goto(BASE_URLS.RECURRING)
  expect(page.url()).toContain('/auth/sign-in')
})

test(
  'can create a recurring expense',
  testWithDatabase(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.RECURRING)

    await fillInput(page, 'recurring-amount-input', '50.00')
    await fillInput(page, 'recurring-description-input', 'Monthly gym membership')
    await page.getByTestId('recurring-period-select').selectOption('monthly')
    await fillInput(page, 'recurring-next-run-input', '2025-04-01')
    await clickLink(page, 'create-recurring-action')

    await expect(page.getByRole('alert')).toHaveText('Recurring expense created successfully.')
    await expect(page.getByTestId('recurring-page')).toContainText('Monthly gym membership')
  })
)

test(
  'can edit a recurring expense',
  testWithDatabase(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.RECURRING)

    await fillInput(page, 'recurring-amount-input', '20.00')
    await fillInput(page, 'recurring-description-input', 'Weekly coffee')
    await page.getByTestId('recurring-period-select').selectOption('weekly')
    await fillInput(page, 'recurring-next-run-input', '2025-04-07')
    await clickLink(page, 'create-recurring-action')

    await expect(page.getByRole('alert')).toHaveText('Recurring expense created successfully.')

    const editLinks = page.getByTestId(/^edit-recurring-/)
    await editLinks.first().click()

    expect(page.url()).toContain('/recurring/')
    expect(page.url()).toContain('/edit')
    expect(await isElementVisible(page, 'edit-recurring-page')).toBe(true)

    await fillInput(page, 'recurring-description-input', 'Weekly tea')
    await clickLink(page, 'update-recurring-action')

    await expect(page.getByRole('alert')).toHaveText('Recurring expense updated successfully.')
    await expect(page.getByTestId('recurring-page')).toContainText('Weekly tea')
    await expect(page.getByTestId('recurring-page')).not.toContainText('Weekly coffee')
  })
)

test(
  'can delete a recurring expense',
  testWithDatabase(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.RECURRING)

    await fillInput(page, 'recurring-amount-input', '15.00')
    await fillInput(page, 'recurring-description-input', 'Daily newspaper')
    await page.getByTestId('recurring-period-select').selectOption('daily')
    await fillInput(page, 'recurring-next-run-input', '2025-04-01')
    await clickLink(page, 'create-recurring-action')

    await expect(page.getByRole('alert')).toHaveText('Recurring expense created successfully.')

    const deleteButtons = page.getByTestId(/^delete-recurring-/)
    await deleteButtons.first().click()

    await expect(page.getByRole('alert')).toHaveText('Recurring expense deleted successfully.')
    await expect(page.getByTestId('recurring-page')).not.toContainText('Daily newspaper')
  })
)
