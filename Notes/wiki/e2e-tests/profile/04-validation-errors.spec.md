# 04-validation-errors.spec.ts

**Source:** `e2e-tests/profile/04-validation-errors.spec.ts`

## Purpose

Verifies validation errors on the profile change-password form.

## Test cases

- `shows error when current password is empty` — fills only new passwords → `Current password is required`
- `shows error when new password is empty` — fills only current password → `Password must be at least 8 characters long`
- `shows error when confirm password is empty` — fills current and new but not confirm → `Password must be at least 8 characters long`
- `accepts empty user info field` — change password succeeds when user-info field is empty

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
