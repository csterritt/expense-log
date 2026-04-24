## Issue 13: Recurring templates CRUD (no cron yet)

**Type**: AFK
**Blocked by**: Issue 8

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

Flesh out `/recurring`:

- List all recurring templates sorted by description ascending. Each row shows description, formatted amount, category, tags, recurrence (capitalized), anchor date, and the computed next-occurrence date (via a skeleton `recurrence.nextOccurrenceAfter` — the full algorithm lives in Issue 14; a small monthly-only stub is sufficient for this slice's tests).
- Create page: same fields as expense entry (description, amount, category, tags) plus `recurrence` ∈ {Monthly, Quarterly, Yearly} and `anchorDate`. Reuses the inline-create flows for category and tags (same confirmation page pattern as Issue 6). Validators enforce description ≤ 200, amount > 0 with ≤ 2 decimals, category required, tag/category names ≤ 20 chars, anchor date a valid `YYYY-MM-DD`.
- Edit page: same fields pre-populated via `value`; edits apply only to future occurrences (enforced naturally since past generated rows are copies; the template edit does not rewrite them).
- Delete: confirmation page; on confirm, template row is removed. The FK `ON DELETE SET NULL` on `expense.recurringId` preserves past generated rows with the provenance link cleared (verified via seeded generated rows inserted via test DB route).

Add `expense-repo.listRecurring`, `getRecurring`, `createRecurring`, `updateRecurring`, `deleteRecurring`.

See PRD sections *Recurring expenses and the cron* (CRUD portions), *Forms and validation*, user stories 57, 58, 59, 64, 65, 72.

### How to verify

- **Manual**:
  1. Visit `/recurring`; create a Monthly template anchored today with a new inline category and tag.
  2. Confirm the row appears, sorted by description, with the next-occurrence date computed.
  3. Edit the template's amount; confirm the change is persisted and past (seeded) generated rows are unchanged.
  4. Seed a generated expense row against this template via the test DB route; delete the template; confirm the template is gone and the seeded generated row remains visible with `recurringId` cleared.
- **Automated**: Playwright e2e for create (with inline-create), edit, delete-with-past-generated-rows-preserved.

### Acceptance criteria

- [ ] Given no query parameters, when the user visits `/recurring`, then templates are listed sorted by description ascending with all required columns.
- [ ] Given a create submission with new inline categories/tags, when the user confirms, then the same consolidated confirmation page as Issue 6 appears and atomic creation runs.
- [ ] Given a template edit, when the user saves, then the template is updated but any seeded past generated expense rows remain untouched.
- [ ] Given a template is deleted, when the user confirms, then the template row is removed and any past generated expense rows have `recurringId = NULL` and remain visible.
- [ ] Given invalid inputs (description > 200, amount ≤ 0, anchor date malformed), when the user submits, then field-level errors are shown and no row is created.

### User stories addressed

- User story 57: Recurring page listing
- User story 58: create template with same fields + recurrence + anchor date
- User story 59: templates run forever until deleted (no end-date UI)
- User story 64: edit applies only to future occurrences
- User story 65: delete preserves past generated rows
- User story 72: same validation rules as expense form + anchor-date validity

---
