## Issue 3: Entry form (existing categories only, no tags)

**Type**: AFK
**Blocked by**: Issue 2

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

Add the expense entry form at the top of `/expenses`. Fields: description (text, HTML `required` + `maxlength`), amount (text; parsed via `money.parseAmount`), date (type `date`, defaulting to today in ET via `et-date.todayEt`), category (native `<select>` populated from existing categories; no inline-create yet), and no tag input yet. On successful submit, create the row via `expense-repo.createExpense` and post-redirect-get to `/expenses` with a cleared form; the new row is visible in the list.

Extend `src/lib/money.ts` with `parseAmount`, handling trim, comma stripping, lenient positive-decimal regex with ≤ 2 decimal places, rejecting zero and negative. Add unit tests covering `1234.56`, `1,234.56`, `1234`, `.50`, malformed commas, trailing/leading whitespace, zero, negative, too many decimals, and non-numeric.

See PRD sections *Money*, *Forms and validation*, and user stories 1–5, 13.

### How to verify

- **Manual**:
  1. Seed at least one category via the test DB route.
  2. Visit `/expenses`; confirm the form renders with the date defaulted to today (ET) and the category `<select>` populated.
  3. Submit `description=Coffee`, `amount=4.50`, date=today, category=seeded one.
  4. Confirm redirect back to `/expenses` with the new row at the top and the form cleared.
- **Automated**: unit tests for `money.parseAmount`. Playwright e2e signs in, seeds a category, submits the form for each amount input variant listed above, and asserts the row appears formatted as `$X,XXX.XX`.

### Acceptance criteria

- [ ] Given a signed-in user on `/expenses`, when the form renders, then the date field is pre-populated with today in ET and the category select lists all existing categories.
- [ ] Given valid inputs, when the user submits, then the expense is created and the user is redirected to `/expenses` where the new row is visible and the form is cleared.
- [ ] Given amount input `1,234.56`, then the stored `amountCents` is `123456`.
- [ ] Given amount inputs `0`, `-1`, `1.234`, or `abc`, then `parseAmount` returns an error.

### User stories addressed

- User story 1: entry form at top of landing page
- User story 2: date defaults to today (ET)
- User story 3: description required, ≤ 200 chars (wired via HTML attrs; validator errors covered in Issue 4)
- User story 4: amount parsing accepts natural forms
- User story 5: category picked from existing (searchable behaviour added in Issue 7)
- User story 13: post-submit redirect with cleared form and visible new row

---
