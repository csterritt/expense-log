# public/js/category-combobox.js

Progressive-enhancement category combobox for expense/recurring entry forms. Self-contained vanilla JS IIFE — no frameworks, no build step, no imports.

## Activation

Any `<input data-category-combobox>` on the page. Data source: `<script type="application/json" data-testid="categories-data">`.

## Features

- Filters existing categories by typed text (case-insensitive substring match)
- Shows "Create '<typed>'" option when no exact match exists
- Full keyboard navigation: ArrowUp/Down to move, Enter/Tab to select, Escape to close
- ARIA combobox roles: `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`
- Click outside to close dropdown
- Writes chosen name verbatim into the underlying input — form POST is byte-identical to no-JS path

## Internal Structure

- `slugify(s)` — converts name to URL-safe slug for test IDs
- `readCategories()` — reads and parses categories JSON from `<script>` tag
- `filterMatches(categories, typed)` — substring filter
- `hasExactMatch(categories, typed)` — case-insensitive exact match check
- `createController(input, categories)` — creates dropdown, wires events, returns controller object
- `init()` — finds all `[data-category-combobox]` inputs and initializes controllers

## Security

- No `innerHTML` — uses `textContent` and `createElement` only
- User input only reaches DOM through input value and option text content
