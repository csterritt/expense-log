import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedRecurringTemplates } from '../support/db-helpers'

const RECURRING_NEW_URL = 'http://localhost:3000/recurring/new'
const RECURRING_URL = 'http://localhost:3000/recurring'

// Matches descriptionMax in src/lib/expense-validators.ts (202 in test mode)
const descriptionMax = 202

const signIn = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
}

const VALID_FORM = {
  description: 'Valid description',
  amount: '100.00',
  anchorDate: '2025-06-15',
  recurrence: 'Monthly',
  category: 'somecat',
  tags: '',
}

const fillForm = async (
  page: any,
  opts: {
    description?: string
    amount?: string
    anchorDate?: string
    recurrence?: string
    category?: string
    tags?: string
  },
) => {
  const merged = { ...VALID_FORM, ...opts }
  await page.getByTestId('recurring-form-description').fill(merged.description)
  await page.getByTestId('recurring-form-amount').fill(merged.amount)
  await page.getByTestId('recurring-form-category').fill(merged.category)
  await page.getByTestId('recurring-form-tags').fill(merged.tags)
  await page.getByTestId('recurring-form-anchor-date').fill(merged.anchorDate)
  if (merged.recurrence) {
    await page.getByTestId('recurring-form-recurrence').selectOption(merged.recurrence)
  }
}

test.use({ javaScriptEnabled: false })

test.describe('Recurring templates — validation errors on create', () => {
  test(
    'description over limit → error shown, no row created',
    testWithDatabase(async ({ page }) => {
      await signIn(page)
      await page.goto(RECURRING_NEW_URL)
      await fillForm(page, { description: 'a'.repeat(descriptionMax + 1) })
      await page.getByTestId('recurring-form-create').click()

      await expect(page).toHaveURL(RECURRING_NEW_URL)
      await expect(page.getByTestId('recurring-form-description-error')).toBeVisible()

      // No row created
      await page.goto(RECURRING_URL)
      await expect(page.getByTestId('recurring-row')).toHaveCount(0)
    }),
  )

  test(
    'amount zero → error shown',
    testWithDatabase(async ({ page }) => {
      await signIn(page)
      await page.goto(RECURRING_NEW_URL)
      await fillForm(page, { amount: '0' })
      await page.getByTestId('recurring-form-create').click()

      await expect(page).toHaveURL(RECURRING_NEW_URL)
      await expect(page.getByTestId('recurring-form-amount-error')).toBeVisible()
    }),
  )

  test(
    'amount with three decimal places → error shown',
    testWithDatabase(async ({ page }) => {
      await signIn(page)
      await page.goto(RECURRING_NEW_URL)
      await fillForm(page, { amount: '1.234' })
      await page.getByTestId('recurring-form-create').click()

      await expect(page).toHaveURL(RECURRING_NEW_URL)
      await expect(page.getByTestId('recurring-form-amount-error')).toBeVisible()
    }),
  )

  test(
    'impossible anchor date 2025-02-30 → error shown',
    testWithDatabase(async ({ page }) => {
      await signIn(page)
      await page.goto(RECURRING_NEW_URL)
      await fillForm(page, { anchorDate: '2025-02-30' })
      await page.getByTestId('recurring-form-create').click()

      await expect(page).toHaveURL(RECURRING_NEW_URL)
      await expect(page.getByTestId('recurring-form-anchorDate-error')).toBeVisible()
    }),
  )

  test(
    'typed values are preserved after validation failure',
    testWithDatabase(async ({ page }) => {
      await signIn(page)
      await page.goto(RECURRING_NEW_URL)
      await fillForm(page, { description: 'Keep me', amount: '0', category: 'keepcat', anchorDate: '2025-03-10' })
      await page.getByTestId('recurring-form-create').click()

      await expect(page).toHaveURL(RECURRING_NEW_URL)
      await expect(page.getByTestId('recurring-form-description')).toHaveValue('Keep me')
      await expect(page.getByTestId('recurring-form-category')).toHaveValue('keepcat')
      await expect(page.getByTestId('recurring-form-anchor-date')).toHaveValue('2025-03-10')
    }),
  )
})

test.describe('Recurring templates — validation errors on edit', () => {
  test(
    'amount zero on edit form → error shown, row not mutated',
    testWithDatabase(async ({ page }) => {
      const [id] = await seedRecurringTemplates([
        {
          description: 'Monthly rent',
          amountCents: 120000,
          categoryName: 'housing',
          tagNames: [],
          recurrence: 'Monthly',
          anchorDate: '2025-01-15',
        },
      ])
      await signIn(page)
      await page.goto(`http://localhost:3000/recurring/${id}/edit`)
      await page.getByTestId('recurring-form-amount').fill('0')
      await page.getByTestId('recurring-form-save').click()

      await expect(page).toHaveURL(`http://localhost:3000/recurring/${id}/edit`)
      await expect(page.getByTestId('recurring-form-amount-error')).toBeVisible()

      // Amount still unchanged in list
      await page.goto(RECURRING_URL)
      await expect(page.getByTestId('recurring-row-amount')).toContainText('1,200.00')
    }),
  )

  test(
    'description over limit on edit form → error shown, row not mutated',
    testWithDatabase(async ({ page }) => {
      const [id] = await seedRecurringTemplates([
        {
          description: 'Monthly rent',
          amountCents: 120000,
          categoryName: 'housing',
          tagNames: [],
          recurrence: 'Monthly',
          anchorDate: '2025-01-15',
        },
      ])
      await signIn(page)
      await page.goto(`http://localhost:3000/recurring/${id}/edit`)
      await page.getByTestId('recurring-form-description').fill('a'.repeat(descriptionMax + 1))
      await page.getByTestId('recurring-form-save').click()

      await expect(page).toHaveURL(`http://localhost:3000/recurring/${id}/edit`)
      await expect(page.getByTestId('recurring-form-description-error')).toBeVisible()

      // Description still unchanged
      await page.goto(RECURRING_URL)
      await expect(page.getByTestId('recurring-row-description')).toContainText('Monthly rent')
    }),
  )
})
