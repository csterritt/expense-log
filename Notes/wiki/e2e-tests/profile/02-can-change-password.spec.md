# 02-can-change-password.spec.ts

**Source:** `e2e-tests/profile/02-can-change-password.spec.ts`

## Purpose

Verifies the password change flow end-to-end including validation errors.

## Test cases

- `can successfully change password` — changes password, signs in with new password, verifies old password no longer works
- `shows error when current password is incorrect` — submits wrong current password → `Current password is incorrect`
- `shows error when new passwords do not match` — mismatched confirm password → `New passwords do not match`
- `shows error when new password is too short` — short new password → `Password must be at least 8 characters long`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
