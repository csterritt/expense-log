# 04-test-secure-headers.spec.ts

**Source:** `e2e-tests/general/04-test-secure-headers.spec.ts`

## Purpose

Verifies security headers and CSRF protection are correctly configured.

## Test cases

- `server sets appropriate security headers on responses` — checks `referrer-policy`, `x-content-type-options`, `x-frame-options`, `x-xss-protection`
- `server rejects requests with invalid CSRF headers` — POST with invalid Origin → 403; no Origin → 403; valid Origin → not 403
- `security headers are consistent across different endpoints` — compares headers across `/` and `/auth/sign-in`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
