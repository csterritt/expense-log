# src/routes/recurring/build-edit-recurring.tsx

Route builder for recurring template edit, confirm-edit-new, and delete flows.

## Routes Registered

- `GET /recurring/:id/edit` — Edit form (with `ALLOW_SCRIPTS_SECURE_HEADERS`)
- `POST /recurring/:id/edit` — Update (existing category/tags)
- `POST /recurring/:id/confirm-edit-new` — Update (new category/tags confirmation)
- `GET /recurring/:id/delete` — Delete confirmation page
- `POST /recurring/:id/delete` — Delete recurring template

## Flow

- Edit form pre-populated with existing recurring values (description, amount, category, tags, recurrence, anchor date)
- Same confirmation flow as create for new category/tags
- Uses `updateRecurringWithTags` for existing-items updates, `createOrReuseCategory`/`createOrReuseTag` + `updateManyAndRecurring` for new-items updates
- Delete shows confirmation page, then calls `deleteRecurring`
- Does NOT modify previously generated expense rows

## Dependencies

- `../../lib/db/expense-access` — `getRecurringById`, `updateRecurringWithTags`, `deleteRecurring`
- `../../lib/db/confirm-helpers` — `createOrReuseCategory`, `createOrReuseTag`, `resolveConfirmTagsAndCategory`
- `../../lib/db/category-access` — `listCategories`, `findCategoryByName`
- `../../lib/db/tag-access` — `listTags`
- `../../lib/expense-validators` — `parseRecurringCreate`, `parseNewCategoryName`, `parseTagInputs`
- `../../lib/form-state` — `readAndClearFormState`, `redirectWithFormErrors`
- `../../lib/redirects` — `redirectWithError`, `redirectWithMessage`
- `../../lib/money` — `formatCents`, `formatCentsPlain`
- `../../middleware/signed-in-access` — auth guard
- `../expenses/expense-form` — `renderConfirmNewItems`
- `./recurring-form` — `renderRecurringForm`, `RecurringFormState`, `RecurringFormPayloads`
- `../build-layout` — `useLayout`
