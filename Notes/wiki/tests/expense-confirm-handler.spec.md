# expense-confirm-handler.spec.ts

**Source:** `tests/expense-confirm-handler.spec.ts`

Tests for expense confirmation handler hardening (Task 22 RED).

## Coverage

### Schema assertions

- `tag.name` and `category.name` have global unique lowercase indexes backed by DB-level constraint (not app-only logic).
- Drizzle/meta snapshot assertions verify `category_name_lower_unique` and `tag_name_lower_unique` indexes exist and are unique.

### HMAC signing utilities

Tests `signConfirmationPayload` / `verifyConfirmationPayload` from `src/lib/confirmation-hmac.ts`:
- Signs a payload and verifies the same payload.
- Rejects verification when description, amount, tagId, or category is tampered.
- Fails closed when the signing key is absent (`undefined`).

### createOrReuseTag

Tests race-tolerant reuse from `src/lib/db/confirm-helpers.ts`:
- Creates a new tag when the name does not exist.
- Silently reuses an existing tag on race collision.
- Reuse is case-insensitive (`"Travel"` reuses existing `"travel"`).

### createOrReuseCategory

- Creates a new category when the name does not exist.
- Silently reuses an existing category on race collision.
- Reuse is case-insensitive (`"Groceries"` reuses existing `"groceries"`).

### createManyAndExpense atomicity

- Leaves no tag or expense rows when a tag name collides mid-batch.
- Leaves no category or expense rows when a category name collides mid-batch.

## In-memory test DB

Mirrors the schema used in `expense-access.spec.ts` with `bun:sqlite`, including the lowercase unique indexes.

## Cross-references

- [../src/lib/confirmation-hmac.md](../src/lib/confirmation-hmac.md) — signing utilities under test.
- [../src/lib/db/confirm-helpers.md](../src/lib/db/confirm-helpers.md) — race-tolerant helpers under test.
- [../src/lib/db/expense-access.md](../src/lib/db/expense-access.md) — `createManyAndExpense`.
- [../src/db/schema.md](../src/db/schema.md) — schema constraints mirrored by the in-memory harness.

---

See [unit-tests.md](../unit-tests.md) for the full catalog.
