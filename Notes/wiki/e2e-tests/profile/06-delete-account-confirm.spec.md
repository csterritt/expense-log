# 06-delete-account-confirm.spec.ts

**Source:** `e2e-tests/profile/06-delete-account-confirm.spec.ts`

## Purpose

Verifies that confirming account deletion permanently removes the account.

## Test cases

- `can delete account and cannot sign in with deleted credentials` — confirms deletion, verifies redirect to sign-in with success message, then sign-in with old credentials fails
- `delete confirmation page shows warning message` — verifies "Are you absolutely sure?" and "This action cannot be undone" text is present

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
