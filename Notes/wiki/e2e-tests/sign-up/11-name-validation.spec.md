# 11-name-validation.spec.ts

**Source:** `e2e-tests/sign-up/11-name-validation.spec.ts`

## Purpose

Verifies name field validation rules on the open sign-up form.

## Test cases

- `rejects names with special characters` — `<script>alert("xss")</script>` → `Invalid name characters` error
- `rejects name with @ symbol` — `User@Name` → `Invalid name characters`
- `rejects name with punctuation marks` — `User!Name` → `Invalid name characters`
- `accepts valid name with letters and spaces` — `John Doe` accepted
- `accepts valid name with hyphens` — `Jane-Doe` accepted
- `accepts valid name with underscores` — `User_Name` accepted
- `accepts valid name with numbers` — `User123` accepted

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
