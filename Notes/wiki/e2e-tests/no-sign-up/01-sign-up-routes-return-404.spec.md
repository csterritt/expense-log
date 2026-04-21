# 01-sign-up-routes-return-404.spec.ts

**Source:** `e2e-tests/no-sign-up/01-sign-up-routes-return-404.spec.ts`

## Purpose

Verifies that sign-up-related routes return 404 page content in `NO_SIGN_UP` mode.

## Test cases

- `visiting /auth/sign-up returns 404`
- `visiting /auth/interest-sign-up returns 404`
- `visiting /auth/await-verification returns 404`
- `visiting /auth/resend-email returns 404`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
