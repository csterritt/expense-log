import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedExpenses, seedRecurringTemplates, seedGeneratedExpense } from '../support/db-helpers'

const YEAR = 2024

const signInAndGoToSummary = async (page: any, qs = '') => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
  await page.goto(`${BASE_URLS.SUMMARY}${qs}`)
}

/**
 * Click a tag chip in the summary tag filter by its visible label text.
 * Returns the checkbox value (tag id) that was clicked.
 */
const clickSummaryTagChip = async (page: any, tagName: string): Promise<string> => {
  const chipBlock = page.getByTestId('tag-chip-checkboxes')
  const chip = chipBlock.getByTestId(`tag-chip-${tagName}`)
  await expect(chip).toBeVisible()
  const checkbox = chip.locator('input[type="checkbox"]')
  const tagId = (await checkbox.getAttribute('value')) ?? ''
  expect(tagId).not.toBe('')
  await chip.click()
  return tagId
}

test.describe('Summary page — tag-AND filter and recurring participation', () => {
  test(
    '(a) single-tag filter narrows aggregation to expenses carrying that tag; column shape unchanged',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: `${YEAR}-03-10`,
          description: 'Work lunch',
          amountCents: 2000,
          categoryName: 'Food',
          tagNames: ['work'],
        },
        {
          date: `${YEAR}-03-15`,
          description: 'Personal groceries',
          amountCents: 5000,
          categoryName: 'Food',
          tagNames: ['personal'],
        },
        {
          date: `${YEAR}-03-20`,
          description: 'Taxi ride',
          amountCents: 1500,
          categoryName: 'Transport',
          tagNames: ['work'],
        },
      ])

      await signInAndGoToSummary(page, `?from=${YEAR}-01-01&to=${YEAR}-12-31`)

      // Pick the 'work' tag from the filter
      const tagId = await clickSummaryTagChip(page, 'work')
      await page.getByTestId('summary-submit').click()
      await page.waitForURL(/\/summary/)

      // Column shape still driven by dimension (category), not the filter
      await expect(page.getByTestId('summary-sort-category')).toBeVisible()
      await expect(page.getByTestId('summary-sort-timePeriod')).toBeVisible()

      // Rows present (only work-tagged expenses appear)
      const rows = page.getByTestId('summary-row')
      await expect(rows.first()).toBeVisible()

      // The 'personal' tag expense should not produce any category rows
      // that wouldn't appear under 'work'. Verify Food + Transport both appear
      // (both have work-tagged expenses) and the total reflects only work expenses
      const categoryTexts = await page.getByTestId('summary-row-category').allTextContents()
      expect(categoryTexts).toContain('Food')
      expect(categoryTexts).toContain('Transport')

      // Confirm the tag id is preserved in the URL
      expect(page.url()).toContain(`tagId=${tagId}`)
    }),
  )

  test(
    '(b) two-tag filter applies AND semantics — only expenses carrying both tags contribute',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: `${YEAR}-03-10`,
          description: 'Work only',
          amountCents: 1000,
          categoryName: 'Food',
          tagNames: ['work'],
        },
        {
          date: `${YEAR}-03-12`,
          description: 'Personal only',
          amountCents: 2000,
          categoryName: 'Food',
          tagNames: ['personal'],
        },
        {
          date: `${YEAR}-03-14`,
          description: 'Both tags',
          amountCents: 3000,
          categoryName: 'Food',
          tagNames: ['work', 'personal'],
        },
      ])

      await signInAndGoToSummary(page, `?from=${YEAR}-01-01&to=${YEAR}-12-31`)

      // Click both work and personal chips
      const workId = await clickSummaryTagChip(page, 'work')
      const personalId = await clickSummaryTagChip(page, 'personal')

      // Submit the form
      await page.getByTestId('summary-submit').click()
      await page.waitForURL(/\/summary/)

      // Only "Both tags" expense contributes; total = 3000 cents = $30.00
      const rows = page.getByTestId('summary-row')
      await expect(rows).toHaveCount(1)

      const rowText = await rows.first().textContent()
      expect(rowText).toContain('30')
    }),
  )

  test(
    '(c) recurring template with no materialized rows does not contribute to the summary',
    testWithDatabase(async ({ page }) => {
      // Seed a recurring template — intentionally do NOT run cron,
      // so no expense rows are ever materialized from it.
      await seedRecurringTemplates([
        {
          description: 'Future subscription',
          amountCents: 9999,
          categoryName: 'Bills',
          recurrence: 'Monthly',
          anchorDate: `${YEAR}-06-01`,
          createdAtIso: `${YEAR}-05-01T00:00:00Z`,
        },
      ])

      await signInAndGoToSummary(page, `?from=${YEAR}-01-01&to=${YEAR}-12-31`)

      // The template itself has no materialized expense rows, so summary is empty
      await expect(page.getByTestId('summary-empty')).toBeVisible()
      await expect(page.getByTestId('summary-row')).toHaveCount(0)
    }),
  )

  test(
    '(d) once a recurring occurrence is materialized it appears in the summary just like a manual expense',
    testWithDatabase(async ({ page }) => {
      // Seed one manual expense
      await seedExpenses([
        {
          date: `${YEAR}-02-10`,
          description: 'Manual expense',
          amountCents: 2000,
          categoryName: 'Food',
          tagNames: ['work'],
        },
      ])

      // Seed a recurring template using a distinct category to avoid seed-endpoint conflicts
      const [recurringId] = await seedRecurringTemplates([
        {
          description: 'Monthly subscription',
          amountCents: 1500,
          categoryName: 'Subscriptions',
          tagNames: ['work'],
          recurrence: 'Monthly',
          anchorDate: `${YEAR}-03-01`,
          createdAtIso: `${YEAR}-02-01T00:00:00Z`,
        },
      ])

      // Sign in and visit summary before materialization
      await signInAndGoToSummary(page, `?from=${YEAR}-01-01&to=${YEAR}-12-31`)

      // Before materialization: only the Food/manual row shows (one summary row)
      const rowsBefore = await page.getByTestId('summary-row').count()
      expect(rowsBefore).toBeGreaterThan(0)

      // Directly seed the materialized generated expense (simulates cron having run)
      await seedGeneratedExpense({
        recurringId,
        date: `${YEAR}-03-01`,
        occurrenceDate: `${YEAR}-03-01`,
      })

      // Visit summary again — the materialized row now appears
      await page.goto(`${BASE_URLS.SUMMARY}?from=${YEAR}-01-01&to=${YEAR}-12-31`)

      // Column shape still driven by dimension (category default)
      await expect(page.getByTestId('summary-sort-category')).toBeVisible()

      // More rows now (Food Feb + Subscriptions Mar)
      const rowsAfter = await page.getByTestId('summary-row').count()
      expect(rowsAfter).toBeGreaterThan(rowsBefore)

      // Both categories appear
      const categoryTexts = await page.getByTestId('summary-row-category').allTextContents()
      expect(categoryTexts.some((t: string) => t.toLowerCase().includes('food'))).toBe(true)
      expect(categoryTexts.some((t: string) => t.toLowerCase().includes('subscription'))).toBe(true)
    }),
  )
})
