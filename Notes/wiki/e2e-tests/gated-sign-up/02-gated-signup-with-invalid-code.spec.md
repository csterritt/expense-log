# 02-gated-signup-with-invalid-code.spec.ts

**Source:** `e2e-tests/gated-sign-up/02-gated-signup-with-invalid-code.spec.ts`

## Purpose

Verifies that invalid, missing, empty, and already-consumed single-use codes are rejected.

## Test cases

- `shows error for invalid sign-up code` — `INVALID-CODE-999` → `Invalid or expired sign-up code`
- `shows error for missing sign-up code` — empty code → `Sign-up code must be at least 8 characters long`
- `shows error for empty/whitespace-only sign-up code` — `   ` → `Sign-up code must be at least 8 characters long`
- `cannot reuse consumed sign-up code` — first sign-up succeeds, second with same code fails

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
