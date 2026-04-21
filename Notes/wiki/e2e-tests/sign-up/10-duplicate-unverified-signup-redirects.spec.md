# 10-duplicate-unverified-signup-redirects.spec.ts

**Source:** `e2e-tests/sign-up/10-duplicate-unverified-signup-redirects.spec.ts`

## Purpose

Verifies that attempting to sign up with an already-registered but unverified email redirects to await-verification with a duplicate email message.

## Test case

- Uses `testWithDatabase` and `skipIfNotMode('OPEN_SIGN_UP')`
- Signs up with new credentials (unverified)
- Attempts sign-up again with same email but different name/password
- Verifies redirect to await-verification page with alert: `'An account with this email already exists. Please check your email for a verification link or sign in if you have already verified your account.'`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
