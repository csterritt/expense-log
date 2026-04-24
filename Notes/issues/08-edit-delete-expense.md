## Issue 8: Edit and delete expense

**Type**: AFK
**Blocked by**: Issue 7

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

Each list row gains a single "Edit" button that navigates to an edit page pre-populated (via `value` attributes) with all expense fields. The edit page reuses the entry form's validators, inline-create flows (for category and tags), and consolidated confirmation page. On successful save, `expense-repo.updateExpense` runs atomically and the user is redirected to `/expenses`.

The edit page also has a "Delete" button that navigates to a delete-confirmation page showing the expense being deleted (description, amount, date, category, tags). Confirming invokes `expense-repo.deleteExpense` and redirects to `/expenses`.

See PRD sections _Forms and validation_, _Edit / delete expense_, user stories 26, 51, 52, 53, 54.

### How to verify

- **Manual**:
  1. Click Edit on a row; confirm all fields are pre-populated via `value`.
  2. Change the amount and save; confirm redirect to `/expenses` with the updated amount.
  3. Edit and type a brand-new tag; confirm the consolidated confirmation page appears; confirm and verify.
  4. Click Delete; confirm the delete-confirmation page shows the expense details; confirm; verify the row is gone on `/expenses`.
- **Automated**: Playwright e2e for edit-save, edit-with-new-tag (confirmation flow), and delete-confirm flows.

### Acceptance criteria

- [ ] Given an expense exists, when the user clicks Edit, then the edit page renders with every field pre-populated via `value`.
- [ ] Given an edit form submission with new inline categories/tags, when the user submits, then the consolidated confirmation page from Issue 6 is re-used.
- [ ] Given the user saves an edit, when the transaction completes, then they are redirected to `/expenses` and the updated row appears.
- [ ] Given the user clicks Delete on the edit page, when the confirmation page renders, then it shows the expense details and a Confirm button.
- [ ] Given the user confirms deletion, when the delete completes, then they are redirected to `/expenses` and the row is absent.

### User stories addressed

- User story 26: Edit button on each row
- User story 51: edit page pre-populated via `value`
- User story 52: edit uses same validators and inline-create flows
- User story 53: Delete button + confirmation page
- User story 54: redirect to list after save/delete

---
