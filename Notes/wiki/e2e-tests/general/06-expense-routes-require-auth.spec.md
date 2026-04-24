# 06-expense-routes-require-auth.spec.ts

**Source:** `e2e-tests/general/06-expense-routes-require-auth.spec.ts`

## Purpose

Verifies that all expense feature routes redirect unauthenticated visitors to the sign-in page with the standard "must sign in" alert.

## Test cases

Iterates over each path in `['/expenses', '/categories', '/tags', '/summary', '/recurring']`:

- Navigates directly to the path while signed out
- Asserts the URL contains `/auth/sign-in`
- Verifies the sign-in page banner is present
- Verifies the alert `ERROR_MESSAGES.MUST_SIGN_IN` (`'You must sign in to visit that page'`) is shown

## Cross-references

- [../support/test-data.md](../support/test-data.md) — `BASE_URLS`, `ERROR_MESSAGES`
- [../support/page-verifiers.md](../support/page-verifiers.md) — `verifyOnSignInPage`
- [../support/finders.md](../support/finders.md) — `verifyAlert`
- [../../src/middleware/signed-in-access.md](../../src/middleware/signed-in-access.md) — middleware enforcing the redirect

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
