# Progressive Enhancement UI Walkthrough

*2026-04-27T00:00:00Z*
<!-- rodney-id: placeholder -->

This walkthrough documents the progressive enhancement UI for the expense entry form, showing the visual states of the category combobox and tag chip picker with JavaScript enabled.

## 1. Category Combobox — Initial State

When the `/expenses` page loads with JS enabled:
- The category input (`data-testid="expense-form-category"`) is enhanced by `category-combobox.js`.
- The input shows a placeholder: "Type a category".
- A visually hidden label is associated with the input for accessibility.

### User Interaction: Typing to filter

1. User types `ut` into the category input.
2. A dropdown (`data-testid="category-combobox-dropdown"`) appears below the input with `role="listbox"`.
3. The dropdown shows matching options (e.g. "Utilities", "Transport") as rows (`data-testid="category-combobox-option-0"`, etc.).
4. Each row is a `<div>` with full-width click target.

### User Interaction: Selecting by click

1. User clicks the "Utilities" option.
2. The dropdown hides.
3. The input value is set to `Utilities`.
4. The original `<input name="category">` is updated so form submission works identically to the no-JS path.

### User Interaction: Creating a new category

1. User types `NonexistentCategory` (no existing match).
2. The dropdown shows a single "Create 'NonexistentCategory'" row (`data-testid="category-combobox-create-row"`).
3. User clicks the create row.
4. The input value is set to `NonexistentCategory`.
5. The dropdown hides. The server-side confirmation flow (Issue 05) handles actual creation on form submission.

## 2. Tag Chip Picker — Initial State

When the `/expenses` page loads with JS enabled:
- The tags CSV input (`data-testid="expense-form-tags"`) is hidden by `tag-chip-picker.js`.
- A chip container (`data-testid="tag-chip-picker-chips"`) with `role="list"` appears.
- A new free-text input (`data-testid="tag-chip-picker-input"`) appears for typing new tags.
- The container shows no chips initially (empty state).

### User Interaction: Adding chips by click

1. User clicks into the chip picker input.
2. User types `fo`.
3. A suggestion dropdown (`data-testid="tag-chip-picker-suggestions"`) with `role="listbox"` appears below.
4. The dropdown shows matching tags (e.g. "food", "fun") as rows (`data-testid="tag-chip-picker-suggestion-0"`).
5. User clicks "food".
6. A chip (`data-testid="tag-chip-picker-chip-0"`) appears in the chip container with text `food` and a remove button (`data-testid="tag-chip-picker-remove-0"`).
7. The hidden `<input name="tags">` is updated to `food`.

### User Interaction: Adding chips by keyboard

1. User types `ur`.
2. The suggestion dropdown shows "urgent".
3. User presses `Enter`.
4. A second chip `urgent` appears.
5. The hidden input updates to `food,urgent`.

Alternatively:
1. User types `work,home` followed by a comma.
2. Two chips `work` and `home` appear (if they are valid non-empty strings).
3. The hidden input updates to `food,urgent,work,home`.

### User Interaction: Removing chips

1. User clicks the remove button on the `food` chip.
2. The `food` chip disappears.
3. The hidden input updates to `urgent`.

Alternatively:
1. User focuses the free-text input.
2. User presses `Backspace` with the input empty.
3. The last chip (`urgent`) is removed.
4. The hidden input becomes empty.

### User Interaction: Creating a new tag

1. User types `newtag` (no existing match in the embedded JSON).
2. The suggestion dropdown shows "Create 'newtag'" (`data-testid="tag-chip-picker-create-row"`).
3. User presses `Enter` or clicks the create row.
4. A chip `newtag` appears in the container.
5. The hidden input is updated. The server-side confirmation flow (Issue 06) handles actual tag creation on form submission.

## 3. No-JS Fallback State

When JavaScript is disabled (`javaScriptEnabled: false` in Playwright):
- The category input remains a plain `type="text"` field with `data-testid="expense-form-category"`.
- No dropdown appears when typing.
- The tags input remains a plain `type="text"` field with `data-testid="expense-form-tags"`.
- No chips or suggestions appear.
- The user types comma-separated tag names directly.
- Form submission and server-side validation behave identically to the JS-on path.

## 4. Form Submission — JS-on

1. User fills description, amount, date, category (via combobox), and tags (via chip picker).
2. User clicks the submit button (`data-testid="expense-form-create"`).
3. The hidden tags input contains the comma-separated chip list.
4. The form POSTs to `/expenses` with the same field names as the no-JS path.
5. Server-side validation and creation proceed identically.
6. On success, the page redirects back to `/expenses` with the new expense row showing the selected category and alphabetised tags.
