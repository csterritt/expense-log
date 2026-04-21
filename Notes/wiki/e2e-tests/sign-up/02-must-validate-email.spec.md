# 02-must-validate-email.spec.ts

**Source:** `e2e-tests/sign-up/02-must-validate-email.spec.ts`

## Purpose

Verifies that a newly registered user cannot sign in before verifying their email.

## Test case

- Uses `testWithDatabase` and `skipIfNotMode('OPEN_SIGN_UP')`
- Signs up with new credentials
- Redirected to await-verification page
- Navigates to sign-in and attempts to sign in with unverified credentials
- Verifies redirect to await-verification page with `'Please verify your email address before signing in.'` alert

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
