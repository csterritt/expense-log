import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedRecurringTemplates, seedGeneratedExpense } from '../support/db-helpers'

const RECURRING_URL = 'http://localhost:3000/recurring'
const EXPENSES_URL = 'http://localhost:3000/expenses'

const oneMonthAgoEt = (): string => {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

const signIn = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
}

test.use({ javaScriptEnabled: false })

test.describe('Recurring templates — delete', () => {
  test(
    'cancel on delete page returns to edit and template is still listed',
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
      await page.getByTestId('recurring-edit-delete').click()

      await expect(page.getByTestId('confirm-delete-recurring-page')).toBeVisible()
      await expect(page.getByTestId('confirm-delete-recurring-description')).toContainText('Monthly rent')
      await expect(page.getByTestId('confirm-delete-recurring-recurrence')).toContainText('Monthly')

      // Cancel
      await page.getByTestId('confirm-delete-recurring-cancel').click()
      await expect(page).toHaveURL(`http://localhost:3000/recurring/${id}/edit`)

      // Template still in list
      await page.goto(RECURRING_URL)
      await expect(page.getByTestId('recurring-row')).toHaveCount(1)
    }),
  )

  test(
    'confirm delete removes template but preserves past generated expense',
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

      const pastDate = oneMonthAgoEt()
      await seedGeneratedExpense({
        recurringId: id,
        date: pastDate,
        occurrenceDate: pastDate,
      })

      await signIn(page)

      // Verify the generated expense is visible on /expenses
      await page.goto(EXPENSES_URL)
      const expenseRows = page.getByTestId('expense-row')
      await expect(expenseRows).toHaveCount(1)
      await expect(page.getByTestId('expense-row-description').first()).toContainText('Monthly rent')

      // Delete the template
      await page.goto(`http://localhost:3000/recurring/${id}/edit`)
      await page.getByTestId('recurring-edit-delete').click()
      await expect(page.getByTestId('confirm-delete-recurring-page')).toBeVisible()
      await page.getByTestId('confirm-delete-recurring-confirm').click()

      // Redirected to list — template is gone
      await expect(page).toHaveURL(RECURRING_URL)
      await expect(page.getByTestId('recurring-row')).toHaveCount(0)

      // Past generated expense still visible on /expenses
      await page.goto(EXPENSES_URL)
      await expect(page.getByTestId('expense-row')).toHaveCount(1)
      await expect(page.getByTestId('expense-row-description').first()).toContainText('Monthly rent')
    }),
  )
})
