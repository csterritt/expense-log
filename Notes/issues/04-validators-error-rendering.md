## Issue 4: Expense validators + error rendering with state preservation

**Type**: AFK
**Blocked by**: Issue 3

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

Create `src/lib/expense-validators.ts` with valibot schemas for expense create (this slice) and a `parse` helper returning a `Result`. Wire the schema into the POST handler so that on any validation failure the entry form re-renders with field-level error messages next to each invalid field, and with every other field's previously-entered value preserved via the `value` attribute (not `defaultValue`).

Error cases covered: description empty or > 200 chars; amount missing / non-numeric / zero / negative / > 2 decimals / malformed commas after normalization; date missing or not a valid calendar date; category missing.

See PRD sections _Forms and validation_, user stories 15, 16, 17 (subset applicable without inline create), 19, 20.

### How to verify

- **Manual**:
  1. Submit with empty description; confirm a description field error and that amount/date/category values are preserved.
  2. Submit with amount `1.234`; confirm amount error and other fields preserved.
  3. Submit with no category; confirm category error and other fields preserved.
  4. Submit with date `2025-13-40`; confirm date error and other fields preserved.
- **Automated**: unit tests for each validator schema covering pass and fail cases. Playwright e2e enters bad values and asserts the error message text and that the other fields retain their typed values.

### Acceptance criteria

- [ ] Given a description of 201 chars, when the user submits, then a field-level error appears next to description and all other fields retain their typed values.
- [ ] Given amount `-5`, `0`, `1.234`, or `abc`, when the user submits, then amount displays its error and other fields are preserved.
- [ ] Given no date, when the user submits, then date displays its error.
- [ ] Given no category selected, when the user submits, then category displays its error.

### User stories addressed

- User story 15: description field-level error
- User story 16: amount field-level errors
- User story 17: category missing error (subset; full inline-create flow in Issue 5)
- User story 19: date field-level error
- User story 20: form re-render preserves other values

---
