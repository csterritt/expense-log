# 02-sign-up-post-requests-fail.spec.ts

**Source:** `e2e-tests/no-sign-up/02-sign-up-post-requests-fail.spec.ts`

## Purpose

Verifies that POST requests to sign-up endpoints are rejected in `NO_SIGN_UP` mode, returning the 404 page.

## Test cases

- `POST to /auth/sign-up returns 404-page` — POST to sign-up returns 200 with "Page Not Found" content
- `POST to /auth/resend-email returns 404-page` — POST to resend-email returns 200 with "Page Not Found" content

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
