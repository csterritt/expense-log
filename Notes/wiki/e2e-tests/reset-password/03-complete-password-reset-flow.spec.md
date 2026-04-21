# 03-complete-password-reset-flow.spec.ts

**Source:** `e2e-tests/reset-password/03-complete-password-reset-flow.spec.ts`

## Purpose

End-to-end password reset flow using Mailpit to read the reset email, extract the link, set a new password, and verify sign-in.

## Test cases

- `complete password reset flow with email verification` — requests reset, reads email from Mailpit, extracts reset link, sets new password, signs in with new password, verifies old password no longer works

## Helpers

- `getLatestEmailFromMailpit()` — fetches latest email from `http://localhost:8025/api/v1/message/latest`
- `clearAllEmailsFromMailpit()` — DELETE all messages from Mailpit
- `extractPasswordResetLink(htmlContent)` — regex extracts link containing `reset-password` or `token=`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
