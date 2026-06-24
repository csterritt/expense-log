# recurring-confirm-handler.spec.ts

**Source:** `tests/recurring-confirm-handler.spec.ts`

Tests for recurring-create confirmation handler hardening (Task 25 RED).

## Coverage

Mirrors `expense-confirm-handler.spec.ts` for the recurring-create confirmation route.

### HMAC signing utilities for recurring

Tests `signRecurringConfirmationPayload` / `verifyRecurringConfirmationPayload` from `src/lib/confirmation-hmac.ts`:
- Signs a recurring payload and verifies the same payload.
- Rejects verification when description, amount, tagId, category, recurrence, or anchorDate is tampered.
- Fails closed when the signing key is absent (`undefined`).
- Tag ordering is stable — signing with reordered `tagIds` verifies the same (canonicalisation sorts before hashing).

### createManyAndRecurring atomicity

Tests from `src/lib/db/expense-access.ts`:
- Leaves no tag or recurring rows when a tag name collides mid-batch.
- Leaves no category or recurring rows when a category name collides mid-batch.
- Creates recurring template with existing category and tags on success.
- Creates new category and new tags atomically with recurring template.

### createOrReuseTag / createOrReuseCategory

Re-asserted for the recurring confirm path (same helpers as expense confirm, tested with recurring context).

## In-memory test DB

Uses `bun:sqlite` with the recurring and `recurringTag` tables included.

## Cross-references

- [../src/lib/confirmation-hmac.md](../src/lib/confirmation-hmac.md) — signing utilities under test.
- [../src/lib/db/confirm-helpers.md](../src/lib/db/confirm-helpers.md) — race-tolerant helpers under test.
- [../src/lib/db/expense-access.md](../src/lib/db/expense-access.md) — `createManyAndRecurring`.
- [../src/db/schema.md](../src/db/schema.md) — schema constraints mirrored by the in-memory harness.
- [expense-confirm-handler.spec.md](expense-confirm-handler.spec.md) — companion expense confirm handler tests.

---

See [unit-tests.md](../unit-tests.md) for the full catalog.
