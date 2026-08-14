# Issue 20: Resilient Submit Happy Path — Code Walkthrough

*2026-08-14T16:12:03Z by Showboat 0.6.1*
<!-- showboat-id: 52685cf0-3fe3-4392-83fc-428eaabc93a3 -->

This walkthrough covers the progressive enhancement that turns opted-in expense mutation forms into resilient background submissions. It documents the shared data attribute convention, the document-level delegated submit listener that survives response swaps, the fetch and final-page swap path, and the Playwright acceptance coverage for the JS-on and JS-off paths.

## 1. Dependency-free resilient-submit module

```bash
sed -n '1,94p' public/js/resilient-submit.js
```

```output
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Progressive-enhancement background submission for mutation forms.
 *
 * Activation hook: any <form data-resilient-submit> on the page. Opted-in
 * forms also provide data-resilient-submit-target for opaque redirects. These
 * are documented cross-file conventions because this dependency-free script is
 * served directly rather than imported by the server-rendered TSX.
 */
;(() => {
  'use strict'

  const FORM_SELECTOR = '[data-resilient-submit]'
  const SUBMITTING_LABEL = 'Submitting…'
  let inFlight = false

  const findSubmitControl = (form, submitter) => {
    if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
      return submitter
    }
    return form.querySelector('button[type="submit"], input[type="submit"]')
  }

  const setSubmitting = (control) => {
    if (!control) {
      return () => {}
    }
    const label = control instanceof HTMLInputElement ? control.value : control.textContent
    control.disabled = true
    if (control instanceof HTMLInputElement) {
      control.value = SUBMITTING_LABEL
    } else {
      control.textContent = SUBMITTING_LABEL
    }
    return () => {
      control.disabled = false
      if (control instanceof HTMLInputElement) {
        control.value = label
      } else {
        control.textContent = label
      }
    }
  }

  const swapResponsePage = (html, url) => {
    const nextPage = new DOMParser().parseFromString(html, 'text/html')
    document.documentElement.innerHTML = nextPage.documentElement.innerHTML
    document.title = nextPage.title
    history.pushState({}, '', url)
    init()
  }

  const send = async (form, submitter) => {
    const response = await fetch(form.getAttribute('action') || window.location.href, {
      method: form.getAttribute('method') || 'POST',
      body: new FormData(form, submitter),
      credentials: 'same-origin',
      redirect: 'manual',
    })
    const target = form.dataset.resilientSubmitTarget
    const finalResponse =
      response.type === 'opaqueredirect' && target
        ? await fetch(target, { credentials: 'same-origin', redirect: 'follow' })
        : response
    if (!finalResponse.ok) {
      throw new Error(`Request failed with status ${finalResponse.status}`)
    }
    swapResponsePage(await finalResponse.text(), finalResponse.url)
  }

  const handleSubmit = (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null
    if (!form || !form.matches(FORM_SELECTOR) || inFlight) {
      return
    }

    event.preventDefault()
    inFlight = true
    const submitter = event.submitter
    const restore = setSubmitting(findSubmitControl(form, submitter))
    void send(form, submitter)
      .catch((error) => {
        console.error('[resilient-submit] submission failed:', error)
      })
      .finally(() => {
        restore()
        inFlight = false
      })
  }

  const init = () => {
```

## 2. Shared form opt-in and script wiring

```bash
sed -n '60,75p;252,300p' src/routes/expenses/expense-form.tsx && sed -n '282,290p' src/routes/expenses/expense-list-renderer.tsx && sed -n '106,114p' src/routes/expenses/build-edit-expense.tsx
```

```output
  const { fieldErrors, values } = state
  const submitLabel = mode === 'edit' ? 'Save changes' : 'Add expense'
  const submitTestId = mode === 'edit' ? 'expense-form-save' : 'expense-form-create'
  return (
    <form
      method='post'
      action={action}
      className='mb-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-start'
      data-testid='expense-form'
      data-resilient-submit
      data-resilient-submit-target={PATHS.EXPENSES}
      noValidate
    >
      <input type='hidden' name='submissionKey' value={values.submissionKey ?? ''} />
      <div className='flex flex-col md:col-span-2'>
        <label className='label' htmlFor='expense-form-description'>
        <dt className='font-semibold'>Tags</dt>
        <dd data-testid={`${prefix}-tags`}>{finalTagNames.join(', ')}</dd>
      </dl>
      <form
        method='post'
        action={action}
        className='flex gap-3'
        data-testid={`${prefix}-form`}
        data-resilient-submit={isRecurring ? undefined : ''}
        data-resilient-submit-target={isRecurring ? undefined : PATHS.EXPENSES}
        noValidate
      >
        <input type='hidden' name='description' value={values.description ?? ''} />
        <input type='hidden' name='amount' value={values.amount ?? ''} />
        {!isRecurring && <input type='hidden' name='date' value={values.date ?? ''} />}
        {isRecurring && (
          <>
            <input type='hidden' name='recurrence' value={values.recurrence ?? ''} />
            <input type='hidden' name='anchorDate' value={values.anchorDate ?? ''} />
          </>
        )}
        <input type='hidden' name='category' value={values.category ?? ''} />
        {(values.tagIds ?? []).map((id) => (
          <input type='hidden' name='tagId' value={id} />
        ))}
        <input type='hidden' name='newTags' value={values.newTags ?? ''} />
        <input type='hidden' name='submissionKey' value={values.submissionKey ?? ''} />
        <button
          type='submit'
          name='action'
          value='confirm'
          className='btn btn-primary'
          data-testid={`${prefix}-confirm`}
        >
          Confirm
        </button>
        <button
          type='submit'
          name='action'
          value='cancel'
          className='btn btn-ghost'
          data-testid={`${prefix}-cancel`}
        >
          Cancel
        </button>
      </form>
      {!isRecurring && <script src='/js/resilient-submit.js' defer></script>}
    </div>
  )
        </p>
      ) : (
        renderExpenseTable(rows)
      )}
      <script src='/js/category-combobox.js' defer></script>
      <script src='/js/tag-chip-checkboxes.js' defer></script>
      <script src='/js/resilient-submit.js' defer></script>
    </div>
  )
        <a href={PATHS.EXPENSES} className='btn btn-ghost ml-2' data-testid='expense-edit-back'>
          Back to list
        </a>
      </div>
      <script src='/js/category-combobox.js' defer></script>
      <script src='/js/tag-chip-checkboxes.js' defer></script>
      <script src='/js/resilient-submit.js' defer></script>
    </div>
  )
```

## 3. End-to-end acceptance coverage

```bash
sed -n '1,105p' e2e-tests/expenses/20-resilient-submit-happy-path.spec.ts
```

```output
import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedCategories } from '../support/db-helpers'

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

const fillEntryForm = async (page: any, description: string, category: string) => {
  await page.getByTestId('expense-form-description').fill(description)
  await page.getByTestId('expense-form-amount').fill('12.34')
  await page.getByTestId('expense-form-date').fill(todayEt())
  await page.getByTestId('expense-form-category').fill(category)
}

const navigationCount = async (page: any): Promise<number> =>
  page.evaluate(() => performance.getEntriesByType('navigation').length)

test.describe('Expense entry form — resilient submit happy path', () => {
  test(
    'submits via fetch, swaps the success page in place, and prevents duplicate submissions',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)
      await fillEntryForm(page, 'Fetch success', 'Food')

      const beforeNavigationCount = await navigationCount(page)
      let postCount = 0
      page.on('request', (request: any) => {
        if (request.url() === `${BASE_URLS.EXPENSES}` && request.method() === 'POST') {
          postCount++
        }
      })

      await page.getByTestId('expense-form-create').evaluate((button: HTMLButtonElement) => {
        button.click()
        button.click()
      })

      await expect(page.getByTestId('expense-row-description').first()).toHaveText('Fetch success')
      await expect(page.getByTestId('expense-form-create')).toBeEnabled()
      expect(postCount).toBe(1)
      expect(await navigationCount(page)).toBe(beforeNavigationCount)
    }),
  )

  test(
    'swaps confirmation in place and enhances its confirm action',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)
      await fillEntryForm(page, 'Confirm via fetch', 'Food')
      await page.getByTestId('new-tags-input').fill('lunch')

      const beforeNavigationCount = await navigationCount(page)
      await page.getByTestId('expense-form-create').click()

      await expect(page.getByTestId('confirm-create-new-page')).toBeVisible()
      expect(await navigationCount(page)).toBe(beforeNavigationCount)

      await page.getByTestId('confirm-create-new-confirm').click()
      await expect(page.getByTestId('expense-row-description').first()).toHaveText(
        'Confirm via fetch',
      )
      expect(await navigationCount(page)).toBe(beforeNavigationCount)
    }),
  )

  test(
    'uses the native POST path when JavaScript is disabled',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      const browser = page.context().browser()
      if (!browser) {
        throw new Error('Playwright browser is unavailable')
      }
      const context = await browser.newContext({ javaScriptEnabled: false })
      const jsOffPage = await context.newPage()
      try {
        await signInAndGoToExpenses(jsOffPage)
        await fillEntryForm(jsOffPage, 'Native success', 'Food')
        let nativePost = false
        jsOffPage.on('request', (request: any) => {
          if (
            request.url() === BASE_URLS.EXPENSES &&
            request.method() === 'POST' &&
            request.isNavigationRequest()
          ) {
            nativePost = true
          }
        })

```
