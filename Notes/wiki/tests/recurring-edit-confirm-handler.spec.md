# recurring-edit-confirm-handler.spec.ts

Tests for recurring-edit confirmation handler hardening (Task 28 RED).

## Coverage

Mirrors `recurring-confirm-handler.spec.ts` for the recurring-edit confirmation route.

### HMAC signing utilities for recurring edit

Re-asserted for the edit confirm path:
- Signs and verifies recurring-edit payloads.
- Rejects tampered description, amount, tagId, category, recurrence, and anchorDate.
- Fails closed when the signing key is absent.

### updateManyAndRecurring atomicity

Tests from `src/lib/db/expense-access.ts`:
- Leaves no new tag rows when a new tag name collides mid-batch.
- Leaves no new category rows when a new category name collides mid-batch.

### updateRecurringWithTags — pre-existing attachments

- Re-saving the same `tagIds` leaves all attachments intact.
- Re-saving with zero `tagIds` removes all attachments.

### updateRecurringWithTags — chip-off detaches tags atomically

- Supplying a subset of existing `tagIds` detaches the omitted tags.
- `updateManyAndRecurring` with empty `existingTagIds` removes all pre-existing links and attaches only newly created tags.
- `updateManyAndRecurring` atomically replaces the link set when deduplicating `existingTagIds`.

## In-memory test DB

Uses `bun:sqlite` with recurring and `recurringTag` tables. Includes `seedRecurring` helper to pre-populate templates with tag links.

## Cross-references

- See [confirmation-hmac.ts](../src/lib/confirmation-hmac.md) for the signing utilities under test.
- See [expense-access.ts](../src/lib/db/expense-access.md) for `updateManyAndRecurring` and `updateRecurringWithTags`.
- See [recurring-confirm-handler.spec.ts](recurring-confirm-handler.spec.md) for the create-path equivalent tests.
