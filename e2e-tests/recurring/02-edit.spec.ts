import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedRecurringTemplates } from '../support/db-helpers'

const RECURRING_URL = 'http://localhost:3000/recurring'

const signIn = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
}

test.use({ javaScriptEnabled: false })

test.describe('Recurring templates — edit', () => {
  test(
    'edit page pre-populates fields and simple save (no new items) updates the row',
    testWithDatabase(async ({ page }) => {
      const [id] = await seedRecurringTemplates([
        {
          description: 'Monthly rent',
          amountCents: 120000,
          categoryName: 'housing',
          tagNames: ['rent'],
          recurrence: 'Monthly',
          anchorDate: '2025-01-15',
        },
      ])
      await signIn(page)
      await page.goto(RECURRING_URL)

      await page.getByTestId('recurring-row-edit').click()
      await expect(page).toHaveURL(`http://localhost:3000/recurring/${id}/edit`)
      await expect(page.getByTestId('recurring-edit-page')).toBeVisible()

      // Pre-populated values
      await expect(page.getByTestId('recurring-form-description')).toHaveValue('Monthly rent')
      await expect(page.getByTestId('recurring-form-amount')).toHaveValue('1200.00')
      await expect(page.getByTestId('recurring-form-category')).toHaveValue('housing')
      await expect(page.getByTestId('recurring-form-tags')).toHaveValue('rent')
      await expect(page.getByTestId('recurring-form-recurrence')).toHaveValue('Monthly')
      await expect(page.getByTestId('recurring-form-anchor-date')).toHaveValue('2025-01-15')

      // Change amount and save
      await page.getByTestId('recurring-form-amount').fill('1500.00')
      await page.getByTestId('recurring-form-save').click()

      // Redirects to list with updated amount
      await expect(page).toHaveURL(RECURRING_URL)
      await expect(page.getByTestId('recurring-row-amount')).toContainText('1,500.00')
    }),
  )

  test(
    'adding a new tag routes through confirm-edit-new and updates the row',
    testWithDatabase(async ({ page }) => {
      const [id] = await seedRecurringTemplates([
        {
          description: 'Monthly rent',
          amountCents: 120000,
          categoryName: 'housing',
          tagNames: ['rent'],
          recurrence: 'Monthly',
          anchorDate: '2025-01-15',
        },
      ])
      await signIn(page)
      await page.goto(`http://localhost:3000/recurring/${id}/edit`)

      // Append a new tag
      await page.getByTestId('recurring-form-tags').fill('rent, newlytag')
      await page.getByTestId('recurring-form-save').click()

      // Should land on confirm-edit-new page
      await expect(page.getByTestId('confirm-recurring-edit-new-page')).toBeVisible()
      await expect(page.getByTestId('confirm-recurring-edit-new-tag-line')).toBeVisible()
      // No category line
      await expect(page.getByTestId('confirm-recurring-edit-new-category-line')).toHaveCount(0)

      await page.getByTestId('confirm-recurring-edit-new-confirm').click()
      await expect(page).toHaveURL(RECURRING_URL)
      await expect(page.getByTestId('recurring-row-tags')).toContainText('newlytag')
      await expect(page.getByTestId('recurring-row-tags')).toContainText('rent')
    }),
  )

  test(
    'cancel on confirm-edit-new page returns to edit page with typed values preserved',
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

      // Enter a new category and new tag to trigger confirmation
      await page.getByTestId('recurring-form-category').fill('freshcat')
      await page.getByTestId('recurring-form-tags').fill('freshtag')
      await page.getByTestId('recurring-form-save').click()

      await expect(page.getByTestId('confirm-recurring-edit-new-page')).toBeVisible()

      // Cancel — should return to edit page with values preserved
      await page.getByTestId('confirm-recurring-edit-new-cancel').click()
      await expect(page).toHaveURL(`http://localhost:3000/recurring/${id}/edit`)
      await expect(page.getByTestId('recurring-form-category')).toHaveValue('freshcat')
      await expect(page.getByTestId('recurring-form-tags')).toHaveValue('freshtag')

      // DB unchanged — template still in list with original category
      await page.goto(RECURRING_URL)
      await expect(page.getByTestId('recurring-row-category')).toContainText('housing')
    }),
  )
})
