# Public JS — Progressive-enhancement modules

These vanilla-JS modules under `public/js/` progressively enhance the
expenses entry form when JavaScript is enabled. They are loaded only on
the entry-form page (`/expenses`) via `<script defer>` tags emitted by
`src/routes/expenses/build-expenses.tsx`. With JS off, the page falls
back to plain `<input type="text">` controls and the no-JS server flow
established in Issues 5 / 6.

## Activation hooks

The server emits two opt-in attributes on the inputs:

- `data-category-combobox` on `<input name="category">`.
- `data-tag-chip-picker` on `<input name="tags">`.

A module that finds zero matching elements is a no-op.

## Embedded data contracts

Two `<script type="application/json">` payloads are embedded in the
form:

- `data-testid="categories-data"` — `[{ name: string }]`, lower-cased
  as stored, sorted by `name ASC`.
- `data-testid="tags-data"` — same shape, also sorted by `name ASC`.

Each module reads its sibling JSON via
`document.querySelector('script[data-testid="..."]')` and
`JSON.parse(node.textContent)`. The server escapes `<`, `>`, and `&`
to `\u003c` / `\u003e` / `\u0026` so a stray closing tag inside a
data field cannot break out of the script element.

## Modules

### `public/js/category-combobox.js`

Mounts a single combobox controller per `data-category-combobox`
input. On focus / typing it shows a filtered listbox of categories
that contain the typed substring (case-insensitive). When the typed
value does not exact-match any category, a `Create '<typed>'` row
appears at the bottom. On Enter / mouse selection the chosen name is
written verbatim into the underlying input so the form POST is
byte-identical to the no-JS path. Keyboard support: ArrowUp,
ArrowDown, Enter, Escape, Tab. ARIA: `role="combobox"` on the input,
`role="listbox"` on the dropdown, `aria-expanded`, `aria-controls`,
`aria-owns`, `aria-activedescendant`. Test surface:
`category-combobox-dropdown`, `category-combobox-option-<slug>`,
`category-combobox-create`.

### `public/js/tag-chip-picker.js`

Mounts a chip picker per `data-tag-chip-picker` input. On init it
parses the input's existing value with a local copy of the server's
`parseTagCsv` (trim → drop empties → lower-case → de-duplicate by
first appearance), converts the original input to `type="hidden"`,
and renders a chip surface plus a separate search input and an empty
suggestions listbox. Typing filters suggestions case-insensitively
and excludes already-selected chips; a `Create '<typed>'` row
appears when the typed value is not an exact match and is not yet
chosen. Chips are added on Enter / Comma / mouse click, and removed
via the chip's × button or via Backspace when the search input is
empty. The hidden input's `value` is kept in sync as a normalized
CSV (comma-separated, no spaces) after every change so the form POST
is byte-identical to what the no-JS path would submit. Names are
inserted via `textContent` only (never `innerHTML`). Test surface:
`tag-chip-picker-surface`, `tag-chip-picker-input`,
`tag-chip-picker-list`, `tag-chip-picker-option-<slug>`,
`tag-chip-picker-create`, `tag-chip-<slug>`,
`tag-chip-<slug>-remove`.

## Progressive-enhancement guarantee

With JavaScript disabled neither module mounts: the category and tags
inputs remain plain `<input type="text">` controls, the form posts the
exact same fields, and the Issue 5 / Issue 6 server flow (direct
create when everything matches; consolidated `confirm-create-new` page
when anything is new) handles the submission unchanged. The
`08-no-js-fallback.spec.ts` Playwright spec proves this end-to-end by
running the same flows in a `javaScriptEnabled: false` context.
