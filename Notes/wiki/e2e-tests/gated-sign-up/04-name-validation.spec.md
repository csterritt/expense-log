# 04-name-validation.spec.ts

**Source:** `e2e-tests/gated-sign-up/04-name-validation.spec.ts`

## Purpose

Validates name field restrictions on the gated sign-up form.

## Test cases

- `rejects names with special characters` — `<script>alert("xss")</script>` → `ERROR_MESSAGES.INVALID_NAME_CHARACTERS`
- `rejects name with @ symbol` — `User@Name` → `ERROR_MESSAGES.INVALID_NAME_CHARACTERS`
- `rejects name with punctuation marks` — `User!Name` → `ERROR_MESSAGES.INVALID_NAME_CHARACTERS`
- `accepts valid name with letters and spaces` — `John Doe` succeeds (redirects away from `/auth/sign-up`)
- `accepts valid name with hyphens and underscores` — `Test-User_123` succeeds (redirects away from `/auth/sign-up`)

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
