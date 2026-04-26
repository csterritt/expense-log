# Issue 04 — Validators + Error Rendering

*2026-04-26T18:59:20Z by Showboat 0.6.1*
<!-- showboat-id: a23616a7-b2f8-4648-a7ba-22da31927ad4 -->

This walkthrough demonstrates Issue 04: per-field validation and state preservation on the `/expenses` entry form. New `expense-validators` module with a valibot-backed `parseExpenseCreate` that reports errors for every invalid field at once; a `form-state` flash-cookie helper that round-trips `{fieldErrors, values}` across the redirect; an entry form that renders inline errors next to each bad input and preserves the user's typed values via `value` (never `defaultValue`); a Playwright spec covering every failure case from the issue.

## 1. `expense-validators` — per-field parsing with collected errors

The module composes small valibot schemas (description, amount-presence, date, categoryId) with a `parseExpenseCreate` that runs each schema via `safeParse` and keeps going — every invalid field ends up in the returned `FieldErrors` record, not just the first one. Amount parsing delegates to `money.parseAmount` so the decimal / comma / zero-or-negative rules stay in one place and produce a `Result<number, string>`; on success `parseExpenseCreate` returns the parsed `amountCents` along with the trimmed string fields.

```bash
sed -n '36,60p' src/lib/expense-validators.ts
```

```output
// Maximum description length. Matches the PRODUCTION:UNCOMMENT convention used
// elsewhere so tests can use a slightly-larger value while production enforces
// the user-facing 200-char limit.
// export const descriptionMax = 200 // PRODUCTION:UNCOMMENT
export const descriptionMax = 202

/**
 * Per-field error messages produced by `parseExpenseCreate`. Any missing key
 * means that field passed validation.
 */
export type FieldErrors = {
  description?: string
  amount?: string
  date?: string
  category?: string
}

/**
 * The fully-validated output of `parseExpenseCreate`, ready to hand to
 * `createExpense`.
 */
export type ParsedExpenseCreate = {
  description: string
  amountCents: number
  date: string
```

```bash
sed -n '156,200p' src/lib/expense-validators.ts
```

```output

/**
 * Validate the raw entry-form values and, if valid, also parse `amount` into
 * integer cents.
 *
 * On success returns `Result.ok(ParsedExpenseCreate)`. On failure returns
 * `Result.err(FieldErrors)` with one entry per failed field; all failing
 * fields are reported simultaneously rather than short-circuiting.
 */
export const parseExpenseCreate = (
  raw: RawExpenseCreate,
): Result<ParsedExpenseCreate, FieldErrors> => {
  const errors: FieldErrors = {}

  const description = typeof raw.description === 'string' ? raw.description.trim() : ''
  const descError = firstIssueMessage(DescriptionSchema, description)
  if (descError) {
    errors.description = descError
  }

  const date = typeof raw.date === 'string' ? raw.date.trim() : ''
  const dateError = firstIssueMessage(DateSchema, date)
  if (dateError) {
    errors.date = dateError
  }

  const categoryId = typeof raw.categoryId === 'string' ? raw.categoryId.trim() : ''
  const categoryError = firstIssueMessage(CategoryIdSchema, categoryId)
  if (categoryError) {
    errors.category = categoryError
  }

  const amountRaw = typeof raw.amount === 'string' ? raw.amount : ''
  let amountCents = 0
  const amountPresenceError = firstIssueMessage(AmountSchema, amountRaw)
  if (amountPresenceError) {
    errors.amount = amountPresenceError
  } else {
    const parsed = parseAmount(amountRaw)
    if (parsed.isErr) {
      errors.amount = parsed.error
    } else {
      amountCents = parsed.value
    }
  }
```

The unit spec pins the contract: one representative pass case per field, the failure cases from the issue, and a multi-field case asserting every bad field appears in the error object at once.

```bash
cd tests && bun test expense-validators.spec.ts 2>&1 | tail -30
```

```output
bun test v1.3.13 (bf2e2cec)

expense-validators.spec.ts:
(pass) parseExpenseCreate > description > accepts a single char
(pass) parseExpenseCreate > description > accepts exactly descriptionMax characters
(pass) parseExpenseCreate > description > rejects empty
(pass) parseExpenseCreate > description > rejects whitespace-only
(pass) parseExpenseCreate > description > rejects descriptionMax + 1 characters
(pass) parseExpenseCreate > amount > parses 1234.56 as 123456 cents
(pass) parseExpenseCreate > amount > rejects empty
(pass) parseExpenseCreate > amount > rejects zero
(pass) parseExpenseCreate > amount > rejects negatives
(pass) parseExpenseCreate > amount > rejects more than two decimal places
(pass) parseExpenseCreate > amount > rejects non-numeric
(pass) parseExpenseCreate > date > accepts leap day 2024-02-29
(pass) parseExpenseCreate > date > rejects empty
(pass) parseExpenseCreate > date > rejects 2025-13-40
(pass) parseExpenseCreate > date > rejects 2024-04-31 [1.00ms]
(pass) parseExpenseCreate > date > rejects malformed shape
(pass) parseExpenseCreate > category > accepts a non-empty id
(pass) parseExpenseCreate > category > rejects empty
(pass) parseExpenseCreate > category > rejects whitespace-only
(pass) parseExpenseCreate > multi-field failure > reports errors for every invalid field at once
(pass) parseExpenseCreate > multi-field failure > preserves valid fields passing while invalid ones fail

 21 pass
 0 fail
Ran 21 tests across 1 file. [137.00ms]
```

## 2. `form-state` — single-use cookie carrying errors + sticky values

The POST handler can't re-render the form inline (it uses PRG — Post/Redirect/Get — so a browser refresh doesn't resubmit). Instead it stashes `{fieldErrors, values}` in a dedicated `FORM_ERRORS` cookie, redirects to the same URL, and the next GET reads and clears it. The helpers live next to the cookie machinery:

```bash
sed -n '44,85p' src/lib/form-state.ts
```

```output

/**
 * Redirect back to `redirectUrl` with `fieldErrors` + `values` stashed in a
 * single-use cookie. The next GET handler should call
 * `readAndClearFormState` to retrieve and clear it.
 */
export const redirectWithFormErrors = <E extends { Bindings: Bindings }>(
  c: Context<E>,
  redirectUrl: string,
  fieldErrors: FieldErrors,
  values: ExpenseFormValues,
): Response => {
  const payload: FormState = { fieldErrors, values }
  addCookie(c, COOKIES.FORM_ERRORS, encodeURIComponent(JSON.stringify(payload)))
  return c.redirect(redirectUrl, HTML_STATUS.SEE_OTHER)
}

/**
 * Read and clear the single-use form-state cookie. Returns `undefined` when
 * no cookie is present or the payload fails to parse.
 */
export const readAndClearFormState = <E extends { Bindings: Bindings }>(
  c: Context<E>,
): FormState | undefined => {
  const raw = retrieveCookie(c, COOKIES.FORM_ERRORS)
  if (!raw) {
    return undefined
  }
  removeCookie(c, COOKIES.FORM_ERRORS)
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as FormState
    if (!parsed || typeof parsed !== 'object') {
      return undefined
    }
    return {
      fieldErrors: parsed.fieldErrors ?? {},
      values: parsed.values ?? {},
    }
  } catch {
    return undefined
  }
}
```

The cookie inherits `COOKIES.STANDARD_COOKIE_OPTIONS` (HttpOnly, SameSite=Strict, Path=/, Secure in production). It's read-once: the reader unconditionally calls `removeCookie` before parsing so a refreshed page never re-shows stale errors.

## 3. Entry form rendering — inline errors + sticky values

The `renderEntryForm` helper takes a state object `{ fieldErrors, values }`. Each input uses `value={values.X}` (never `defaultValue`), the `<select>` marks its matching option with `selected`, and each field renders a DaisyUI-styled error paragraph only when that specific field has an error:

```bash
sed -n '46,68p' src/routes/expenses/build-expenses.tsx
```

```output
})

const fieldError = (field: keyof FieldErrors, message?: string) => {
  if (!message) {
    return null
  }
  return (
    <p
      className='text-error text-sm mt-1'
      data-testid={`expense-form-${field}-error`}
    >
      {message}
    </p>
  )
}

const inputClass = (base: string, hasError: boolean) =>
  hasError ? `${base} input-error` : base

const selectClass = (base: string, hasError: boolean) =>
  hasError ? `${base} select-error` : base

const renderEntryForm = (
```

```bash
sed -n '82,98p' src/routes/expenses/build-expenses.tsx
```

```output
      <div className='flex flex-col md:col-span-2'>
        <label className='label' htmlFor='expense-form-description'>
          <span className='label-text'>Description</span>
        </label>
        <input
          id='expense-form-description'
          name='description'
          type='text'
          required
          maxLength={descriptionMax + 50}
          className={inputClass('input input-bordered w-full', !!fieldErrors.description)}
          data-testid='expense-form-description'
          value={values.description ?? ''}
        />
        {fieldError('description', fieldErrors.description)}
      </div>
      <div className='flex flex-col'>
```

The form has `noValidate` so server-side validation owns the UX — the browser doesn't gate the submission on `required` / `pattern`. The `required` and `maxLength` attributes are still present (per project coding-style), but the input's `maxLength` is intentionally larger than `descriptionMax` so a test can submit an over-limit string without the browser truncating it. Date is rendered as `type='text'` with a `pattern` so invalid calendar dates like `2025-13-40` can reach the server and exercise its validation.

## 4. POST handler — validate, then either redirect-with-errors or create

The handler shrinks to four steps: parse the form, run `parseExpenseCreate`, branch on the `Result`, and PRG either way:

```bash
sed -n '252,283p' src/routes/expenses/build-expenses.tsx
```

```output
    },
  )

  app.post(
    PATHS.EXPENSES,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const form = await c.req.parseBody()
      const raw = {
        description: typeof form.description === 'string' ? form.description : '',
        amount: typeof form.amount === 'string' ? form.amount : '',
        date: typeof form.date === 'string' ? form.date : '',
        categoryId: typeof form.categoryId === 'string' ? form.categoryId : '',
      }

      const validated = parseExpenseCreate(raw)
      if (validated.isErr) {
        return redirectWithFormErrors(c, PATHS.EXPENSES, validated.error, raw)
      }

      const db = createDbClient(c.env.PROJECT_DB)
      const createResult = await createExpense(db, validated.value)
      if (createResult.isErr) {
        return redirectWithError(
          c,
          PATHS.EXPENSES,
          'Failed to save expense. Please try again.',
        )
      }

      return redirectWithMessage(c, PATHS.EXPENSES, 'Expense added.')
```

DB-failure paths still use the old `redirectWithError` flash banner (it's a single global error, not field-scoped). On the GET side, `readAndClearFormState(c)` populates the entry form's state — falling back to an empty state (with `todayEt()` as the default date) when no flash is present.

## 5. End-to-end: every failure case from the issue

The new spec signs in the seeded user, seeds a single `Food` category, and exercises empty / over-max description, four bad amounts (`1.234`, `-5`, `0`, `abc`), invalid date `2025-13-40`, missing category, multi-field-at-once, and a fix-and-resubmit round-trip:

```bash
./node_modules/.bin/playwright test e2e-tests/expenses/03-validation-errors.spec.ts --reporter=line 2>&1 | tail -10
```

```output

[1A[2KDatabase seeded successfully: 2 users, 2 accounts, 5 codes

[1A[2KDatabase sessions cleared successfully

[1A[2KCategories seeded successfully: 1 created

[1A[2KDatabase cleared successfully

[1A[2K  7 passed (4.1s)
```

Each test asserts both *visibility* of the per-field error testid and *retention* of the still-valid sibling fields. The fix-and-resubmit case proves the round trip closes cleanly: after correcting only the bad field, all other inputs are still populated from the previous render, the submission succeeds, the new row appears, and the form clears (no flash residue, since the cookie is single-use).

## 6. No regressions

The full expense E2E suite (Issues 02 + 03 + 04, 11 specs) and the unit suite still pass:

```bash
./node_modules/.bin/playwright test e2e-tests/expenses --reporter=line 2>&1 | tail -5
```

```output
[1A[2KCategories seeded successfully: 1 created

[1A[2KDatabase cleared successfully

[1A[2K  11 passed (6.0s)
```

```bash
cd tests && bun test 2>&1 | tail -5
```

```output

 52 pass
 6 fail
 4 errors
Ran 58 tests across 8 files. [2.04s]
```

(The 6 `bun test` failures all live in `tests/send-email.spec.ts` and pre-date this issue — same pre-existing typing mismatch flagged by `tsc --noEmit`.)
