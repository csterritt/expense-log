# 02-can-sign-in-with-known-email.spec.ts

**Source:** `e2e-tests/sign-in/02-can-sign-in-with-known-email.spec.ts`

## Purpose

Verifies successful sign-in with seeded credentials and redirect to the protected page.

## Test case

- Uses `testWithDatabase` for DB isolation
- Navigates to home, clicks sign-in
- Fills `TEST_USERS.KNOWN_USER` credentials
- Submits and verifies `'Welcome! You have been signed in successfully.'` alert
- Verifies we are redirected to the protected (`/private`) page

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
