# 01-gated-signup-with-valid-code.spec.ts

**Source:** `e2e-tests/gated-sign-up/01-gated-signup-with-valid-code.spec.ts`

## Purpose

Verifies successful gated sign-up with a valid single-use code and proper handling of duplicate email.

## Test cases

- `can sign up with valid gated code and creates account` — uses `completeGatedSignUpFlow`
- `handles duplicate email properly for gated sign-up` — uses `testDuplicateGatedSignUpFlow`

## Cross-references

- [workflow-helpers.md](../../support/workflow-helpers.md) — `completeGatedSignUpFlow`, `testDuplicateGatedSignUpFlow`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
