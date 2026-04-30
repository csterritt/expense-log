# 10-edit-with-new-items.spec.ts

**Source:** `e2e-tests/expenses/10-edit-with-new-items.spec.ts`

## Purpose

Issue 08 spec covering the consolidated *Confirm new items* flow on the edit path (`mode='edit'`). Pinned to `javaScriptEnabled: false`.

## Test cases

1. **Adding a brand-new tag routes through confirmation and saves on confirm** — appends `rent` to the tags CSV; asserts `confirm-edit-new-page` is rendered, lists exactly one `Create tag 'rent'` line and no category line, and previews the alphabetised final tags. Click `confirm-edit-new-confirm`; asserts redirect to `/expenses` and the row's `expense-row-tags` now reads `groceries, rent`.
2. **Cancel preserves typed values and makes no DB changes** — fills a brand-new category and a brand-new tag; asserts the confirmation page lists both `Create category` and `Create tag` lines; clicks `confirm-edit-new-cancel`; asserts redirect back to `/expenses/:id/edit` with every typed `value` preserved (`description`, `amount`, `category`, `tags` all match what was typed). Reloads `/expenses` to confirm the row's category and tags are unchanged.
3. **Brand-new category + new tag lists every new name and saves on confirm** — fills `Beverages` (new) and `caffeine` (new); asserts both lines appear on `confirm-edit-new-page`; clicks `confirm-edit-new-confirm`; asserts the row's category becomes `beverages` and tags becomes `caffeine`.

## Cross-references

- [../../src/routes/expenses/build-edit-expense.md](../../src/routes/expenses/build-edit-expense.md) — `POST /expenses/:id/edit` and `POST /expenses/:id/confirm-edit-new`.
- [../../src/routes/expenses/expense-form.md](../../src/routes/expenses/expense-form.md) — `renderConfirmNewItems({ mode: 'edit' })`.
- [../../src/lib/db/expense-access.md](../../src/lib/db/expense-access.md) — `updateManyAndExpense`.
- [05-tags-and-inline-creation.spec.md](05-tags-and-inline-creation.spec.md) — sister spec on the create flow.
