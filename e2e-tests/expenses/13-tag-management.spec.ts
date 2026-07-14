import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedExpenses, seedTags } from '../support/db-helpers'

const tagsUrl = 'http://localhost:3000/tags'
const tagNameMax = 25

const todayEt = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

const signInAndGoToTags = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
  await page.goto(tagsUrl)
}

const tagRows = (page: any) => page.getByTestId('tag-row')
const tagNames = (page: any) => page.getByTestId('tag-row-name')
const rowByName = (page: any, name: string) => tagRows(page).filter({ hasText: name })

test.describe('Tag management', () => {
  test.use({ javaScriptEnabled: false })

  test(
    'creates lowercase tags and shows duplicate validation without adding a row',
    testWithDatabase(async ({ page }) => {
      await signInAndGoToTags(page)

      await page.getByTestId('tag-create-name').fill('Travel')
      await page.getByTestId('create-tag-action').click()

      await page.waitForURL(tagsUrl)
      await expect(tagNames(page)).toHaveText(['travel'])

      await page.getByTestId('tag-create-name').fill('TRAVEL')
      await page.getByTestId('create-tag-action').click()

      await page.waitForURL(tagsUrl)
      await expect(page.getByTestId('tag-create-name-error')).toContainText('already exists')
      await expect(tagRows(page)).toHaveCount(1)
      await expect(tagNames(page)).toHaveText(['travel'])
    }),
  )

  test(
    'shows create validation while preserving over-limit input',
    testWithDatabase(async ({ page }) => {
      await signInAndGoToTags(page)
      const tooLong = 'g'.repeat(tagNameMax + 1)

      await page.getByTestId('tag-create-name').fill(tooLong)
      await page.getByTestId('create-tag-action').click()

      await page.waitForURL(tagsUrl)
      await expect(page.getByTestId('tag-create-name-error')).toBeVisible()
      await expect(page.getByTestId('tag-create-name')).toHaveValue(tooLong)
      await expect(tagRows(page)).toHaveCount(0)
    }),
  )

  test(
    'renames a tag to a lowercase normalized name',
    testWithDatabase(async ({ page }) => {
      await seedTags([{ name: 'travel' }])
      await signInAndGoToTags(page)

      const row = rowByName(page, 'travel')
      await row.getByTestId('tag-rename-name').fill('Trips')
      await row.getByTestId('rename-tag-action').click()

      await page.waitForURL(tagsUrl)
      await expect(rowByName(page, 'trips')).toHaveCount(1)
      await expect(rowByName(page, 'travel')).toHaveCount(0)
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
          tagNames: ['travel'],
        },
        {
          date: todayEt(),
          description: 'Target expense',
          amountCents: 200,
          categoryName: 'food',
          tagNames: ['trips'],
        },
      ])
      await signInAndGoToTags(page)

      const sourceRow = rowByName(page, 'travel')
      await sourceRow.getByTestId('tag-rename-name').fill('TRIPS')
      await sourceRow.getByTestId('rename-tag-action').click()

      await expect(page.getByTestId('tag-merge-confirm-page')).toBeVisible()
      await expect(page.getByTestId('merge-source-name')).toHaveText('travel')
      await expect(page.getByTestId('merge-target-name')).toHaveText('trips')
      await expect(page.getByTestId('merge-expense-count')).toContainText('All 1 expenses')

      await page.getByTestId('confirm-merge-tag-action').click()
      await page.waitForURL(tagsUrl)
      await expect(rowByName(page, 'travel')).toHaveCount(0)
      await expect(rowByName(page, 'trips')).toHaveCount(1)
    }),
  )

  test(
    'canceling rename collision merge leaves tags unchanged',
    testWithDatabase(async ({ page }) => {
      await seedTags([{ name: 'travel' }, { name: 'trips' }])
      await signInAndGoToTags(page)

      const sourceRow = rowByName(page, 'travel')
      await sourceRow.getByTestId('tag-rename-name').fill('trips')
      await sourceRow.getByTestId('rename-tag-action').click()

      await expect(page.getByTestId('tag-merge-confirm-page')).toBeVisible()
      await page.getByTestId('cancel-merge-tag-action').click()

      await page.waitForURL(tagsUrl)
      await expect(rowByName(page, 'travel')).toHaveCount(1)
      await expect(rowByName(page, 'trips')).toHaveCount(1)
    }),
  )

  test(
    'blocks deleting referenced tags with a count and deletes unreferenced tags',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'One',
          amountCents: 100,
          categoryName: 'food',
          tagNames: ['travel'],
        },
        {
          date: todayEt(),
          description: 'Two',
          amountCents: 200,
          categoryName: 'food',
          tagNames: ['travel'],
        },
      ])
      await seedTags([{ name: 'dining' }])
      await signInAndGoToTags(page)

      await rowByName(page, 'travel').getByTestId('delete-tag-action').click()
      await page.waitForURL(tagsUrl)
      await expect(page.getByRole('alert')).toContainText('2 expenses reference')
      await expect(rowByName(page, 'travel')).toHaveCount(1)

      await rowByName(page, 'dining').getByTestId('delete-tag-action').click()
      await page.waitForURL(tagsUrl)
      await expect(rowByName(page, 'dining')).toHaveCount(0)
      await expect(rowByName(page, 'travel')).toHaveCount(1)
    }),
  )
})
