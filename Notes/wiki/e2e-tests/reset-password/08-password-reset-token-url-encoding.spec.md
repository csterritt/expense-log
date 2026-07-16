# 08-password-reset-token-url-encoding.spec.ts

**Source:** `e2e-tests/reset-password/08-password-reset-token-url-encoding.spec.ts`

## Purpose

End-to-end test verifying that password reset tokens containing URL-reserved characters (`&`, `#`, `=`, spaces) are encoded and decoded correctly when reflected back into the redirect URL.

## Setup

- `RESERVED_TOKEN = 'abc&def#ghi=jkl mno'` — a token that would corrupt a query string if not URL-encoded.
- Uses helpers from `../support/finders` and `../support/page-verifiers`.

## Test cases

- `reflects the reset token into the redirect URL with proper encoding`
  - Lands on `/auth/reset-password?token=${encodeURIComponent(RESERVED_TOKEN)}`.
  - Verifies the reset password page is rendered.
  - Submits mismatched passwords so app-level validation fails and the handler redirects back.
  - Asserts the redirect target is `/auth/reset-password` and the page still shows the reset form.
  - Verifies the `token` query parameter round-trips exactly to the original reserved value.

## Cross-references

- [../../../src/routes/auth/handle-reset-password.md](../../../src/routes/auth/handle-reset-password.md) — handler that consumes and re-encodes the reset token.
- [../support/finders.md](../support/finders.md) — `fillInput`, `clickLink`, `verifyAlert` helpers.
- [../support/page-verifiers.md](../support/page-verifiers.md) — `verifyOnResetPasswordPage` helper.

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
