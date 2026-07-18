# src/routes/recurring/build-create-recurring.tsx

Route builder for the recurring template create flow.

## Routes Registered

- `GET /recurring/new` — Show create form (with `ALLOW_SCRIPTS_SECURE_HEADERS` for combobox JS)
- `POST /recurring` — Create recurring template (existing category/tags)
- `POST /recurring/confirm-create-new` — Create recurring template (new category/tags confirmation)

## Flow

Same pattern as expense creation:
1. GET renders form with categories, tags, and flash state
2. POST validates, checks if new category/tags detected
3. If all existing: creates directly via `createRecurringWithTags`
4. If new items: renders confirmation page, user confirms via confirm-create-new
5. Confirm handler uses `resolveConfirmTagsAndCategory` + `createManyAndRecurring`

## Dependencies

- `../../lib/db/expense-access` — `createRecurringWithTags`, `createManyAndRecurring`
- `../../lib/db/confirm-helpers` — `resolveConfirmTagsAndCategory`
- `../../lib/db/category-access` — `listCategories`, `findCategoryByName`
- `../../lib/db/tag-access` — `listTags`
- `../../lib/expense-validators` — `parseRecurringCreate`, `parseTagInputs`, `parseNewCategoryName`
- `../../lib/form-state` — `readAndClearFormState`, `redirectWithFormErrors`
- `../../lib/redirects` — `redirectWithError`, `redirectWithMessage`
- `../../lib/et-date` — `todayEt`
- `../../middleware/signed-in-access` — auth guard
- `../expenses/expense-form` — `renderConfirmNewItems`
- `./recurring-form` — `renderRecurringForm`, `RecurringFormState`, `RecurringFormPayloads`
- `../build-layout` — `useLayout`
