# src/lib/confirmation-hmac.ts

HMAC-SHA-256 signing utilities for expense and recurring confirmation payloads. Prevents hidden form field tampering on confirmation pages.

## Types

### ConfirmationPayload

Fields covered by the HMAC signature for expense confirmations: `description`, `amount`, `date`, `category`, `tagIds[]`, `newTags`.

### RecurringConfirmationPayload

Fields covered by the HMAC signature for recurring confirmations: `description`, `amount`, `recurrence`, `anchorDate`, `category`, `tagIds[]`, `newTags`.

## Functions

### signConfirmationPayload(payload, key): Promise\<string\>

Canonicalizes the payload (sorts tagIds), JSON-stringifies, signs with HMAC-SHA-256, returns hex string.

### verifyConfirmationPayload(payload, signature, key): Promise\<boolean\>

Verifies signature against payload. Fail-closed: returns `false` if key is absent or any crypto operation throws. Uses constant-time comparison to prevent timing attacks.

### signRecurringConfirmationPayload(payload, key): Promise\<string\>

Same as above for `RecurringConfirmationPayload`.

### verifyRecurringConfirmationPayload(payload, signature, key): Promise\<boolean\>

Same as above for `RecurringConfirmationPayload`.

## Security

- Canonicalization sorts `tagIds` for deterministic serialization
- Constant-time signature comparison prevents timing attacks
- Fail-closed: missing key or crypto error → `false`
- Uses Web Crypto API (`crypto.subtle`)
