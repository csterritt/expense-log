# 09-edit-expense.spec.ts

**Source:** `e2e-tests/expenses/09-edit-expense.spec.ts`

## Purpose

Issue 08 spec covering the all-existing edit-save flow (no new categories or tags). Pinned to `javaScriptEnabled: false` so the chip picker / combobox don't transform inputs — the no-JS server flow is the source of truth for edit semantics.

## Test cases

1. **Edit page pre-populates every field** — seeds an expense with two tags, clicks `expense-row-edit`, asserts the URL matches `/expenses/:id/edit` and every form field's `value` matches the seeded row (description, amount as plain decimal via `formatCentsPlain`, today's ET date, category name, alphabetised tags CSV). Asserts `expense-form-save` button is visible.
2. **Changing the amount saves and shows the updated row** — fills `12.34` and submits; asserts redirect to `/expenses` and the row's `expense-row-amount` is now `12.34` while every other field is unchanged.
3. **Changing description and date saves both fields** — fills a new description and a recent date (within the default 2-month range so the row is visible) and submits; asserts the row updates on `/expenses`.
4. **Unknown id redirects** — visits `/expenses/no-such-id/edit`; asserts a redirect to `/expenses` and that no edit page is rendered.

## Cross-references

- [../../src/routes/expenses/build-edit-expense.md](../../src/routes/expenses/build-edit-expense.md) — routes under test.
- [../../src/routes/expenses/expense-form.md](../../src/routes/expenses/expense-form.md) — shared form renderer.
- [../support/db-helpers.md](../support/db-helpers.md) — `seedExpenses`.
