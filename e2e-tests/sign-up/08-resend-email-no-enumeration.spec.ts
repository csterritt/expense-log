import { test, expect } from '@playwright/test'

import { testWithDatabase } from '../support/test-helpers'
import { skipIfNotMode } from '../support/mode-helpers'
import { navigateToSignUp, navigateToSignIn } from '../support/navigation-helpers'
import { submitSignUpForm } from '../support/form-helpers'
import { SERVER_BASE_URL, TEST_USERS } from '../support/test-data'

interface ResendResponse {
  status: number
  location: string
  setCookie: string
}

const postResendEmail = async (email: string): Promise<ResendResponse> => {
  const formData = new FormData()
  formData.append('email', email)
  const response = await fetch(`${SERVER_BASE_URL}/auth/resend-email`, {
    method: 'POST',
    body: formData,
    redirect: 'manual',
  })
  return {
    status: response.status,
    location: response.headers.get('location') || '',
    setCookie: response.headers.get('set-cookie') || '',
  }
}

test(
  'resend email does not reveal account existence or verification status',
  testWithDatabase(async ({ page }) => {
    await skipIfNotMode('OPEN_SIGN_UP')

    const unverifiedEmail = 'enum-unverified@example.com'
    const verifiedEmail = TEST_USERS.KNOWN_USER.email
    const unknownEmail = 'enum-unknown@example.com'

    await navigateToSignUp(page)
    await submitSignUpForm(page, {
      name: 'Enum Test',
      email: unverifiedEmail,
      password: 'securepassword123',
    })

    await page.waitForTimeout(4000)

    const [unverifiedRes, verifiedRes, unknownRes] = await Promise.all([
      postResendEmail(unverifiedEmail),
      postResendEmail(verifiedEmail),
      postResendEmail(unknownEmail),
    ])

    expect(unverifiedRes.status).toBe(303)
    expect(verifiedRes.status).toBe(303)
    expect(unknownRes.status).toBe(303)

    expect(unverifiedRes.location).toContain('/auth/await-verification')
    expect(verifiedRes.location).toContain('/auth/await-verification')
    expect(unknownRes.location).toContain('/auth/await-verification')

    expect(verifiedRes.location).not.toContain('/auth/sign-in')

    expect(unverifiedRes.setCookie).toContain('A new verification email has been sent')
    expect(verifiedRes.setCookie).toContain('A new verification email has been sent')
    expect(unknownRes.setCookie).toContain('A new verification email has been sent')

    expect(verifiedRes.setCookie).not.toContain('already verified')
  }),
)
