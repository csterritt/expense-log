import { expect, test } from '@playwright/test'

import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { TEST_USERS, BASE_URLS } from '../support/test-data'

test(
  'expense amount input has required attribute',
  testWithDatabase(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.EXPENSES)

    const amountInput = page.getByTestId('expense-amount-input')
    await expect(amountInput).toBeVisible()
    const required = await amountInput.getAttribute('required')
    expect(required).not.toBeNull()
  })
)

test(
  'expense date input has required attribute',
  testWithDatabase(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.EXPENSES)

    const dateInput = page.getByTestId('expense-date-input')
    await expect(dateInput).toBeVisible()
    const required = await dateInput.getAttribute('required')
    expect(required).not.toBeNull()
  })
)

test(
  'expense description input has required attribute',
  testWithDatabase(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.EXPENSES)

    const descInput = page.getByTestId('expense-description-input')
    await expect(descInput).toBeVisible()
    const required = await descInput.getAttribute('required')
    expect(required).not.toBeNull()
  })
)

test(
  'server rejects negative amount submitted directly',
  testWithDatabase(async ({ page }) => {
    await page.goto(BASE_URLS.SIGN_IN)
    await submitSignInForm(page, TEST_USERS.KNOWN_USER)

    await page.goto(BASE_URLS.EXPENSES)

    await page.evaluate(() => {
      const form = document.querySelector('form[action="/expenses"]') as HTMLFormElement
      if (form) {
        const amountInput = form.querySelector('[name="amount"]') as HTMLInputElement
        const dateInput = form.querySelector('[name="date"]') as HTMLInputElement
        const descInput = form.querySelector('[name="description"]') as HTMLInputElement
        if (amountInput) { amountInput.removeAttribute('required'); amountInput.removeAttribute('min'); amountInput.value = '-5' }
        if (dateInput) { dateInput.value = '2025-03-01' }
        if (descInput) { descInput.value = 'Test expense' }
        form.submit()
      }
    })

    await expect(page.getByRole('alert')).toContainText('Amount')
  })
)
