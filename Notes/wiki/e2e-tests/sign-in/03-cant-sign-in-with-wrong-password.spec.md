# 03-cant-sign-in-with-wrong-password.spec.ts

**Source:** `e2e-tests/sign-in/03-cant-sign-in-with-wrong-password.spec.ts`

## Purpose

Verifies that signing in with a known email but wrong password fails.

## Test case

- Uses `testWithDatabase` for DB isolation
- Navigates to home, clicks sign-in
- Fills `TEST_USERS.KNOWN_USER.email` with `'this-is-definitely-wrong-password'`
- Submits and verifies we remain on the sign-in page
- Verifies alert: `'Invalid email or password. Please check your credentials and try again.'`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
