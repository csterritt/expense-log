# src/routes/build-categories.tsx

Route builder for the categories management page. Handles listing, creating, renaming, merging, and deleting categories.

## Routes Registered

- `GET /categories` — List categories with create/rename/delete/merge forms
- `POST /categories` — Create category
- `POST /categories/:id/rename` — Rename category
- `POST /categories/:id/delete` — Delete category (with expense count check)
- `GET /categories/merge-confirm` — Merge confirmation page
- `POST /categories/merge` — Merge categories

## Key Features

- Uses PRG pattern with `form-state` for sticky values and field errors
- Case-insensitive name normalization (lowercase after trim)
- Merge reassigns expenses and recurring templates from source to target, then deletes source
- Delete fails if expenses or recurring templates reference the category
- Category list sorted by case-insensitive name ASC

## Dependencies

- `../lib/db/category-access` — all category CRUD operations
- `../lib/expense-validators` — `parseCategoryCreate`, `parseCategoryRename`, `parseCategoryDelete`, `parseCategoryMergeConfirm`
- `../lib/form-state` — `readAndClearFormState`, `redirectWithFormErrors`
- `../lib/redirects` — `redirectWithError`, `redirectWithMessage`
- `../middleware/signed-in-access` — auth guard
- `./build-layout` — `useLayout`
