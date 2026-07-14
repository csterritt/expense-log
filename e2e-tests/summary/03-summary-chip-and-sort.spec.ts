import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedExpenses } from '../support/db-helpers'

const signInAndGoToSummary = async (page: any, qs = '') => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
  await page.goto(`${BASE_URLS.SUMMARY}${qs}`)
}

test.describe('Summary page — chip-checkbox filter, chronological sort, malformed-query fallback', () => {
  test(
    'tag filter uses chip-checkbox block (no <select multiple>), preserves name=tagId, has no new-tag input',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2026-02-10',
          description: 'Lunch',
          amountCents: 2000,
          categoryName: 'Food',
          tagNames: ['work'],
        },
      ])

      await signInAndGoToSummary(page, '?from=2026-01-01&to=2026-12-31')

      // Must NOT render a <select multiple> for tags
      const multiSelect = page.locator('select[multiple][data-testid="summary-tag-filter"]')
      await expect(multiSelect).toHaveCount(0)

      // Must render the shared chip-checkbox block
      const chipBlock = page.getByTestId('tag-chip-checkboxes')
      await expect(chipBlock).toBeVisible()

      // Every chip input must have name=tagId
      const checkboxes = chipBlock.locator('input[type="checkbox"]')
      const count = await checkboxes.count()
      expect(count).toBeGreaterThan(0)
      for (let i = 0; i < count; i++) {
        await expect(checkboxes.nth(i)).toHaveAttribute('name', 'tagId')
      }

      // Must NOT render a new-tags input (allowNewTags=false)
      await expect(page.getByTestId('new-tags-input')).toHaveCount(0)
    }),
  )

  test(
    'AND semantics across two selected tags',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2026-03-10',
          description: 'Work only',
          amountCents: 1000,
          categoryName: 'Food',
          tagNames: ['work'],
        },
        {
          date: '2026-03-12',
          description: 'Personal only',
          amountCents: 2000,
          categoryName: 'Food',
          tagNames: ['personal'],
        },
        {
          date: '2026-03-14',
          description: 'Both tags',
          amountCents: 3000,
          categoryName: 'Food',
          tagNames: ['work', 'personal'],
        },
      ])

      await signInAndGoToSummary(page, '?from=2026-01-01&to=2026-12-31')

      // Click both work and personal chips
      const chipBlock = page.getByTestId('tag-chip-checkboxes')
      await chipBlock.getByTestId('tag-chip-work').click()
      await chipBlock.getByTestId('tag-chip-personal').click()

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
    'Month-granularity table shows Mmm YYYY labels in chronological order',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        { date: '2026-01-15', description: 'Jan expense', amountCents: 1000, categoryName: 'Food', tagNames: ['work'] },
        { date: '2026-02-15', description: 'Feb expense', amountCents: 2000, categoryName: 'Food', tagNames: ['work'] },
        { date: '2026-03-15', description: 'Mar expense', amountCents: 3000, categoryName: 'Food', tagNames: ['work'] },
        { date: '2026-04-15', description: 'Apr expense', amountCents: 4000, categoryName: 'Food', tagNames: ['work'] },
      ])

      await signInAndGoToSummary(page, '?from=2026-01-01&to=2026-12-31&granularity=month')

      const timePeriods = await page.getByTestId('summary-row-time-period').allTextContents()
      expect(timePeriods).toEqual(['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026'])
    }),
  )

  test(
    'Quarter-granularity table shows Mmm-Mmm YYYY labels in chronological order',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        { date: '2026-01-15', description: 'Q1 expense', amountCents: 1000, categoryName: 'Food', tagNames: ['work'] },
        { date: '2026-04-15', description: 'Q2 expense', amountCents: 2000, categoryName: 'Food', tagNames: ['work'] },
        { date: '2026-07-15', description: 'Q3 expense', amountCents: 3000, categoryName: 'Food', tagNames: ['work'] },
        { date: '2026-10-15', description: 'Q4 expense', amountCents: 4000, categoryName: 'Food', tagNames: ['work'] },
      ])

      await signInAndGoToSummary(page, '?from=2026-01-01&to=2026-12-31&granularity=quarter')

      const timePeriods = await page.getByTestId('summary-row-time-period').allTextContents()
      expect(timePeriods).toEqual(['Jan-Mar 2026', 'Apr-Jun 2026', 'Jul-Sep 2026', 'Oct-Dec 2026'])
    }),
  )

  test(
    'clicking time-period header toggles to descending chronological (not reverse-alphabetical)',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        { date: '2026-01-15', description: 'Jan expense', amountCents: 1000, categoryName: 'Food', tagNames: ['work'] },
        { date: '2026-02-15', description: 'Feb expense', amountCents: 2000, categoryName: 'Food', tagNames: ['work'] },
        { date: '2026-03-15', description: 'Mar expense', amountCents: 3000, categoryName: 'Food', tagNames: ['work'] },
      ])

      await signInAndGoToSummary(page, '?from=2026-01-01&to=2026-12-31&granularity=month')

      // Default: ascending chronological
      let timePeriods = await page.getByTestId('summary-row-time-period').allTextContents()
      expect(timePeriods).toEqual(['Jan 2026', 'Feb 2026', 'Mar 2026'])

      // Click time-period header to toggle to descending
      await page.getByTestId('summary-sort-timePeriod').click()
      await page.waitForURL(/sort=timePeriod/)

      timePeriods = await page.getByTestId('summary-row-time-period').allTextContents()
      expect(timePeriods).toEqual(['Mar 2026', 'Feb 2026', 'Jan 2026'])
    }),
  )

  test(
    'Dec 2025 and Jan 2026 produce two distinct rows with Dec 2025 first under default ascending',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        { date: '2025-12-15', description: 'Dec expense', amountCents: 1000, categoryName: 'Food', tagNames: ['work'] },
        { date: '2026-01-15', description: 'Jan expense', amountCents: 2000, categoryName: 'Food', tagNames: ['work'] },
      ])

      await signInAndGoToSummary(page, '?from=2025-01-01&to=2026-12-31&granularity=month')

      const timePeriods = await page.getByTestId('summary-row-time-period').allTextContents()
      expect(timePeriods).toEqual(['Dec 2025', 'Jan 2026'])
    }),
  )

  test(
    'malformed query params render with defaults and no 500',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        { date: '2026-02-10', description: 'seed', amountCents: 1000, categoryName: 'Food' },
      ])

      await signInAndGoToSummary(
        page,
        '?dimension=bogus&granularity=zzz&sort=foo&direction=sideways&tagId=does-not-exist&from=not-a-date&to=2026-02-31',
      )

      // Page renders (no 500)
      await expect(page.getByTestId('summary-page')).toBeVisible()

      // Controls fall back to defaults
      await expect(page.getByTestId('summary-dimension')).toHaveValue('category')
      await expect(page.getByTestId('summary-granularity')).toHaveValue('month')
    }),
  )

  test(
    'dimension=category with sort=tag falls back to default sort (dimension-aware allow-list)',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        { date: '2026-01-15', description: 'A', amountCents: 1000, categoryName: 'Food', tagNames: ['work'] },
        { date: '2026-02-15', description: 'B', amountCents: 2000, categoryName: 'Transport', tagNames: ['work'] },
      ])

      await signInAndGoToSummary(page, '?from=2026-01-01&to=2026-12-31&dimension=category&sort=tag:asc')

      // Page renders with defaults (category dimension, no sort applied)
      await expect(page.getByTestId('summary-page')).toBeVisible()
      await expect(page.getByTestId('summary-sort-category')).toBeVisible()
    }),
  )

  test(
    'untagged expenses contribute no rows under Tag or Category+Tag dimension',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2026-03-10',
          description: 'Has tag',
          amountCents: 1000,
          categoryName: 'Food',
          tagNames: ['work'],
        },
        {
          date: '2026-03-15',
          description: 'No tag',
          amountCents: 2000,
          categoryName: 'Food',
        },
      ])

      await signInAndGoToSummary(page, '?from=2026-01-01&to=2026-12-31&dimension=tag')

      // Only the tagged expense shows
      const tagRows = page.getByTestId('summary-row')
      await expect(tagRows).toHaveCount(1)
      const tagNames = await page.getByTestId('summary-row-tag').allTextContents()
      expect(tagNames).toContain('work')
    }),
  )

  test(
    'untagged expenses contribute no rows under Category+Tag dimension',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2026-03-10',
          description: 'Has tag',
          amountCents: 1000,
          categoryName: 'Food',
          tagNames: ['work'],
        },
        {
          date: '2026-03-15',
          description: 'No tag',
          amountCents: 2000,
          categoryName: 'Food',
        },
      ])

      await signInAndGoToSummary(page, '?from=2026-01-01&to=2026-12-31&dimension=category-tag')

      // Only the tagged expense shows
      const catTagRows = page.getByTestId('summary-row')
      await expect(catTagRows).toHaveCount(1)
    }),
  )

  test(
    'syntactically-valid-but-stale tagId values are silently omitted from rendered chip block',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2026-02-10',
          description: 'seed',
          amountCents: 1000,
          categoryName: 'Food',
          tagNames: ['work'],
        },
      ])

      // Navigate with a stale but syntactically valid ULID tagId
      const staleId = '00000000000000000000000000'
      await signInAndGoToSummary(page, `?from=2026-01-01&to=2026-12-31&tagId=${staleId}`)

      // Page renders
      await expect(page.getByTestId('summary-page')).toBeVisible()

      // Stale tagId does not appear as a checked chip
      const chipBlock = page.getByTestId('tag-chip-checkboxes')
      const checkedInputs = chipBlock.locator('input[type="checkbox"]:checked')
      const checkedValues = await checkedInputs.evaluateAll((els: HTMLElement[]) =>
        els.map((el) => (el as HTMLInputElement).value),
      )
      expect(checkedValues).not.toContain(staleId)
    }),
  )
})
