## Issue 6: Tags on expenses (no-JS CSV path) + inline tag creation

**Type**: AFK
**Blocked by**: Issue 5

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

Add a tags input to the entry form as a single comma-separated text field (no-JS fallback). On submit:

- Names are trimmed, lowercased, and de-duplicated silently.
- Each name ≤ 20 chars after trim; empty-after-trim is invalid.
- Any name that does not match an existing tag is flagged as a new tag.
- If the submission would create one-or-more new categories _and/or_ one-or-more new tags, the consolidated confirmation page lists **every** new name (categories and tags together) alongside the expense preview. One atomic transaction on Confirm creates everything plus the expense (with its `expenseTag` rows). Cancel re-renders the form with all values — including the full typed tag CSV — preserved.

List rendering: extend each list row to show the expense's tags (comma-separated, alphabetical).

See PRD sections _Category/tag semantics_, _Client JS (progressive enhancement)_, user stories 7 (no-JS subset), 9, 10, 11 (full), 12 (full), 14 (full), 18 (full), 20 (full).

### How to verify

- **Manual**:
  1. Submit an expense with `tags=food, groceries, food` where `groceries` already exists and `food` does not.
  2. Confirm the confirmation page lists `Create tag 'food'` and (if category is also new) the new category.
  3. Confirm; confirm the expense row in the list shows tags `food, groceries` (duplicate silently dropped).
  4. Repeat with a tag name of 21 chars; confirm the field error.
- **Automated**: Playwright e2e for single-new-tag, multiple-new-tags, duplicate-deduplication, and the combined new-category + new-tags confirmation flow. Also e2e for cancel preserving the CSV value.

### Acceptance criteria

- [ ] Given a tag CSV containing duplicates (case-insensitive), when submitted, then each tag is attached at most once to the expense.
- [ ] Given a submission with one or more new categories and/or one or more new tags, when the user submits, then the confirmation page lists every new name alongside the expense preview.
- [ ] Given the user clicks Confirm on a multi-creation confirmation page, when the transaction runs, then every new row and the expense are created atomically.
- [ ] Given the user clicks Cancel, when the form re-renders, then the tag CSV input retains its full typed value.
- [ ] Given a tag name empty after trim or > 20 chars, when the user submits, then a field-level error is shown and no confirmation page is rendered.
- [ ] Given an expense has tags, when the list renders, then the row shows the tags.

### User stories addressed

- User story 7: multiple tags (no-JS subset; chip picker in Issue 7)
- User story 9: duplicate tag selections silently ignored
- User story 10: inline tag create via "Create tag 'foo'?" prompt
- User story 11: consolidated confirmation (full, across categories + tags)
- User story 12: cancel preserves values (including tag chips/CSV)
- User story 14: tag input works without JS
- User story 18: tag name length error
- User story 20: form re-render preserves tag selections

---
