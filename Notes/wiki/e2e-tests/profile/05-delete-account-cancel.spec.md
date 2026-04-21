# 05-delete-account-cancel.spec.ts

**Source:** `e2e-tests/profile/05-delete-account-cancel.spec.ts`

## Purpose

Verifies the account deletion cancellation flow and that the account remains usable.

## Test cases

- `can cancel delete account flow and return to profile` — clicks delete, clicks cancel, returns to profile page
- `can still sign out and sign back in after canceling delete` — cancels deletion, signs out, signs back in successfully
- `delete confirmation page requires authentication` — unauthenticated access redirects to sign-in
- `profile page shows delete account section` — delete account button is visible on profile page

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
