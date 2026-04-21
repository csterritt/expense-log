# 01-can-join-waitlist-with-valid-email.spec.ts

**Source:** `e2e-tests/interest-sign-up/01-can-join-waitlist-with-valid-email.spec.ts`

## Purpose

Verifies successful waitlist sign-up and duplicate email handling.

## Test cases

- `can join waitlist with valid email and get success message` — uses `completeInterestSignUpFlow`
- `shows friendly message when email is already on waitlist` — uses `testDuplicateInterestSignUpFlow`

## Cross-references

- [workflow-helpers.md](../../support/workflow-helpers.md) — `completeInterestSignUpFlow`, `testDuplicateInterestSignUpFlow`

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
