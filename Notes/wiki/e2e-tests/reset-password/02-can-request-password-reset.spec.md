# 02-can-request-password-reset.spec.ts

**Source:** `e2e-tests/reset-password/02-can-request-password-reset.spec.ts`

## Purpose

Verifies password reset request flow including enumeration resistance.

## Test cases

- `can request password reset with valid email` — uses `completeForgotPasswordFlow`, verifies redirect to `/auth/waiting-for-reset`
- `shows same message for non-existent email (prevents enumeration)` — nonexistent email still redirects to waiting page with identical message
- `shows error for invalid email format` — `not-an-email` → `Please enter a valid email address`
- `shows error for empty email` — empty submission → `Please enter a valid email address`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
