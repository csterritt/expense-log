# 03-can-validate-email.spec.ts

**Source:** `e2e-tests/sign-up/03-can-validate-email.spec.ts`

## Purpose

End-to-end email verification flow using Mailpit to read the verification email, extract the link, verify the email, and then sign in.

## Test case

- Uses `testWithDatabase` and `skipIfNotMode('OPEN_SIGN_UP')`
- Signs up with new credentials
- Reads the latest email from Mailpit (`http://localhost:8025/api/v1/message/latest`)
- Verifies email subject and recipient
- Extracts verification link from HTML content using regex
- Follows the verification link
- Verifies success message and redirect to sign-in page
- Signs in with verified credentials and confirms redirect to protected page

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
