# build-create-recurring.tsx

**Source:** `src/routes/recurring/build-create-recurring.tsx`

## Purpose

Route builder for the recurring-template create flow (Issue 13). Mirrors the expense create flow: validates via `parseRecurringCreate`, resolves category/tags, routes through `renderConfirmNewItems(entity='recurring')` when new items are needed, then calls `createRecurringWithTags` or `createManyAndRecurring`.

## Export

### `buildCreateRecurring(app): void`

Registers three routes, all gated by `signedInAccess` and wrapped in `secureHeaders`:

- `GET /recurring/new` — loads categories and tags for the combobox/chip-checkbox payloads, reads any flash form-state, and renders the new-template page (`data-testid='recurring-new-page'`) with `renderRecurringForm({ mode: 'create' })`. Includes deferred `<script>` tags for `category-combobox.js` and `tag-chip-checkboxes.js`.
- `POST /recurring` — parses the raw body, validates with `parseRecurringCreate`, fetches all tags and parses tag inputs via `parseTagInputs({ tagId, newTags }, allTags)`. On validation failure round-trips via `redirectWithFormErrors` to `/recurring/new` preserving `tagIds` and `newTags`. Looks up the category and tags. **All-existing path**: calls `createRecurringWithTags` and redirects to `/recurring` with success message. **Any-new path**: validates the new category name when applicable, then renders `renderConfirmNewItems({ mode: 'create', entity: 'recurring', action: '/recurring/confirm-create-new' })` with hidden `recurrence` and `anchorDate` inputs.
- `POST /recurring/confirm-create-new` — Cancel redirects back to `/recurring/new` preserving every typed value. Confirm defensively re-runs validation, calls `resolveConfirmTagsAndCategory` for race-tolerant tag/category resolution, then calls `createManyAndRecurring` atomically. On collision it surfaces the error under `category` or `tags`. On success redirects to `/recurring` with `'Recurring template created.'`

### Internal helpers

- `emptyRecurringState(today)` — builds a default `RecurringFormState` with all fields blank and `anchorDate` defaulted to today.
- `readRawBody(c)` — parses the request body into `{ description, amount, category, tagId: string[], newTags, recurrence, anchorDate, action }` with string defaults. Parses `tagId` from checkbox array or single string.

## Cross-references

- [recurring-form.md](recurring-form.md) — shared form renderer.
- [../expenses/expense-form.md](../expenses/expense-form.md) — `renderConfirmNewItems` shared with expense flows.
- [../../lib/db/expense-access.md](../../lib/db/expense-access.md) — `createRecurringWithTags`, `createManyAndRecurring`.
- [../../lib/db/category-access.md](../../lib/db/category-access.md) — `listCategories`, `findCategoryByName`.
- [../../lib/db/tag-access.md](../../lib/db/tag-access.md) — `listTags`.
- [../../db/client.md](../../db/client.md) — `createDbClient`.
- [../build-layout.md](../build-layout.md) — layout wrapper.
- [../../lib/et-date.md](../../lib/et-date.md) — `todayEt`.
- [../../lib/expense-validators.md](../../lib/expense-validators.md) — `parseRecurringCreate`, `parseNewCategoryName`, `parseTagInputs`.
- [../../lib/db/confirm-helpers.md](../../lib/db/confirm-helpers.md) — `resolveConfirmTagsAndCategory` (Issue 18 shared pipeline).
- [../../lib/form-state.md](../../lib/form-state.md) — `redirectWithFormErrors`, `readAndClearFormState`.
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`, `redirectWithError`.
- [../../middleware/signed-in-access.md](../../middleware/signed-in-access.md) — auth gate.
- [../../constants.md](../../constants.md) — `PATHS.RECURRING`, header configs.

---

See [source-code.md](../../../source-code.md) for the full catalog.
