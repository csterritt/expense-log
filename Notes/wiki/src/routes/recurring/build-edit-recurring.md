# build-edit-recurring.tsx

**Source:** `src/routes/recurring/build-edit-recurring.tsx`

## Purpose

Route builder for recurring-template edit, confirm-edit-new, and delete flows (Issue 13). Mirrors the expense edit flow with recurring-specific fields (`recurrence`, `anchorDate` instead of `date`).

## Export

### `buildEditRecurring(app): void`

Registers five routes, all gated by `signedInAccess` and wrapped in `secureHeaders`:

- `GET /recurring/:id/edit` — loads the template via `getRecurringById`, plus categories and tags for the JS-on payloads. Pre-populates a `RecurringFormState` from the loaded row (description, amount via `formatCentsPlain`, category name, alphabetised tags CSV, recurrence, anchorDate) merged with any flash form-state. Renders `renderRecurringForm({ mode: 'edit' })` plus a Delete anchor (`data-testid='recurring-edit-delete'`) linking to `/recurring/:id/delete` and a Back-to-list anchor (`data-testid='recurring-edit-back'`).
- `POST /recurring/:id/edit` — validates with `parseRecurringCreate` + `parseTagCsv`, on failure round-trips via `redirectWithFormErrors`. Verifies the template exists. Computes the new-category / new-tag diff. **All-existing path**: calls `updateRecurringWithTags` and redirects to `/recurring` with `'Recurring template updated.'`. **Any-new path**: renders `renderConfirmNewItems({ mode: 'edit', entity: 'recurring' })`.
- `POST /recurring/:id/confirm-edit-new` — Cancel redirects back to the edit page preserving values. Confirm defensively re-validates, re-resolves diffs, then calls `updateManyAndRecurring` atomically. On success redirects to `/recurring` with `'Recurring template updated.'`
- `GET /recurring/:id/delete` — loads the template and renders a confirmation page (`data-testid='confirm-delete-recurring-page'`) showing description, formatted amount, category, tags, recurrence, and anchor date (each with stable testids prefixed `confirm-delete-recurring-*`). Notes that past generated expenses will remain but be disassociated. The Cancel anchor returns to `/recurring/:id/edit`.
- `POST /recurring/:id/delete` — calls `deleteRecurring`. On success redirects to `/recurring` with `'Recurring template deleted.'`; on failure redirects with error message.

### Internal helpers

- `requireId(c)` — coerces `c.req.param('id')` to a trimmed string or `null`.
- `readRawBody(c)` — same shape as the create-flow helper.
- `computeNewItemsDiff(categoryLookup, tagLookup, loweredTagNames)` — shared diff logic identical to the create flow.

## Cross-references

- [recurring-form.md](recurring-form.md) — `renderRecurringForm({ mode: 'edit' })`.
- [../expenses/expense-form.md](../expenses/expense-form.md) — `renderConfirmNewItems` shared renderer.
- [../../lib/db/expense-access.md](../../lib/db/expense-access.md) — `getRecurringById`, `updateRecurringWithTags`, `updateManyAndRecurring`, `deleteRecurring`.
- [../../lib/db/category-access.md](../../lib/db/category-access.md) — `listCategories`, `findCategoryByName`.
- [../../lib/db/tag-access.md](../../lib/db/tag-access.md) — `listTags`, `findTagsByNames`.
- [../../lib/expense-validators.md](../../lib/expense-validators.md) — `parseRecurringCreate`, `parseNewCategoryName`, `parseTagCsv`.
- [../../lib/form-state.md](../../lib/form-state.md) — `redirectWithFormErrors`, `readAndClearFormState`.
- [../../lib/money.md](../../lib/money.md) — `formatCentsPlain` (edit form seed), `formatCents` (delete page).
- [../../lib/redirects.md](../../lib/redirects.md) — `redirectWithMessage`, `redirectWithError`.
- [../../middleware/signed-in-access.md](../../middleware/signed-in-access.md) — auth gate.
- [../../constants.md](../../constants.md) — `PATHS.RECURRING`, header configs.

---

See [source-code.md](../../../source-code.md) for the full catalog.
