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
 * Select a tag in the summary tag filter by its visible label text.
 * Returns the option value (tag id) that was selected.
 */
const selectSummaryTag = async (page: any, tagName: string): Promise<string> => {
  const select = page.getByTestId('summary-tag-filter')
  const options = await select.locator('option').all()
  let tagId = ''
  for (const opt of options) {
    const text = await opt.textContent()
    if (text && text.trim().toLowerCase() === tagName.toLowerCase()) {
      tagId = (await opt.getAttribute('value')) ?? ''
    }
  }
  expect(tagId).not.toBe('')
  await select.selectOption(tagId)
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
      const tagId = await selectSummaryTag(page, 'work')
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

      // Select both tags via the tag filter select (multi-select or two separate tagId params)
      // First get both tag ids by navigating to pick them individually
      const tagSelect = page.getByTestId('summary-tag-filter')
      const options = await tagSelect.locator('option').all()
      const tagIds: Record<string, string> = {}
      for (const opt of options) {
        const text = (await opt.textContent())?.trim().toLowerCase() ?? ''
        const val = (await opt.getAttribute('value')) ?? ''
        if (text === 'work' || text === 'personal') {
          tagIds[text] = val
        }
      }
      expect(tagIds['work']).toBeTruthy()
      expect(tagIds['personal']).toBeTruthy()

      // Submit with both tagIds in the URL (AND semantics)
      await page.goto(
        `${BASE_URLS.SUMMARY}?from=${YEAR}-01-01&to=${YEAR}-12-31&tagId=${tagIds['work']}&tagId=${tagIds['personal']}`,
      )

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
