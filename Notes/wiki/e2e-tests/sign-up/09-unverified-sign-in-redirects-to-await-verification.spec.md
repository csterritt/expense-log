# 09-unverified-sign-in-redirects-to-await-verification.spec.ts

**Source:** `e2e-tests/sign-up/09-unverified-sign-in-redirects-to-await-verification.spec.ts`

## Purpose

Verifies that an unverified user who tries to sign in is redirected to the await-verification page.

## Test case

- Uses `testWithDatabase` and `skipIfNotMode('OPEN_SIGN_UP')`
- Signs up with new credentials (unverified)
- Navigates to sign-in and attempts to sign in with same credentials
- Verifies redirect to await-verification page with alert: `'Please verify your email address before signing in. Check your email for a verification link.'`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
