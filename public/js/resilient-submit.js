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
    document.addEventListener('submit', handleSubmit)
  }

  try {
    init()
  } catch (error) {
    console.error('[resilient-submit] init failed:', error)
  }
})()
