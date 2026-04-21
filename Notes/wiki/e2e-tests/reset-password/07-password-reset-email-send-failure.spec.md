# 07-password-reset-email-send-failure.spec.ts

**Source:** `e2e-tests/reset-password/07-password-reset-email-send-failure.spec.ts`

## Purpose

Verifies graceful handling when the email send fails in the background, preventing timing attacks and enumeration.

## Test case

- `redirects to waiting page even when email send fails in background` — sets invalid SMTP config via `/test/set-smtp-config`, submits forgot-password form, still redirects to waiting-for-reset page; resets SMTP config afterward

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
