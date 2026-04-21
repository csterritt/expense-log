# 03-sign-in-page-has-no-signup-link.spec.ts

**Source:** `e2e-tests/no-sign-up/03-sign-in-page-has-no-signup-link.spec.ts`

## Purpose

Verifies that the sign-in page hides all sign-up-related UI when in `NO_SIGN_UP` mode.

## Test cases

- `sign-in page does not contain "Create Account" button` — `go-to-sign-up-action` count is 0
- `sign-in page does not contain any links to sign-up` — no `a[href="/auth/sign-up"]` elements
- `sign-in page does not contain "New user?" divider text` — "New user?" text is absent
- `sign-in page still contains forgot password link` — forgot-password-action is still present

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
