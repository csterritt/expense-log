import { test, expect } from '@playwright/test'

import { fillInput, clickLink, verifyAlert } from '../support/finders'
import { verifyOnResetPasswordPage } from '../support/page-verifiers'

// A token containing characters that are significant in a URL query string.
// Without proper encoding, `&` would inject a spurious query parameter and `#`
// would start a URL fragment, corrupting the reflected token.
const RESERVED_TOKEN = 'abc&def#ghi=jkl mno'

test('reflects the reset token into the redirect URL with proper encoding', async ({ page }) => {
  // Land on the reset page with an encoded token so the hidden field is populated.
  await page.goto(
    `http://localhost:3000/auth/reset-password?token=${encodeURIComponent(RESERVED_TOKEN)}`,
  )
  await verifyOnResetPasswordPage(page)

  // Submit mismatched passwords so app-level validation fails and the handler
  // redirects back to the reset page, re-encoding the token into the URL.
  await fillInput(page, 'new-password-input', 'password123')
  await fillInput(page, 'confirm-password-input', 'different123')
  await clickLink(page, 'reset-password-action')

  await verifyOnResetPasswordPage(page)
  await verifyAlert(page, 'Passwords do not match. Please try again.')

  // The token must round-trip exactly. If it were not encoded, parsing the URL
  // would drop or truncate the token at the `&`/`#` boundaries.
  const url = new URL(page.url())
  expect(url.pathname).toBe('/auth/reset-password')
  expect(url.searchParams.get('token')).toBe(RESERVED_TOKEN)
})
