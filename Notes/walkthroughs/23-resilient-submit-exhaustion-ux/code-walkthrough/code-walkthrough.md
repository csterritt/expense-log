# Issue 23: Resilient-submit Exhaustion UX — Code Walkthrough

*2026-08-15T12:34:39Z by Showboat 0.6.1*
<!-- showboat-id: 0a7ee7a3-e9c2-4b3a-add5-fcdb1c159279 -->

This walkthrough shows the client-side exhaustion path for resilient expense submissions: after five retryable failures, the live form stays in place, exposes a recoverable alert, restores its submit control, and can be manually retried.

## Exhaustion helpers\n\nThe helpers remove a stale alert at the start of each submission and insert a DaisyUI error alert directly into the existing form. No form HTML is replaced, so browser-maintained text and checkbox state remains intact.

```bash
sed -n '54,160p' public/js/resilient-submit.js
```

```output
const swapResponsePage = (html, url) => {
  const nextPage = new DOMParser().parseFromString(html, 'text/html')
  document.documentElement.innerHTML = nextPage.documentElement.innerHTML
  document.title = nextPage.title
  history.pushState({}, '', url)
  init()
}

const wait = (delay) => new Promise((resolve) => window.setTimeout(resolve, delay))

const clearExhaustionError = (form) => {
  form.querySelector('[data-testid="expense-form-exhaustion-error"]')?.remove()
}

const showExhaustionError = (form) => {
  clearExhaustionError(form)
  const banner = document.createElement('div')
  banner.className = 'alert alert-error md:col-span-5'
  banner.dataset.testid = 'expense-form-exhaustion-error'
  banner.setAttribute('role', 'alert')
  banner.textContent = 'Your submission could not be completed. Please try again later.'
  form.prepend(banner)
}

const sendAttempt = async (form, submitter) => {
  const controller = new AbortController()
  let timedOut = false
  const timeout = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, ATTEMPT_TIMEOUT_MS)

  try {
    const response = await fetch(form.getAttribute('action') || window.location.href, {
      method: form.getAttribute('method') || 'POST',
      body: new FormData(form, submitter),
      credentials: 'same-origin',
      redirect: 'manual',
      signal: controller.signal,
    })
    const target = form.dataset.resilientSubmitTarget
    const finalResponse =
      response.type === 'opaqueredirect' && target
        ? await fetch(target, {
            credentials: 'same-origin',
            redirect: 'follow',
            signal: controller.signal,
          })
        : response
    return { type: 'response', response: finalResponse }
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
        return true
      }
    }

    if (attempt === MAX_ATTEMPTS - 1) {
      return false
    }
    await wait(getRetryDelay(attempt))
  }
  return false
}

const handleSubmit = (event) => {
  const form = event.target instanceof HTMLFormElement ? event.target : null
  if (!form || !form.matches(FORM_SELECTOR) || inFlight) {
    return
  }

  event.preventDefault()
  inFlight = true
  clearExhaustionError(form)
  const submitter = event.submitter
  const restore = setSubmitting(findSubmitControl(form, submitter))
  void send(form, submitter)
    .then((submitted) => {
      if (!submitted) {
        showExhaustionError(form)
      }
    })
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

## Retry-loop outcome\n\nThe loop returns  only after its final retryable attempt. Terminal responses still follow the existing response-swap path. The submit handler consumes that outcome to reveal the alert, while its finalizer always restores the original submit label and enabled state.

## Browser regression coverage\n\nThe Playwright test persists two selected chips, all entry text, a new tag, and a new category through five forced 503 responses. It then removes the intercept and proves a manual retry reaches the normal confirmation and completion flow.

```bash
sed -n '1,120p' e2e-tests/expenses/23-resilient-submit-exhaustion-ux.spec.ts
```

```output
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

const navigationCount = async (page: any): Promise<number> =>
  page.evaluate(() => performance.getEntriesByType('navigation').length)

test.describe('Expense entry form — resilient submit exhaustion UX', () => {
  test(
    'keeps a fully completed form ready for manual retry after five failed attempts',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'seed',
          amountCents: 100,
          categoryName: 'Food',
          tagNames: ['Groceries', 'Work'],
        },
      ])
      await signInAndGoToExpenses(page)

      await page.getByTestId('expense-form-description').fill('Exhaustion retry')
      await page.getByTestId('expense-form-amount').fill('12.34')
      await page.getByTestId('expense-form-date').fill(todayEt())
      await page.getByTestId('expense-form-category').fill('New category')
      const expenseForm = page.getByTestId('expense-form')
      await expenseForm.getByTestId('tag-chip-Groceries').click()
      await expenseForm.getByTestId('tag-chip-Work').click()
      await page.getByTestId('new-tags-input').fill('New tag')

      const beforeNavigationCount = await navigationCount(page)
      let postCount = 0
      const failAllPosts = async (route: any) => {
        if (route.request().method() !== 'POST') {
          await route.continue()
          return
        }
        postCount += 1
        await route.fulfill({ status: 503, body: 'Temporary failure' })
      }
      await page.route(BASE_URLS.EXPENSES, failAllPosts)

      await page.getByTestId('expense-form-create').click()

      const errorBanner = page.getByTestId('expense-form-exhaustion-error')
      await expect(errorBanner).toBeVisible()
      await expect(errorBanner).toContainText('could not be completed')
      await expect(page.getByTestId('expense-form-create')).toBeEnabled()
      expect(postCount).toBe(5)
      expect(await navigationCount(page)).toBe(beforeNavigationCount)
      await expect(page.getByTestId('expense-form-description')).toHaveValue('Exhaustion retry')
      await expect(page.getByTestId('expense-form-amount')).toHaveValue('12.34')
      await expect(page.getByTestId('expense-form-date')).toHaveValue(todayEt())
      await expect(page.getByTestId('expense-form-category')).toHaveValue('New category')
      await expect(expenseForm.getByTestId('tag-chip-Groceries').locator('input')).toBeChecked()
      await expect(expenseForm.getByTestId('tag-chip-Work').locator('input')).toBeChecked()
      await expect(page.getByTestId('new-tags-input')).toHaveValue('New tag')

      await page.unroute(BASE_URLS.EXPENSES, failAllPosts)
      await page.getByTestId('expense-form-create').click()
      await expect(page.getByTestId('confirm-create-new-page')).toBeVisible()
      await page.getByTestId('confirm-create-new-confirm').click()
      await expect(page.getByTestId('expense-row-description').first()).toHaveText(
        'Exhaustion retry',
      )
    }),
  )
})
```
