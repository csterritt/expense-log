# 05-password-reset-navigation.spec.ts

**Source:** `e2e-tests/reset-password/05-password-reset-navigation.spec.ts`

## Purpose

Verifies navigation and page content within the reset password flow.

## Test cases

- `waiting for reset page has correct navigation options` — direct access without email cookie redirects to forgot-password
- `reset password page navigation works correctly` — back-to-sign-in-from-reset navigates to sign-in
- `can access forgot password page directly` — verifies title and form elements
- `reset password page shows correct content with token` — verifies "Set New Password" title, input fields, and hidden token field value

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
