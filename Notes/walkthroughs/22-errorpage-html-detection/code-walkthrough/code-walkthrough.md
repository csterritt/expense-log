# Issue 22: ErrorPage.html Detection — Code Walkthrough

*2026-08-15T00:39:02Z by Showboat 0.6.1*
<!-- showboat-id: 03f8e5e3-0ca7-4dd5-b96e-7eae725914fb -->

This walkthrough shows how the resilient-submit retry policy identifies the host fallback ErrorPage.html by response identity, prevents it from being rendered as a successful page, and retries the original expense POST.

## Shared path and pure classification\n\nThe retry-policy module owns the single ErrorPage.html path constant. Its pure classifier compares the final response URL pathname case-insensitively, alongside transport, timeout, and 5xx failures.

```bash
sed -n '1,80p' public/js/resilient-submit-logic.js
```

```output
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Shared retry policy for resilient form submissions.
 * @module resilient-submit-logic
 */

export const MAX_ATTEMPTS = 5
export const ERROR_PAGE_PATH = '/ErrorPage.html'
// export const RETRY_BASE_DELAY_MS = 500 // PRODUCTION:UNCOMMENT
export const RETRY_BASE_DELAY_MS = 10 // PRODUCTION:REMOVE
// export const RETRY_CAP_DELAY_MS = 2_000 // PRODUCTION:UNCOMMENT
export const RETRY_CAP_DELAY_MS = 40 // PRODUCTION:REMOVE
// export const ATTEMPT_TIMEOUT_MS = 10_000 // PRODUCTION:UNCOMMENT
export const ATTEMPT_TIMEOUT_MS = 100 // PRODUCTION:REMOVE

/**
 * Returns the full-jitter delay before a retry.
 *
 * @param {number} retryIndex Zero-based retry index.
 * @param {() => number} random Random value provider.
 * @returns {number} Delay in milliseconds.
 */
export const getRetryDelay = (retryIndex, random = Math.random) => {
  const cappedDelay = Math.min(RETRY_CAP_DELAY_MS, RETRY_BASE_DELAY_MS * 2 ** retryIndex)
  return Math.floor(random() * cappedDelay)
}

/**
 * Determines whether an attempt failed due to transient infrastructure.
 *
 * @param {{ type: 'rejected' | 'timeout' } | { type: 'response', status: number, url?: string }} attempt
 * @param {string} errorPagePath Path of the host-served fallback error page.
 * @returns {boolean} Whether the submission should be retried.
 */
export const isRetryableAttempt = (attempt, errorPagePath = ERROR_PAGE_PATH) =>
  attempt.type === 'rejected' ||
  attempt.type === 'timeout' ||
  attempt.status >= 500 ||
  (attempt.type === 'response' &&
    Boolean(attempt.url) &&
    new URL(attempt.url).pathname.toLowerCase() === errorPagePath.toLowerCase())
```

## Retry loop ordering\n\nBefore the module reads and swaps a terminal response into the document, it calls the classifier with the final response URL. A 200 response at ErrorPage.html is therefore treated as retryable rather than rendered as success.

```bash
sed -n '90,125p' public/js/resilient-submit.js
```

```output
  } catch {
    return { type: timedOut ? 'timeout' : 'rejected' }
  } finally {
    window.clearTimeout(timeout)
  }
}

const send = async (form, submitter) => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const result = await sendAttempt(form, submitter)
    if (result.type === 'response') {
      if (
        !isRetryableAttempt(
          { type: 'response', status: result.response.status, url: result.response.url },
          ERROR_PAGE_PATH,
        )
      ) {
        swapResponsePage(await result.response.text(), result.response.url)
        return
      }
    }

    const failure =
      result.type === 'response'
        ? { type: 'response', status: result.response.status, url: result.response.url }
        : { type: result.type }
    if (!isRetryableAttempt(failure, ERROR_PAGE_PATH) || attempt === MAX_ATTEMPTS - 1) {
      throw new Error('[resilient-submit] submission failed')
    }
    await wait(getRetryDelay(attempt))
  }
}

const handleSubmit = (event) => {
  const form = event.target instanceof HTMLFormElement ? event.target : null
  if (!form || !form.matches(FORM_SELECTOR) || inFlight) {
```

## Unit and browser coverage\n\nThe unit spec uses the exported path constant for a case-insensitive ErrorPage.html URL and confirms an ordinary 200 expense page remains terminal. The Playwright spec imports that same constant, detours one expense POST to a fulfilled 200 ErrorPage.html response, and verifies the retry reaches the normal expense success page.

```bash
bun test tests/resilient-submit-retry.spec.ts
```

```output
bun test v1.3.14 (0d9b296a)

tests/resilient-submit-retry.spec.ts:
(pass) resilient submit retry policy > allows one initial attempt plus four retries with capped full-jitter exponential delays [1.51ms]
(pass) resilient submit retry policy > retries transient errors, host error pages, and 5xx responses [0.07ms]

 2 pass
 0 fail
Ran 2 tests across 1 file. [21.00ms]
```

```bash
sed -n '1,100p' e2e-tests/expenses/22-errorpage-html-detection.spec.ts
```

```output
import { expect, test } from '@playwright/test'

import { ERROR_PAGE_PATH } from '../../public/js/resilient-submit-logic.js'
import { seedCategories } from '../support/db-helpers'
import { submitSignInForm } from '../support/form-helpers'
import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { testWithDatabase } from '../support/test-helpers'

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

const fillValidEntry = async (page: any, description: string) => {
  await page.getByTestId('expense-form-description').fill(description)
  await page.getByTestId('expense-form-amount').fill('12.34')
  await page.getByTestId('expense-form-date').fill(todayEt())
  await page.getByTestId('expense-form-category').fill('Food')
}

const ERROR_PAGE_URL = new URL(ERROR_PAGE_PATH, BASE_URLS.HOME).href

test.describe('Expense entry form — ErrorPage.html detection', () => {
  test(
    'retries a 200 host error page and then renders the normal success page',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'Food' }])
      await signInAndGoToExpenses(page)
      await fillValidEntry(page, 'Retry after host error page')

      let serveErrorPage = true
      let postCount = 0
      await page.route('**/*', async (route: any) => {
        const request = route.request()
        if (request.method() === 'POST' && request.url() === BASE_URLS.EXPENSES) {
          postCount += 1
          if (serveErrorPage) {
            serveErrorPage = false
            await route.continue({ url: ERROR_PAGE_URL })
            return
          }
        }
        if (request.method() === 'POST' && request.url() === ERROR_PAGE_URL) {
          await route.fulfill({ status: 200, body: '<title>Host error</title>Host error page' })
          return
        }
        await route.continue()
      })

      await page.getByTestId('expense-form-create').click()

      await expect(page.getByTestId('expense-row-description').first()).toHaveText(
        'Retry after host error page',
      )
      expect(postCount).toBe(2)
    }),
  )
})
```
