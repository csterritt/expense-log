# recurring-edit-confirm-handler.spec.ts

**Source:** `tests/recurring-edit-confirm-handler.spec.ts`

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

- [../src/lib/confirmation-hmac.md](../src/lib/confirmation-hmac.md) — signing utilities under test.
- [../src/lib/db/expense-access.md](../src/lib/db/expense-access.md) — `updateManyAndRecurring` and `updateRecurringWithTags`.
- [../src/db/schema.md](../src/db/schema.md) — schema constraints mirrored by the in-memory harness.
- [recurring-confirm-handler.spec.md](recurring-confirm-handler.spec.md) — create-path equivalent tests.

---

See [unit-tests.md](../unit-tests.md) for the full catalog.
