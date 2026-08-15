# Issue 21: Resilient Submit Retry and Backoff — Code Walkthrough

*2026-08-14T19:29:47Z by Showboat 0.6.1*
<!-- showboat-id: de271c31-5f25-470f-bdbb-b221dd029aa4 -->

This walkthrough documents the DOM-free retry policy, the timeout-wrapped submission loop, and the tests that prove retryable failures are retried while deliberate server responses render immediately.

## Retry policy\n\nThe policy is a standalone ES module, letting the browser loop and unit tests share the exact same full-jitter schedule and infrastructure-failure classification.

```bash
sed -n '1,120p' public/js/resilient-submit-logic.js
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
 * @param {{ type: 'rejected' | 'timeout' } | { type: 'response', status: number }} attempt
 * @returns {boolean} Whether the submission should be retried.
 */
export const isRetryableAttempt = (attempt) =>
  attempt.type === 'rejected' || attempt.type === 'timeout' || attempt.status >= 500
```

## Timeout-wrapped retry loop\n\nEach attempt receives its own AbortController and timeout. Only network rejections, timeouts, and 5xx responses wait for a scheduled retry; 2xx, followed redirects, and 4xx pages are swapped into the current document immediately.

```bash
sed -n '45,135p' public/js/resilient-submit.js
```

```output
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

const wait = (delay) => new Promise((resolve) => window.setTimeout(resolve, delay))

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
      if (!isRetryableAttempt({ type: 'response', status: result.response.status })) {
        swapResponsePage(await result.response.text(), result.response.url)
        return
      }
    }

    const failure =
      result.type === 'response'
        ? { type: 'response', status: result.response.status }
        : { type: result.type }
    if (!isRetryableAttempt(failure) || attempt === MAX_ATTEMPTS - 1) {
      throw new Error('[resilient-submit] submission failed')
    }
    await wait(getRetryDelay(attempt))
  }
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
```

## Automated evidence\n\nThe unit table validates the bounds and classifier; the Playwright spec simulates a transient 503 before letting the normal expense endpoint receive the retry, and confirms validation produces just one POST.

```bash
bun test tests/resilient-submit-retry.spec.ts
```

```output
bun test v1.3.14 (0d9b296a)

tests/resilient-submit-retry.spec.ts:
(pass) resilient submit retry policy > allows one initial attempt plus four retries with capped full-jitter exponential delays [4.51ms]
(pass) resilient submit retry policy > retries transport errors, timeouts, and 5xx responses only [0.04ms]

 2 pass
 0 fail
Ran 2 tests across 1 file. [36.00ms]
```
