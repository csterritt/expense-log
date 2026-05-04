import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedCategories, seedExpenses } from '../support/db-helpers'

const categoriesUrl = 'http://localhost:3000/categories'
const categoryNameMax = 22

const todayEt = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

const signInAndGoToCategories = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
  await page.goto(categoriesUrl)
}

const categoryRows = (page: any) => page.getByTestId('category-row')
const categoryNames = (page: any) => page.getByTestId('category-row-name')
const rowByName = (page: any, name: string) => categoryRows(page).filter({ hasText: name })

test.describe('Category management', () => {
  test.use({ javaScriptEnabled: false })

  test(
    'creates lowercase categories and shows duplicate validation without adding a row',
    testWithDatabase(async ({ page }) => {
      await signInAndGoToCategories(page)

      await page.getByTestId('category-create-name').fill('Food')
      await page.getByTestId('create-category-action').click()

      await page.waitForURL(categoriesUrl)
      await expect(categoryNames(page)).toHaveText(['food'])

      await page.getByTestId('category-create-name').fill('FOOD')
      await page.getByTestId('create-category-action').click()

      await page.waitForURL(categoriesUrl)
      await expect(page.getByTestId('category-create-name-error')).toContainText('already exists')
      await expect(categoryRows(page)).toHaveCount(1)
      await expect(categoryNames(page)).toHaveText(['food'])
    }),
  )

  test(
    'shows create validation while preserving over-limit input',
    testWithDatabase(async ({ page }) => {
      await signInAndGoToCategories(page)
      const tooLong = 'g'.repeat(categoryNameMax + 1)

      await page.getByTestId('category-create-name').fill(tooLong)
      await page.getByTestId('create-category-action').click()

      await page.waitForURL(categoriesUrl)
      await expect(page.getByTestId('category-create-name-error')).toBeVisible()
      await expect(page.getByTestId('category-create-name')).toHaveValue(tooLong)
      await expect(categoryRows(page)).toHaveCount(0)
    }),
  )

  test(
    'renames a category to a lowercase normalized name',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'food' }])
      await signInAndGoToCategories(page)

      const row = rowByName(page, 'food')
      await row.getByTestId('category-rename-name').fill('Groceries')
      await row.getByTestId('rename-category-action').click()

      await page.waitForURL(categoriesUrl)
      await expect(rowByName(page, 'groceries')).toHaveCount(1)
      await expect(rowByName(page, 'food')).toHaveCount(0)
    }),
  )

  test(
    'confirms rename collision merge and repoints source expenses',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'Source expense',
          amountCents: 100,
          categoryName: 'food',
          tagNames: [],
        },
        {
          date: todayEt(),
          description: 'Target expense',
          amountCents: 200,
          categoryName: 'groceries',
          tagNames: [],
        },
      ])
      await signInAndGoToCategories(page)

      const sourceRow = rowByName(page, 'food')
      await sourceRow.getByTestId('category-rename-name').fill('GROCERIES')
      await sourceRow.getByTestId('rename-category-action').click()

      await expect(page.getByTestId('category-merge-confirm-page')).toBeVisible()
      await expect(page.getByTestId('merge-source-name')).toHaveText('food')
      await expect(page.getByTestId('merge-target-name')).toHaveText('groceries')
      await expect(page.getByTestId('merge-expense-count')).toContainText('All 1 expenses')

      await page.getByTestId('confirm-merge-category-action').click()
      await page.waitForURL(categoriesUrl)
      await expect(rowByName(page, 'food')).toHaveCount(0)
      await expect(rowByName(page, 'groceries')).toHaveCount(1)

      await page.goto(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('expense-row')).toHaveCount(2)
      await expect(page.getByTestId('expense-row-category')).toHaveText(['groceries', 'groceries'])
    }),
  )

  test(
    'canceling rename collision merge leaves categories unchanged',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'food' }, { name: 'groceries' }])
      await signInAndGoToCategories(page)

      const sourceRow = rowByName(page, 'food')
      await sourceRow.getByTestId('category-rename-name').fill('groceries')
      await sourceRow.getByTestId('rename-category-action').click()

      await expect(page.getByTestId('category-merge-confirm-page')).toBeVisible()
      await page.getByTestId('cancel-merge-category-action').click()

      await page.waitForURL(categoriesUrl)
      await expect(rowByName(page, 'food')).toHaveCount(1)
      await expect(rowByName(page, 'groceries')).toHaveCount(1)
    }),
  )

  test(
    'blocks deleting referenced categories with a count and deletes unreferenced categories',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'One',
          amountCents: 100,
          categoryName: 'food',
          tagNames: [],
        },
        {
          date: todayEt(),
          description: 'Two',
          amountCents: 200,
          categoryName: 'food',
          tagNames: [],
        },
      ])
      await seedCategories([{ name: 'utilities' }])
      await signInAndGoToCategories(page)

      await rowByName(page, 'food').getByTestId('delete-category-action').click()
      await page.waitForURL(categoriesUrl)
      await expect(page.getByRole('alert')).toContainText('2 expenses reference')
      await expect(rowByName(page, 'food')).toHaveCount(1)

      await rowByName(page, 'utilities').getByTestId('delete-category-action').click()
      await page.waitForURL(categoriesUrl)
      await expect(rowByName(page, 'utilities')).toHaveCount(0)
      await expect(rowByName(page, 'food')).toHaveCount(1)
    }),
  )
})
