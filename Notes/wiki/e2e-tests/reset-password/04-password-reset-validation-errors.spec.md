# 04-password-reset-validation-errors.spec.ts

**Source:** `e2e-tests/reset-password/04-password-reset-validation-errors.spec.ts`

## Purpose

Verifies validation errors and invalid token handling on the reset password page.

## Test cases

- `shows invalid token page when no token provided` — `/auth/reset-password` without token → invalid-token page with "Invalid Reset Link"
- `shows validation errors for password reset form` — empty passwords → `Password must be at least 8 characters long`; mismatched passwords → `Passwords do not match`
- `handles invalid/expired token gracefully` — submits with invalid token → redirect to forgot-password with error
- `can navigate from invalid token page` — "Request New Reset Link" → `/auth/forgot-password`; "Back to Sign In" → `/auth/sign-in`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
