# 04-name-validation.spec.ts

**Source:** `e2e-tests/gated-sign-up/04-name-validation.spec.ts`

## Purpose

Validates name field restrictions on the gated sign-up form.

## Test cases

- `shows error for empty name` — verifies `Name is required`
- `shows error for name with invalid characters` — verifies name characters must match `/^[a-zA-Z0-9_\- ]+$/`
- `shows error for name exceeding max length` — verifies max length limit
- `accepts valid names with various characters` — underscores, hyphens, and spaces are allowed

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
