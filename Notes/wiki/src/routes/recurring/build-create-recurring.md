# build-create-recurring.tsx

**Source:** `src/routes/recurring/build-create-recurring.tsx`

## Purpose

Route builder for the recurring-template create flow (Issue 13). Mirrors the expense create flow: validates via `parseRecurringCreate`, resolves category/tags, routes through `renderConfirmNewItems(entity='recurring')` when new items are needed, then calls `createRecurringWithTags` or `createManyAndRecurring`.

## Export

### `buildCreateRecurring(app): void`

Registers three routes, all gated by `signedInAccess` and wrapped in `secureHeaders`:

- `GET /recurring/new` — loads categories and tags for the combobox/chip-picker payloads, reads any flash form-state, and renders the new-template page (`data-testid='recurring-new-page'`) with `renderRecurringForm({ mode: 'create' })`. Includes deferred `<script>` tags for `category-combobox.js` and `tag-chip-picker.js`.
- `POST /recurring` — parses the raw body, validates with `parseRecurringCreate` + `parseTagCsv`, and on failure round-trips via `redirectWithFormErrors` to `/recurring/new`. Looks up the category and tags. **All-existing path**: calls `createRecurringWithTags` and redirects to `/recurring` with success message. **Any-new path**: validates the new category name when applicable, then renders `renderConfirmNewItems({ mode: 'create', entity: 'recurring', action: '/recurring/confirm-create-new' })` with hidden `recurrence` and `anchorDate` inputs.
- `POST /recurring/confirm-create-new` — Cancel redirects back to `/recurring/new` preserving every typed value. Confirm defensively re-runs validation, re-resolves diffs, then calls `createManyAndRecurring` atomically. On collision it surfaces the error under `category` or `tags`. On success redirects to `/recurring` with `'Recurring template created.'`

### Internal helpers

- `emptyRecurringState(today)` — builds a default `RecurringFormState` with all fields blank and `anchorDate` defaulted to today.
- `readRawBody(c)` — parses the request body into `{ description, amount, category, tags, recurrence, anchorDate, action }` with string defaults.
- `computeNewItemsDiff(categoryLookup, tagLookup, loweredTagNames)` — splits tags into existing IDs and new names; flags whether the category is new.

## Cross-references

- [recurring-form.md](recurring-form.md) — shared form renderer.
- [../expenses/expense-form.md](../expenses/expense-form.md) — `renderConfirmNewItems` shared with expense flows.
- [../../lib/db/expense-access.md](../../lib/db/expense-access.md) — `createRecurringWithTags`, `createManyAndRecurring`, `findCategoryByName`, `findTagsByNames`.
- [../../lib/db/category-access.md](../../lib/db/category-access.md) — `listCategories`.
- [../../lib/db/tag-access.md](../../lib/db/tag-access.md) — `listTags`.
- [../../lib/expense-validators.md](../../lib/expense-validators.md) — `parseRecurringCreate`, `parseNewCategoryName`, `parseTagCsv`.
- [../../lib/form-state.md](../../lib/form-state.md) — `redirectWithFormErrors`, `readAndClearFormState`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`, `redirectWithError`.
- [../../middleware/signed-in-access.md](../../middleware/signed-in-access.md) — auth gate.
- [../../constants.md](../../constants.md) — `PATHS.RECURRING`, header configs.

---

See [source-code.md](../../../source-code.md) for the full catalog.
