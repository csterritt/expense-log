# 13-tag-management.spec.ts

**Source:** `e2e-tests/expenses/13-tag-management.spec.ts`

## Purpose

Playwright coverage for the Issue 10 `/tags` management page. The spec exercises the no-JavaScript form flows for creating tags, duplicate validation, renaming, merge-on-rename collision confirmation, canceling a merge, and deleting tags (blocked and success).

## Setup

- Uses `testWithDatabase` for per-test database isolation.
- Signs in with `TEST_USERS.KNOWN_USER`, then navigates to `http://localhost:3000/tags`.
- Uses `seedTags` and `seedExpenses` support helpers where pre-existing tags or referenced expenses are needed.
- Disables JavaScript for the suite so real form POST/redirect behavior is tested.
- Local `tagNameMax = 25` mirrors the test-mode constant offset used to exceed the production limit.

## Test cases

- `creates lowercase tags and shows duplicate validation without adding a row` — creates `Travel`, verifies the row is `travel`, then attempts `TRAVEL` and expects a field-level uniqueness error (`tag-create-name-error`) with no duplicate row.
- `shows create validation while preserving over-limit input` — submits `tagNameMax + 1` characters, verifies the field error is visible and the sticky input value is preserved, and checks no tag row was created.
- `renames a tag to a lowercase normalized name` — seeds `travel`, renames to `Trips`, and verifies the row becomes `trips` with `travel` removed.
- `confirms rename collision merge and repoints source expenses` — seeds an expense tagged `travel` and another tagged `trips`; renames `travel` to `TRIPS`, verifies the merge confirmation page (`tag-merge-confirm-page`, `merge-source-name`, `merge-target-name`, `merge-expense-count` containing `All 1 expenses`), confirms, and verifies `travel` is removed and `trips` remains with one row.
- `canceling rename collision merge leaves tags unchanged` — seeds `travel` and `trips`, triggers merge confirmation, cancels, and verifies both tags still exist.
- `blocks deleting referenced tags with a count and deletes unreferenced tags` — seeds two expenses tagged `travel` and a separate `dining` tag; deleting `travel` shows an alert containing `2 expenses reference` and leaves the row; deleting `dining` succeeds and removes the row while `travel` remains.

## Cross-references

- [../../src/routes/build-tags.md](../../src/routes/build-tags.md) — route and UI under test.
- [../../src/lib/db/expense-access.md](../../src/lib/db/expense-access.md) — repository helpers invoked by the route.
- [../../tests/expense-access.spec.md](../../tests/expense-access.spec.md) — unit-level repository coverage.
- [../../tests/expense-validators.spec.md](../../tests/expense-validators.spec.md) — unit-level validator coverage.

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
