# auth-validators.spec.ts

**Source:** `tests/auth-validators.spec.ts`

## Purpose

Unit coverage for security-sensitive auth form schemas in [`src/lib/validators.ts`](../src/lib/validators.md). Focuses on token and password length boundaries for the reset and change-password flows.

## Setup

- Uses `bun:test` (`describe` / `it`) and `node:assert`.
- Calls `validateRequest` with the relevant Valibot schema.

## Test cases

### `ResetPasswordFormSchema`

- `accepts a token at the 512-char maximum` — passes with a 512-character token and valid passwords.
- `rejects a token longer than 512 chars` — fails with an `Invalid reset token` error.
- `accepts a password at the 128-char maximum` — passes with 128-character new and confirm passwords.
- `rejects a password longer than 128 chars` — fails with an `at most 128` error.

### `ChangePasswordFormSchema`

- `accepts a new password at the 128-char maximum` — passes with 128-character new/confirm passwords and a current password.
- `rejects a new password longer than 128 chars` — fails with an `at most 128` error.

## Cross-references

- [../src/lib/validators.md](../src/lib/validators.md) — module under test; defines `ResetPasswordFormSchema`, `ChangePasswordFormSchema`, and `validateRequest`.

---

See [unit-tests.md](../unit-tests.md) for the full catalog.
