# Task 24: Resilient-submit Rollout — Code Walkthrough

*2026-08-15T14:23:17Z by Showboat 0.6.1*
<!-- showboat-id: 838eb875-dfcf-4345-afb8-31c25fbf481e -->

This walkthrough documents Task 24's shared resilient-submit form wiring. It shows the common JSX contract, the expense edit/delete idempotency wiring, the rollout smoke coverage across expense, category, tag, and recurring forms, and the deliberate exclusion of authentication forms.

The server mints a ULID into each rendered enhanced form. The browser retains that key across a retry; handlers that call withIdempotency replay their recorded redirect rather than repeating the mutation.

```bash
sed -n '1,120p' src/lib/resilient-submit.tsx
```

```output
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export const resilientSubmitProps = (target: string) => ({
  'data-resilient-submit': true,
  'data-resilient-submit-target': target,
})

export const renderSubmissionKeyInput = (submissionKey: string | undefined) => (
  <input type='hidden' name='submissionKey' value={submissionKey ?? ''} />
)

export const renderResilientSubmitScript = () => (
  <script src='/js/resilient-submit.js' type='module'></script>
)
```

Expense edit/delete uses the shared input and attributes, mints a key on GET, and passes successful commit outcomes through the idempotency ledger.

```bash
grep -n -E 'submissionKey|withIdempotency|resilientSubmitProps' src/routes/expenses/build-edit-expense.tsx
```

```output
29:import { withIdempotency } from '../../lib/submission-idempotency'
33:  resilientSubmitProps,
82:    submissionKey: typeof form.submissionKey === 'string' ? form.submissionKey : '',
129:  submissionKey: string
133:  const { id, date, description, amountCents, categoryName, tagNames, submissionKey } = props
157:        {...resilientSubmitProps(PATHS.EXPENSES)}
160:        {renderSubmissionKeyInput(submissionKey)}
251:      state.values.submissionKey = ulid()
324:        const outcome = await withIdempotency(db, {
325:          key: raw.submissionKey,
385:        submissionKey: raw.submissionKey,
487:      const outcome = await withIdempotency(db, {
488:        key: raw.submissionKey,
544:            submissionKey: ulid(),
560:      const outcome = await withIdempotency(db, {
561:        key: raw.submissionKey,
```

Category and tag management forms, including create, rename, merge confirmation, and delete, share the same browser-facing wiring. Recurring create, edit, delete, and confirmation renderers use the same form contract.

```bash
grep -n -E 'resilientSubmitProps|renderSubmissionKeyInput|submissionKey' src/routes/build-categories.tsx src/routes/build-tags.tsx src/routes/recurring/recurring-form.tsx src/routes/recurring/build-create-recurring.tsx src/routes/recurring/build-edit-recurring.tsx
```

```output
src/routes/build-categories.tsx:46:  renderSubmissionKeyInput,
src/routes/build-categories.tsx:47:  resilientSubmitProps,
src/routes/build-categories.tsx:72:    submissionKey: typeof form.submissionKey === 'string' ? form.submissionKey : '',
src/routes/build-categories.tsx:106:            {...resilientSubmitProps(PATHS.CATEGORIES)}
src/routes/build-categories.tsx:109:            {renderSubmissionKeyInput(ulid())}
src/routes/build-categories.tsx:168:                            {...resilientSubmitProps(PATHS.CATEGORIES)}
src/routes/build-categories.tsx:171:                            {renderSubmissionKeyInput(ulid())}
src/routes/build-categories.tsx:203:                            {...resilientSubmitProps(PATHS.CATEGORIES)}
src/routes/build-categories.tsx:206:                            {renderSubmissionKeyInput(ulid())}
src/routes/build-categories.tsx:250:        {...resilientSubmitProps(PATHS.CATEGORIES)}
src/routes/build-categories.tsx:253:        {renderSubmissionKeyInput(ulid())}
src/routes/build-categories.tsx:308:        key: raw.submissionKey,
src/routes/build-tags.tsx:45:  renderSubmissionKeyInput,
src/routes/build-tags.tsx:46:  resilientSubmitProps,
src/routes/build-tags.tsx:71:    submissionKey: typeof form.submissionKey === 'string' ? form.submissionKey : '',
src/routes/build-tags.tsx:105:            {...resilientSubmitProps(PATHS.TAGS)}
src/routes/build-tags.tsx:108:            {renderSubmissionKeyInput(ulid())}
src/routes/build-tags.tsx:163:                            {...resilientSubmitProps(PATHS.TAGS)}
src/routes/build-tags.tsx:166:                            {renderSubmissionKeyInput(ulid())}
src/routes/build-tags.tsx:198:                            {...resilientSubmitProps(PATHS.TAGS)}
src/routes/build-tags.tsx:201:                            {renderSubmissionKeyInput(ulid())}
src/routes/build-tags.tsx:241:        {...resilientSubmitProps(PATHS.TAGS)}
src/routes/build-tags.tsx:244:        {renderSubmissionKeyInput(ulid())}
src/routes/build-tags.tsx:301:        key: raw.submissionKey,
src/routes/recurring/recurring-form.tsx:22:import { renderSubmissionKeyInput, resilientSubmitProps } from '../../lib/resilient-submit'
src/routes/recurring/recurring-form.tsx:71:      {...resilientSubmitProps(PATHS.RECURRING)}
src/routes/recurring/recurring-form.tsx:74:      {renderSubmissionKeyInput(values.submissionKey)}
src/routes/recurring/build-create-recurring.tsx:117:      state.values.submissionKey = ulid()
src/routes/recurring/build-edit-recurring.tsx:56:  renderSubmissionKeyInput,
src/routes/recurring/build-edit-recurring.tsx:57:  resilientSubmitProps,
src/routes/recurring/build-edit-recurring.tsx:163:      state.values.submissionKey = ulid()
src/routes/recurring/build-edit-recurring.tsx:508:                {...resilientSubmitProps(PATHS.RECURRING)}
src/routes/recurring/build-edit-recurring.tsx:510:                {renderSubmissionKeyInput(ulid())}
```

The Playwright smoke test exercises all four signed-in form families and confirms that sign-in, sign-up, and password-reset pages remain unenhanced.

```bash
sed -n '1,130p' e2e-tests/expenses/24-resilient-submit-rollout.spec.ts
```

```output
import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import {
  seedCategories,
  seedExpenses,
  seedRecurringTemplates,
  seedTags,
} from '../support/db-helpers'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'

const categoriesUrl = 'http://localhost:3000/categories'
const tagsUrl = 'http://localhost:3000/tags'
const recurringUrl = 'http://localhost:3000/recurring'

const todayEt = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

const signIn = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
}

const expectEnhanced = async (form: any, target: string) => {
  await expect(form).toHaveAttribute('data-resilient-submit')
  await expect(form).toHaveAttribute('data-resilient-submit-target', new URL(target).pathname)
  await expect(form.locator('input[name="submissionKey"]')).toHaveValue(/^[0-9A-HJKMNP-TV-Z]{26}$/i)
}

test.describe('Resilient-submit rollout', () => {
  test(
    'enhances every remaining expense, category, tag, and recurring mutation form',
    testWithDatabase(async ({ page }) => {
      const [recurringId] = await seedRecurringTemplates([
        {
          description: 'Rent',
          amountCents: 120000,
          categoryName: 'housing',
          recurrence: 'Monthly',
          anchorDate: '2025-01-15',
        },
      ])
      await seedExpenses([
        {
          date: todayEt(),
          description: 'Lunch',
          amountCents: 1234,
          categoryName: 'food',
        },
      ])
      await seedCategories([{ name: 'utilities' }])
      await seedTags([{ name: 'travel' }])
      await signIn(page)

      await page.goto(BASE_URLS.EXPENSES)
      await page.getByTestId('expense-row-edit').first().click()
      await expectEnhanced(page.getByTestId('expense-form'), BASE_URLS.EXPENSES)
      await page.getByTestId('expense-edit-delete').click()
      await expectEnhanced(page.getByTestId('confirm-delete-expense-form'), BASE_URLS.EXPENSES)

      await page.goto(categoriesUrl)
      await expectEnhanced(
        page.getByTestId('categories-page').locator('form').first(),
        categoriesUrl,
      )
      await expectEnhanced(
        page.getByTestId('category-row').first().locator('form').first(),
        categoriesUrl,
      )
      await expectEnhanced(
        page.getByTestId('category-row').first().locator('form').last(),
        categoriesUrl,
      )

      await page.goto(tagsUrl)
      await expectEnhanced(page.getByTestId('tags-page').locator('form').first(), tagsUrl)
      await expectEnhanced(page.getByTestId('tag-row').first().locator('form').first(), tagsUrl)
      await expectEnhanced(page.getByTestId('tag-row').first().locator('form').last(), tagsUrl)

      await page.goto(`${recurringUrl}/new`)
      await expectEnhanced(page.getByTestId('recurring-form'), recurringUrl)
      await page.goto(`${recurringUrl}/${recurringId}/edit`)
      await expectEnhanced(page.getByTestId('recurring-form'), recurringUrl)
      await page.getByTestId('recurring-edit-delete').click()
      await expectEnhanced(
        page.getByTestId('confirm-delete-recurring-page').locator('form'),
        recurringUrl,
      )
    }),
  )

  test(
    'does not enhance authentication forms',
    testWithDatabase(async ({ page }) => {
      for (const url of [BASE_URLS.SIGN_IN, BASE_URLS.SIGN_UP, BASE_URLS.FORGOT_PASSWORD]) {
        await page.goto(url)
        await expect(page.locator('form[data-resilient-submit]')).toHaveCount(0)
      }
    }),
  )
})
```
