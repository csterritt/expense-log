# form-state.ts

**Source:** `src/lib/form-state.ts`

## Purpose

Single-use flash payload for re-rendering a form on the next GET after a validation-failure redirect. Introduced in Issue 04 because per-field error rendering needs more than the single-string `MESSAGE_FOUND` / `ERROR_FOUND` cookies that [`redirects.tsx`](redirects.md) provides — the round trip has to carry both the `FieldErrors` record and the user's typed values so the form can re-render with inline errors AND sticky values.

The payload is JSON-encoded into a dedicated `COOKIES.FORM_ERRORS` cookie that inherits the project's `STANDARD_COOKIE_OPTIONS` (HttpOnly, SameSite=Strict, Path=`/`, Secure in production via the `PRODUCTION:UNCOMMENT` line in [`constants.md`](../constants.md)).

## Types

- `ExpenseFormValues` — sticky values for the entry form: `{ description?, amount?, date?, categoryId? }`. Each field is the raw string the user typed, not the parsed form, so the input redisplays exactly what they entered.
- `FormState` — `{ fieldErrors: FieldErrors, values: ExpenseFormValues }`. Generic enough that future forms can reuse it; today only the expense entry form uses it.

## Exports

### `redirectWithFormErrors(c, redirectUrl, fieldErrors, values): Response`

Stashes `{ fieldErrors, values }` in the `FORM_ERRORS` cookie (JSON-stringified, then `encodeURIComponent`-wrapped so cookie reserved characters never break parsing) and returns a `303 See Other` redirect to `redirectUrl`. Used by the `POST /expenses` handler when `parseExpenseCreate` returns `Err`.

### `readAndClearFormState(c): FormState | undefined`

Reads the `FORM_ERRORS` cookie via `retrieveCookie`, **unconditionally clears it via `removeCookie`** (so a refresh never re-shows stale errors), then attempts to parse the payload back into `FormState`. Returns `undefined` if the cookie was missing or the payload was malformed; otherwise returns `{ fieldErrors, values }` with empty defaults filled in.

## Cross-references

- [expense-validators.md](expense-validators.md) — `FieldErrors` type used in the payload.
- [cookie-support.md](cookie-support.md) — `addCookie`, `retrieveCookie`, `removeCookie` primitives.
- [../constants.md](../constants.md) — `COOKIES.FORM_ERRORS`, `COOKIES.STANDARD_COOKIE_OPTIONS`, `HTML_STATUS.SEE_OTHER`.
- [redirects.md](redirects.md) — sibling helpers for the simpler single-string flash cases (`redirectWithMessage`, `redirectWithError`).
- [../routes/expenses/build-expenses.md](../routes/expenses/build-expenses.md) — only consumer today; uses both helpers.

---

See [source-code.md](../../source-code.md) for the full catalog.
