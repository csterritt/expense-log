import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedCategories, seedTags, seedRecurringTemplates } from '../support/db-helpers'

const RECURRING_URL = 'http://localhost:3000/recurring'
const RECURRING_NEW_URL = 'http://localhost:3000/recurring/new'

const todayEt = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

const nextMonthEt = (anchor: string): string => {
  const [y, m, d] = anchor.split('-').map(Number)
  const nextM = m === 12 ? 1 : m + 1
  const nextY = m === 12 ? y + 1 : y
  const daysInNext = new Date(nextY, nextM, 0).getDate()
  const clampedD = Math.min(d, daysInNext)
  return [nextY, String(nextM).padStart(2, '0'), String(clampedD).padStart(2, '0')].join('-')
}

const signIn = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
}

const fillRecurringForm = async (
  page: any,
  opts: {
    description: string
    amount: string
    anchorDate: string
    recurrence: string
    category: string
    tags: string
  },
) => {
  await page.getByTestId('recurring-form-description').fill(opts.description)
  await page.getByTestId('recurring-form-amount').fill(opts.amount)
  await page.getByTestId('recurring-form-anchor-date').fill(opts.anchorDate)
  await page.getByTestId('recurring-form-category').fill(opts.category)
  await page.getByTestId('recurring-form-tags').fill(opts.tags)
  await page.getByTestId('recurring-form-recurrence').selectOption(opts.recurrence)
}

test.use({ javaScriptEnabled: false })

test.describe('Recurring templates — list + create', () => {
  test(
    'empty state shows no-templates message and new-recurring link',
    testWithDatabase(async ({ page }) => {
      await signIn(page)
      await page.goto(RECURRING_URL)
      await expect(page.getByTestId('recurring-page')).toBeVisible()
      await expect(page.getByTestId('recurring-empty')).toBeVisible()
      await expect(page.getByTestId('recurring-new')).toBeVisible()
    }),
  )

  test(
    'create with new category and new tag routes through confirmation then appears in list',
    testWithDatabase(async ({ page }) => {
      await signIn(page)
      await page.goto(RECURRING_URL)
      await page.getByTestId('recurring-new').click()
      await expect(page).toHaveURL(RECURRING_NEW_URL)

      const today = todayEt()
      await fillRecurringForm(page, {
        description: 'Monthly rent',
        amount: '1200.00',
        anchorDate: today,
        recurrence: 'Monthly',
        category: 'brandnewcat',
        tags: 'brandnewtag',
      })
      await page.getByTestId('recurring-form-create').click()

      // Should land on confirmation page
      await expect(page.getByTestId('confirm-recurring-create-new-page')).toBeVisible()
      await expect(page.getByTestId('confirm-recurring-create-new-list')).toBeVisible()
      await expect(page.getByTestId('confirm-recurring-create-new-category-line')).toBeVisible()
      await expect(page.getByTestId('confirm-recurring-create-new-tag-line')).toBeVisible()
      await expect(page.getByTestId('confirm-recurring-create-new-description')).toContainText('Monthly rent')
      await expect(page.getByTestId('confirm-recurring-create-new-amount')).toContainText('1200.00')
      await expect(page.getByTestId('confirm-recurring-create-new-recurrence')).toContainText('Monthly')
      await expect(page.getByTestId('confirm-recurring-create-new-anchor-date')).toContainText(today)

      // Confirm
      await page.getByTestId('confirm-recurring-create-new-confirm').click()
      await expect(page).toHaveURL(RECURRING_URL)

      // Row should appear in list
      await expect(page.getByTestId('recurring-row')).toHaveCount(1)
      await expect(page.getByTestId('recurring-row-description')).toContainText('Monthly rent')
      await expect(page.getByTestId('recurring-row-amount')).toContainText('1,200.00')
      await expect(page.getByTestId('recurring-row-category')).toContainText('brandnewcat')
      await expect(page.getByTestId('recurring-row-tags')).toContainText('brandnewtag')
      await expect(page.getByTestId('recurring-row-recurrence')).toContainText('Monthly')
      await expect(page.getByTestId('recurring-row-anchor-date')).toContainText(today)

      // Next occurrence should be one month after today
      const expectedNext = nextMonthEt(today)
      await expect(page.getByTestId('recurring-row-next-occurrence')).toContainText(expectedNext)
    }),
  )

  test(
    'create with existing category and existing tag skips confirmation and appears sorted',
    testWithDatabase(async ({ page }) => {
      // Seed an existing category and tag, plus an existing template
      await seedRecurringTemplates([
        {
          description: 'Zebra template',
          amountCents: 5000,
          categoryName: 'Utilities',
          tagNames: ['electric'],
          recurrence: 'Monthly',
          anchorDate: '2025-06-15',
        },
      ])
      await signIn(page)
      await page.goto(RECURRING_NEW_URL)

      const today = todayEt()
      await fillRecurringForm(page, {
        description: 'Alpha template',
        amount: '50.00',
        anchorDate: today,
        recurrence: 'Monthly',
        category: 'utilities',
        tags: 'electric',
      })
      await page.getByTestId('recurring-form-create').click()

      // No confirmation — goes straight to list
      await expect(page).toHaveURL(RECURRING_URL)
      const rows = page.getByTestId('recurring-row')
      await expect(rows).toHaveCount(2)

      // Sorted alphabetically: Alpha comes before Zebra
      const descriptions = page.getByTestId('recurring-row-description')
      await expect(descriptions.nth(0)).toContainText('Alpha template')
      await expect(descriptions.nth(1)).toContainText('Zebra template')
    }),
  )
})
