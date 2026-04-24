## Issue 7: Progressive-enhancement JS — category combobox and tag chip picker

**Type**: AFK
**Blocked by**: Issue 6

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

Two vanilla-JS modules served as static assets and auto-initialized on DOM elements carrying specific `data-*` attributes:

- `public/js/category-combobox.js`: turns the category text input into a searchable combobox showing existing categories filtered by typed substring, with a "Create 'foo'" affordance when no exact match is found. On submit, posts the selected or typed name exactly as the no-JS path does.
- `public/js/tag-chip-picker.js`: turns the tag CSV input into a searchable picker that accumulates selections as chips with a × remove control. A hidden input carries the selected-tag CSV (identical wire format to the no-JS path). Typing a new name offers a "Create 'foo'" chip affordance.

Both inputs degrade gracefully: without JS, the existing no-JS inputs from Issues 5 and 6 remain functional unchanged. The server-side confirmation/create flow is identical for both paths.

See PRD section _Client JS (progressive enhancement)_, user stories 5 (full searchable), 7 (full chip picker), 8.

### How to verify

- **Manual**:
  1. With JS enabled: type into category; confirm dropdown filters and "Create 'x'" option appears. Select a suggestion; confirm the hidden input's value.
  2. Type a tag; press Enter; confirm a chip appears. Click × on a chip; confirm removal.
  3. Submit; confirm server behaviour is identical to the no-JS path.
  4. Disable JS in the browser; confirm plain text / CSV inputs still submit successfully and produce the same server-side result.
- **Automated**: Playwright e2e with default (JS-on) browser exercising combobox filtering, chip add, chip remove, and submit. Add a JS-disabled smoke test for each enhanced input confirming the fallback path still works.

### Acceptance criteria

- [ ] Given JS is enabled, when the user types in the category input, then a filtered dropdown of existing categories plus a "Create 'foo'" row appears.
- [ ] Given JS is enabled, when the user selects a tag from the picker, then a chip with a × control is added and the hidden CSV input includes that tag name.
- [ ] Given JS is enabled, when the user clicks a chip's ×, then the chip is removed and the hidden input no longer contains that tag name.
- [ ] Given JS is disabled, when the user submits the entry form, then the category and tag text/CSV inputs flow through the same server-side confirmation path as Issues 5 and 6.

### User stories addressed

- User story 5: searchable category dropdown (full)
- User story 7: chip picker (full)
- User story 8: remove tag chip by ×

---
