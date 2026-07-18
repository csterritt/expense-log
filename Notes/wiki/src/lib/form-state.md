# src/lib/form-state.ts

Single-use flash payload for re-rendering forms after validation-failure redirects. Uses a cookie (`COOKIES.FORM_ERRORS`) to pass field errors and sticky values from POST handler to GET handler.

## Types

### ExpenseFormValues

Per-field sticky values: `description`, `amount`, `date`, `category`, `tags`, `tagIds[]`, `newTags`, `name`, `id`, `sourceId`, `targetId`, `recurrence`, `anchorDate`.

### FormState

`{ fieldErrors: FieldErrors, values: ExpenseFormValues }` — the round-tripped payload.

## Functions

### redirectWithFormErrors(c, redirectUrl, fieldErrors, values): Response

Stores `{ fieldErrors, values }` as URL-encoded JSON in the `FORM_ERRORS` cookie, then redirects (303) to `redirectUrl`. The next GET handler should call `readAndClearFormState` to consume it.

### readAndClearFormState(c): FormState | undefined

Reads and deletes the `FORM_ERRORS` cookie. Returns `undefined` if no cookie or parse failure. Returns `{ fieldErrors, values }` on success.

## Pattern

This implements the PRG (Post-Redirect-Get) pattern:
1. POST handler validates input → on error, calls `redirectWithFormErrors` with field errors + user's typed values
2. Browser follows 303 redirect to the form page
3. GET handler calls `readAndClearFormState` → re-renders form with inline errors and preserved values

## Dependencies

- `../constants` — `COOKIES`, `HTML_STATUS`
- `./cookie-support` — `addCookie`, `removeCookie`, `retrieveCookie`
- `./expense-validators` — `FieldErrors` type
