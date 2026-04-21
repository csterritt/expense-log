# 07-cannot-access-await-verification-without-email-cookie.spec.ts

**Source:** `e2e-tests/sign-up/07-cannot-access-await-verification-without-email-cookie.spec.ts`

## Purpose

Verifies that direct access to `/auth/await-verification` without an email cookie redirects to the sign-in page.

## Test case

- `cannot access await verification page without email cookie` — navigates directly to `/auth/await-verification`, verifies redirect to sign-in page

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
