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

test.describe('Tag chip picker (JS-on)', () => {
  test(
    'add existing tag via Enter, create new tag via Create row, remove via × button',
    testWithDatabase(async ({ page }) => {
      // Seed an existing category and an existing tag named `groceries`.
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['groceries'],
        },
      ])

      await signInAndGoToExpenses(page)

      // Wait for the chip-picker surface to appear.
      const surface = page.getByTestId('tag-chip-picker-surface')
      await expect(surface).toBeVisible()

      const search = page.getByTestId('tag-chip-picker-input')
      await search.click()
      await search.fill('gro')
      await expect(page.getByTestId('tag-chip-picker-option-groceries')).toBeVisible()
      // ArrowDown highlights the existing suggestion; Enter then commits
      // it. Without ArrowDown, Enter would add the typed-value verbatim
      // ('gro') rather than picking the suggestion.
      await search.press('ArrowDown')
      await search.press('Enter')

      // Chip should appear and hidden input updated.
      await expect(page.getByTestId('tag-chip-groceries')).toBeVisible()
      await expect(page.getByTestId('expense-form-tags')).toHaveValue('groceries')

      await search.fill('food')
      const createRow = page.getByTestId('tag-chip-picker-create')
      await expect(createRow).toBeVisible()
      await createRow.click()

      await expect(page.getByTestId('tag-chip-food')).toBeVisible()
      await expect(page.getByTestId('expense-form-tags')).toHaveValue('groceries,food')

      // Remove the groceries chip via its × button.
      await page.getByTestId('tag-chip-groceries-remove').click()
      await expect(page.getByTestId('tag-chip-groceries')).toHaveCount(0)
      await expect(page.getByTestId('expense-form-tags')).toHaveValue('food')

      // Submit a full row — should hit the confirmation page for the new
      // `food` tag.
      await page.getByTestId('expense-form-description').fill('Snack run')
      await page.getByTestId('expense-form-amount').fill('5.00')
      await page.getByTestId('expense-form-date').fill(todayEt())
      await page.getByTestId('expense-form-category').fill('food')

      await page.getByTestId('expense-form-create').click()

      await expect(page.getByTestId('confirm-create-new-page')).toBeVisible()
      const tagLines = page.getByTestId('confirm-create-new-tag-line')
      await expect(tagLines).toHaveCount(1)
      await expect(tagLines.first()).toContainText("'food'")

      await page.getByTestId('confirm-create-new-confirm').click()
      await page.waitForURL(BASE_URLS.EXPENSES)

      const row = page.getByTestId('expense-row').filter({ hasText: 'Snack run' })
      await expect(row).toHaveCount(1)
      await expect(row.getByTestId('expense-row-tags')).toHaveText('food')
    }),
  )

  test(
    'pre-seeded form value rehydrates as chips after a validation-error round-trip',
    testWithDatabase(async ({ page }) => {
      // Seed `food` category so the category field passes lookup.
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'food',
          tagNames: [],
        },
      ])

      await signInAndGoToExpenses(page)

      // Add two chips via the picker and pair them with an invalid amount
      // to force a server-side redirect-with-form-state. The form-state
      // cookie preserves the raw tags CSV; the chip picker on remount must
      // rehydrate those chips from the input's restored value.
      await page.getByTestId('expense-form-description').fill('Round trip')
      await page.getByTestId('expense-form-amount').fill('not-a-number')
      await page.getByTestId('expense-form-date').fill(todayEt())
      await page.getByTestId('expense-form-category').fill('food')

      const search = page.getByTestId('tag-chip-picker-input')
      await search.click()
      await search.fill('groceries')
      await search.press('Enter')
      await search.fill('rent')
      await search.press('Enter')
      await expect(page.getByTestId('expense-form-tags')).toHaveValue('groceries,rent')

      // Close the suggestions dropdown so it does not overlay the submit
      // button (Playwright's actionability check would otherwise time
      // out waiting for the button to become clickable).
      await search.press('Escape')
      await page.getByTestId('expense-form-create').click()

      // After the validation-error redirect we land back on /expenses
      // with the form values restored. The chip picker remounts and
      // rehydrates both chips from the preserved CSV. Wait on a value
      // that only the redirect path can produce so we don't race the
      // initial render.
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('not-a-number')
      await expect(page.getByTestId('tag-chip-groceries')).toBeVisible()
      await expect(page.getByTestId('tag-chip-rent')).toBeVisible()
      await expect(page.getByTestId('expense-form-tags')).toHaveValue('groceries,rent')
    }),
  )
})
