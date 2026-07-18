# src/routes/expenses/build-edit-expense.tsx

Route builder for expense edit and delete pages. Handles GET (edit form), POST (update), confirm-edit-new (new items confirmation), and GET/POST delete.

## Routes Registered

- `GET /expenses/:id/edit` — Edit expense form
- `POST /expenses/:id/edit` — Update expense (existing category/tags only)
- `POST /expenses/:id/confirm-edit-new` — Update expense with new category/tags confirmation
- `GET /expenses/:id/delete` — Delete confirmation page
- `POST /expenses/:id/delete` — Delete expense

## Key Features

- Edit form pre-populated with existing expense values (description, amount, date, category, tags)
- Same confirmation flow as create: if new category or new tags detected, renders confirmation page
- Delete shows a confirmation page with expense details before deletion
- Uses `updateExpenseWithTags` for existing-items updates, `updateManyAndExpense` for new-items updates
- PRG pattern with `form-state` for sticky values and field errors

## Dependencies

- `../../lib/db/expense-access` — `getExpenseById`, `updateExpenseWithTags`, `updateManyAndExpense`, `deleteExpense`
- `../../lib/db/category-access` — `listCategories`, `findCategoryByName`
- `../../lib/db/tag-access` — `listTags`
- `../../lib/db/confirm-helpers` — `resolveConfirmTagsAndCategory`
- `../../lib/expense-validators` — `parseExpenseCreate`, `parseNewCategoryName`, `parseTagInputs`
- `../../lib/form-state` — `readAndClearFormState`, `redirectWithFormErrors`
- `../../lib/redirects` — `redirectWithError`, `redirectWithMessage`
- `../../lib/money` — `formatCents`, `formatCentsPlain`
- `../../middleware/signed-in-access` — auth guard
- `./expense-form` — `renderExpenseForm`, `renderConfirmNewItems`
- `../build-layout` — `useLayout`
