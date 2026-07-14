## Issue 5: Inline category creation via consolidated confirmation page (no-JS path)

**Type**: AFK
**Blocked by**: Issue 4

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

Replace the native category `<select>` with a plain `<input>` (for now; combobox JS comes in Issue 7). If the submitted category name does not match any existing category (case-insensitive), the POST handler does _not_ create the expense directly; instead it renders a consolidated confirmation page listing:

- The new category name to be created.
- The full expense data (description, amount, date, category).
- Confirm and Cancel buttons.

Confirm: one atomic transaction creates the category (lowercase-normalized) and the expense. Redirect to `/expenses`. Cancel: re-render the entry form with every field's value preserved.

Validate that a new category name, after trimming, is non-empty and ≤ 20 characters; otherwise surface a field-level error on the original form rather than showing the confirmation page.

See PRD sections _Category/tag semantics_, _Forms and validation_, _Client JS (progressive enhancement)_ (no-JS fallback requirement), user stories 6, 11 (single-creation subset), 12, 14 (category side), 17, 18 (category side).

### How to verify

- **Manual**:
  1. Type `Groceries` (which does not exist) into the category input; submit.
  2. Confirm the confirmation page lists "Create category 'groceries'" and a preview of the expense.
  3. Click Cancel; confirm the entry form re-renders with all values preserved.
  4. Resubmit and click Confirm; confirm redirect to `/expenses`, the new row visible, and `groceries` now present for future use.
  5. Submit with a new category name of 21 chars; confirm a field error and no confirmation page.
- **Automated**: Playwright e2e covers the confirm path, the cancel path (with value preservation), and the too-long-name error path.

### Acceptance criteria

- [ ] Given a typed category name that does not match any existing category (case-insensitive), when the user submits the entry form, then the consolidated confirmation page renders showing the new category and the full expense data.
- [ ] Given the user clicks Confirm, when the transaction completes, then the category and the expense exist and the user is redirected to `/expenses` with the row visible.
- [ ] Given the user clicks Cancel, when the form re-renders, then all fields — including the typed new category name — are preserved via `value`.
- [ ] Given a new category name of 21 chars or empty after trim, when the user submits, then a field-level error is shown and no confirmation page is rendered.

### User stories addressed

- User story 6: inline category create via "Create category 'foo'?" prompt
- User story 11: consolidated confirmation (category-only subset; tags added in Issue 6)
- User story 12: cancel preserves values
- User story 14: category input works without JS
- User story 17: category-missing error
- User story 18: category name length error

---
