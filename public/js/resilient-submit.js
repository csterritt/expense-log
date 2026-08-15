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

import {
  ATTEMPT_TIMEOUT_MS,
  ERROR_PAGE_PATH,
  getRetryDelay,
  isRetryableAttempt,
  MAX_ATTEMPTS,
} from './resilient-submit-logic.js'

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
  document.addEventListener('submit', handleSubmit)
}

try {
  init()
} catch (error) {
  console.error('[resilient-submit] init failed:', error)
}
