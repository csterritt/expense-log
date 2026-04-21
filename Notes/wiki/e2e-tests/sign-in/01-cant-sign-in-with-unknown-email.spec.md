# 01-cant-sign-in-with-unknown-email.spec.ts

**Source:** `e2e-tests/sign-in/01-cant-sign-in-with-unknown-email.spec.ts`

## Purpose

Verifies that signing in with an unknown email fails and shows an error message.

## Test case

- Navigates to home, clicks sign-in
- Fills `nonexistent@example.com` / `testpassword123`
- Submits and verifies we remain on the sign-in page
- Verifies alert: `'Invalid email or password. Please check your credentials and try again.'`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
