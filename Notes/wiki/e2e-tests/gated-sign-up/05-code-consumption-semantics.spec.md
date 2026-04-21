# 05-code-consumption-semantics.spec.ts

**Source:** `e2e-tests/gated-sign-up/05-code-consumption-semantics.spec.ts`

## Purpose

Ensures single-use codes are consumed/invalidated after use and that code validation works correctly.

## Test cases

- `valid code can be used to create an account` — uses `completeGatedSignUpFlow`
- `same code cannot be reused for another account` — signs up with code, then attempts second sign-up with same code; verifies `Invalid or expired sign-up code`
- `used code is marked as consumed in database` — uses `checkCodeExists` to verify code status

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
