# confirmation-hmac.ts

HMAC-SHA-256 signing utilities for expense and recurring confirmation payloads.

## Overview

Produces a hex signature over the canonical JSON representation of a confirmation payload. The caller stores the signature in a hidden form field and the confirm handler verifies it before any further processing.

Fail-closed: `verifyConfirmationPayload` returns `false` whenever the signing key is absent or the crypto operation fails.

## Exports

### `ConfirmationPayload`

The fields covered by the HMAC signature on the expense confirmation page:
- `description: string`
- `amount: string`
- `date: string`
- `category: string`
- `tagIds: string[]`
- `newTags: string`

### `RecurringConfirmationPayload`

The fields covered by the HMAC signature on the recurring confirmation page. Uses `recurrence` and `anchorDate` instead of `date`:
- `description: string`
- `amount: string`
- `recurrence: string`
- `anchorDate: string`
- `category: string`
- `tagIds: string[]`
- `newTags: string`

### `signConfirmationPayload(payload, key)`

Signs a `ConfirmationPayload` with HMAC-SHA-256 and returns a hex string. The key is typically the `CONFIRMATION_SIGNING_KEY` Worker secret.

### `verifyConfirmationPayload(payload, signature, key)`

Verifies that `signature` was produced by `signConfirmationPayload` over `payload` with `key`. Returns `false` when the key is absent or any crypto operation throws — fail-closed by design.

### `signRecurringConfirmationPayload(payload, key)`

Signs a `RecurringConfirmationPayload` with HMAC-SHA-256 and returns a hex string.

### `verifyRecurringConfirmationPayload(payload, signature, key)`

Verifies a recurring confirmation payload signature. Returns `false` on missing key or crypto failure.

## Implementation notes

- Canonicalisation sorts `tagIds` before serialisation so tag ordering is stable.
- Verification uses a constant-time string comparison to avoid timing attacks.
- Uses `crypto.subtle.importKey`, `crypto.subtle.sign`, and `crypto.subtle.verify` via the Web Crypto API.

## Cross-references

- See [expense-confirm-post-handler.ts](../routes/expenses/expense-confirm-post-handler.md) and [build-edit-expense.tsx](../routes/expenses/build-edit-expense.md) for consumers of the expense signing utilities.
- See [build-create-recurring.tsx](../routes/recurring/build-create-recurring.md) and [build-edit-recurring.tsx](../routes/recurring/build-edit-recurring.md) for consumers of the recurring signing utilities.
- See [expense-confirm-handler.spec.ts](../../../tests/expense-confirm-handler.spec.md), [recurring-confirm-handler.spec.ts](../../../tests/recurring-confirm-handler.spec.md), and [recurring-edit-confirm-handler.spec.ts](../../../tests/recurring-edit-confirm-handler.spec.md) for tests.
