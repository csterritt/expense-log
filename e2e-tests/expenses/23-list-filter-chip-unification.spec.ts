import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedExpenses } from '../support/db-helpers'

const todayEt = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

const signInAndGoToExpenses = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
  await page.goto(BASE_URLS.EXPENSES)
}

const filterBar = (page: any) => page.getByTestId('expense-filter-bar')

test.describe('Expense list filter — tag chip-checkbox unification', () => {
  test(
    'filter bar tag chips use the shared chip-checkbox component (tag-chip-checkboxes data-testid)',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['food', 'gift', 'lego', 'restaurant'],
        },
      ])

      await signInAndGoToExpenses(page)

      const chipBlock = filterBar(page).getByTestId('tag-chip-checkboxes')
      await expect(chipBlock).toBeVisible()
    }),
  )

  test(
    'filter bar tag chips render in alphabetical case-insensitive order with wrap',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['food', 'gift', 'lego', 'restaurant'],
        },
      ])

      await signInAndGoToExpenses(page)

      const chipBlock = filterBar(page).getByTestId('tag-chip-checkboxes')
      const chips = chipBlock.locator('[data-testid^="tag-chip-"]')
      await expect(chips).toHaveCount(4)

      const names = await chips.allTextContents()
      const lower = names.map((n) => n.trim().toLowerCase())
      expect(lower).toEqual([...lower].sort())

      await expect(chipBlock).toHaveCSS('display', 'flex')
    }),
  )

  test(
    'filter bar tag chips have the same class hooks as entry form chips',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['food', 'gift'],
        },
      ])

      await signInAndGoToExpenses(page)

      const foodChip = filterBar(page).getByTestId('tag-chip-food')
      const giftChip = filterBar(page).getByTestId('tag-chip-gift')

      const foodClass = await foodChip.getAttribute('class')
      const giftClass = await giftChip.getAttribute('class')
      expect(foodClass).toEqual(giftClass)

      expect(foodClass).toContain('badge')
      expect(foodClass).toContain('badge-outline')
    }),
  )

  test(
    'AND/OR toggle and mode=and|or query-string contract are preserved',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['food', 'gift'],
        },
      ])

      await signInAndGoToExpenses(page)

      const orRadio = filterBar(page).getByTestId('filter-tag-mode-or')
      const andRadio = filterBar(page).getByTestId('filter-tag-mode-and')
      await expect(orRadio).toBeVisible()
      await expect(andRadio).toBeVisible()

      await expect(orRadio).toBeChecked()

      await filterBar(page).getByTestId('tag-chip-food').click()
      await filterBar(page).getByTestId('tag-chip-gift').click()
      await andRadio.check()
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses\?.*tagMode=and/)

      const andRadioAfter = filterBar(page).getByTestId('filter-tag-mode-and')
      await expect(andRadioAfter).toBeChecked()
    }),
  )

  test(
    'excess tagId values beyond the cap are silently truncated (no error, page renders)',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['food'],
        },
      ])

      await signInAndGoToExpenses(page)

      const foodChip = filterBar(page).getByTestId('tag-chip-food')
      await expect(foodChip).toBeVisible()

      const foodId = await foodChip.locator('input[type="checkbox"]').getAttribute('value')
      const params = new URLSearchParams()
      for (let i = 0; i < 70; i++) {
        params.append('tagId', foodId!)
      }

      await page.goto(`${BASE_URLS.EXPENSES}?${params.toString()}`)

      await expect(page.getByTestId('expenses-page')).toBeVisible()
      await expect(page.getByTestId('filter-tags-error')).toHaveCount(0)
    }),
  )

  test(
    'syntactically-invalid tagId values are silently dropped (no error)',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['food'],
        },
      ])

      await signInAndGoToExpenses(page)

      const params = new URLSearchParams()
      params.append('tagId', 'not-a-valid-ulid')
      params.append('tagId', 'also-bad')
      params.append('tagId', 'short')

      await page.goto(`${BASE_URLS.EXPENSES}?${params.toString()}`)

      await expect(page.getByTestId('expenses-page')).toBeVisible()
      await expect(page.getByTestId('filter-tags-error')).toHaveCount(0)
    }),
  )

  test(
    'stale tagId values (no longer existing) are silently omitted from rendered chip block',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['food'],
        },
      ])

      await signInAndGoToExpenses(page)

      const foodChip = filterBar(page).getByTestId('tag-chip-food')
      await expect(foodChip).toBeVisible()
      const foodId = await foodChip.locator('input[type="checkbox"]').getAttribute('value')

      const staleParams = new URLSearchParams()
      staleParams.append('tagId', foodId!)
      staleParams.append('tagId', '00000000000000000000000000')

      await page.goto(`${BASE_URLS.EXPENSES}?${staleParams.toString()}`)

      await expect(page.getByTestId('expenses-page')).toBeVisible()
      await expect(page.getByTestId('filter-tags-error')).toHaveCount(0)

      const chipBlock = filterBar(page).getByTestId('tag-chip-checkboxes')
      const chipIds = chipBlock.locator('input[type="checkbox"]')
      const allValues = await chipIds.evaluateAll((els: HTMLElement[]) =>
        els.map((el) => (el as HTMLInputElement).value),
      )
      expect(allValues).not.toContain('00000000000000000000000000')
    }),
  )

  test(
    'tagId values on the chip inputs have name=tagId and value=<ulid> format',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['food'],
        },
      ])

      await signInAndGoToExpenses(page)

      const chipBlock = filterBar(page).getByTestId('tag-chip-checkboxes')
      const checkboxes = chipBlock.locator('input[type="checkbox"]')
      await expect(checkboxes).toHaveCount(1)

      const name = await checkboxes.first().getAttribute('name')
      const value = await checkboxes.first().getAttribute('value')
      expect(name).toBe('tagId')
      expect(value).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
    }),
  )
})
