# 06-resend-email-rate-limiting.spec.ts

**Source:** `e2e-tests/sign-up/06-resend-email-rate-limiting.spec.ts`

## Purpose

Verifies rate limiting on the resend-verification email button from the first click (initial email counts as first send).

## Test case

- Uses `testWithDatabase` and `skipIfNotMode('OPEN_SIGN_UP')`
- Signs up with new credentials
- Verifies we are on await-verification page
- Clicks resend email button and verifies rate-limit message: `Please wait ... second ... before requesting another verification email`
- Clicks again immediately and still gets rate-limit message

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
