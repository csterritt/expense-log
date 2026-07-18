# src/routes/build-tags.tsx

Route builder for the tags management page. Handles listing, creating, renaming, merging, and deleting tags.

## Routes Registered

- `GET /tags` — List tags with create/rename/delete/merge forms
- `POST /tags` — Create tag
- `POST /tags/:id/rename` — Rename tag
- `POST /tags/:id/delete` — Delete tag (with expense count check)
- `GET /tags/merge-confirm` — Merge confirmation page
- `POST /tags/merge` — Merge tags

## Key Features

- Uses PRG pattern with `form-state` for sticky values and field errors
- Case-insensitive name normalization (lowercase after trim)
- Merge reassigns `expenseTag` and `recurringTag` links from source to target (handles duplicate collisions), then deletes source
- Delete fails if expenses reference the tag
- Tag list sorted by case-insensitive name ASC

## Dependencies

- `../lib/db/tag-access` — all tag CRUD operations
- `../lib/expense-validators` — `parseTagCreate`, `parseTagRename`, `parseTagDelete`, `parseTagMergeConfirm`
- `../lib/form-state` — `readAndClearFormState`, `redirectWithFormErrors`
- `../lib/redirects` — `redirectWithError`, `redirectWithMessage`
- `../middleware/signed-in-access` — auth guard
- `./build-layout` — `useLayout`
