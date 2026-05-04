# 12-category-management.spec.ts

**Source:** `e2e-tests/expenses/12-category-management.spec.ts`

## Purpose

Playwright coverage for the Issue 09 `/categories` management page. The spec exercises the no-JavaScript form flows for creating categories, duplicate validation, renaming, merge-on-rename collision confirmation, canceling a merge, and deleting categories.

## Setup

- Uses `testWithDatabase` for per-test database isolation.
- Signs in with `TEST_USERS.KNOWN_USER`, then navigates to `http://localhost:3000/categories`.
- Uses `seedCategories` and `seedExpenses` support helpers where pre-existing categories or referenced expenses are needed.
- Disables JavaScript for the suite so real form POST/redirect behavior is tested.

## Test cases

- `creates lowercase categories and shows duplicate validation without adding a row` — creates `Food`, verifies the row is `food`, then attempts `FOOD` and expects a field-level uniqueness error with no duplicate row.
- `shows create validation while preserving over-limit input` — submits `categoryNameMax + 1` characters and verifies the field error plus sticky input value.
- `renames a category to a lowercase normalized name` — renames `food` to `Groceries` and verifies the row becomes `groceries`.
- `confirms rename collision merge and repoints source expenses` — renames `food` to existing `groceries`, verifies the merge confirmation page (`All 1 expenses will be reassigned`), confirms, and then verifies expenses now all show the target category.
- `canceling rename collision merge leaves categories unchanged` — exercises the cancel branch from the merge confirmation page.
- `blocks deleting referenced categories with a count and deletes unreferenced categories` — verifies delete is blocked with a reference count for `food`, then succeeds for unreferenced `utilities`.

## Cross-references

- [../../src/routes/build-categories.md](../../src/routes/build-categories.md) — route and UI under test.
- [../../src/lib/db/expense-access.md](../../src/lib/db/expense-access.md) — repository helpers invoked by the route.
- [../../tests/expense-access.spec.md](../../tests/expense-access.spec.md) — unit-level repository coverage.
- [../../tests/expense-validators.spec.md](../../tests/expense-validators.spec.md) — unit-level validator coverage.

---

See [e2e-tests.md](../../e2e-tests.md) for the full catalog.
