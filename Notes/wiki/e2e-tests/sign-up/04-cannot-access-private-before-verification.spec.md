# 04-cannot-access-private-before-verification.spec.ts

**Source:** `e2e-tests/sign-up/04-cannot-access-private-before-verification.spec.ts`

## Purpose

Verifies that unverified users cannot access `/expenses` even if they know the URL, and that attempting to sign in without verification fails. (The spec filename retains "private" for historical reasons; the actual route under test is `/expenses`.)

## Test case

- Uses `testWithDatabase` and `skipIfNotMode('OPEN_SIGN_UP')`
- Signs up with new credentials, redirected to await-verification
- Directly navigates to `BASE_URLS.EXPENSES` and is redirected to sign-in with `'You must sign in to visit that page'`
- Attempts to sign in with unverified credentials
- Redirected to await-verification with `'Please verify your email address before signing in.'`
- Tries `/expenses` again and is still blocked

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
