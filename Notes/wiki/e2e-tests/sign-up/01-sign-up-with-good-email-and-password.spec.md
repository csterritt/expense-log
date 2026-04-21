# 01-sign-up-with-good-email-and-password.spec.ts

**Source:** `e2e-tests/sign-up/01-sign-up-with-good-email-and-password.spec.ts`

## Purpose

Verifies the basic open sign-up flow succeeds and redirects to await-verification.

## Test case

- Uses `testWithDatabase` and `skipIfNotMode('OPEN_SIGN_UP')`
- Completes the entire sign-up flow with `TEST_USERS.NEW_USER`
- Verifies the URL contains `/auth/await-verification`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
