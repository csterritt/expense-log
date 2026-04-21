# 06-password-reset-rate-limiting.spec.ts

**Source:** `e2e-tests/reset-password/06-password-reset-rate-limiting.spec.ts`

## Purpose

Verifies rate limiting on password reset requests and enumeration resistance.

## Test cases

- `enforces rate limiting for password reset requests` — first request succeeds, immediate second request shows rate-limit message with wait time
- `allows password reset after rate limit period expires` — waits 4 seconds, second request succeeds
- `rate limiting works for non-existent emails without revealing user existence` — non-existent email still redirects to waiting page, no enumeration leak

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
