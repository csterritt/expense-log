# 05-code-consumption-semantics.spec.ts

**Source:** `e2e-tests/gated-sign-up/05-code-consumption-semantics.spec.ts`

## Purpose

Ensures single-use codes are consumed/invalidated after use and that code validation works correctly.

## Test cases

- `code is consumed only after successful sign-up` — verifies code exists before sign-up via `checkCodeExists`, completes successful sign-up, verifies code is deleted afterward
- `code is NOT consumed when sign-up fails due to invalid email format` — invalid email fails validation, code still exists in DB afterward
- `code IS consumed when sign-up fails due to duplicate email (atomic claim)` — duplicate email redirects to await-verification (security: don't reveal email exists), but code is consumed because atomic claim happens before account creation attempt
- `user can retry with same code after validation failure` — short password fails, code still exists; second attempt with valid password succeeds, code consumed

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
