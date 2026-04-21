# 05-sign-out-successfully.spec.ts

**Source:** `e2e-tests/sign-in/05-sign-out-successfully.spec.ts`

## Purpose

Verifies the complete sign-out flow: sign in, sign out, verify redirect, and confirm the session is cleared.

## Test case

- Uses `testWithDatabase`
- Signs in with `TEST_USERS.KNOWN_USER`
- Clicks sign-out and verifies redirect to sign-out success page
- Clicks home button and verifies landing on startup page
- Tries to access `/private` again and is redirected to sign-in with `'You must sign in to visit that page'`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
