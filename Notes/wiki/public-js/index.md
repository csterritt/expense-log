# Public JS — Progressive-enhancement modules

These vanilla-JS modules under `public/js/` progressively enhance the
expenses entry form, edit forms, recurring forms, and list filter when
JavaScript is enabled. They are loaded via `<script defer>` tags emitted
by the route pages. With JS off, the pages fall
back to plain `<input type="text">` controls and the no-JS server flow
established in Issues 5 / 6.

## Activation hooks

The server emits opt-in attributes on the inputs:

- `data-category-combobox` on `<input name="category">`.
- `data-tag-chip-checkboxes` on the tag chip-checkbox container (via `data-testid="tag-chip-checkboxes"`).
- `data-tag-chip-picker` on `<input name="tags">` (legacy, replaced by chip-checkboxes in Issue 18).

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

### `public/js/tag-chip-checkboxes.js` (Issue 18)

Progressive-enhancement for the shared `TagChipCheckboxes` component.
Self-contained vanilla JS — no frameworks, no build step, no imports.

Responsibilities:
- Reflects `:checked` state via a class hook (`CHIP_CLASS_BASE` / `CHIP_CLASS_SELECTED`) for browsers that need it.
- Optimistically renders typed `newTags` tokens as already-selected chip previews next to the existing chip block using `textContent` and `setAttribute` only — never `innerHTML`.

Security contract:
- `setAttribute` is restricted to the safe allow-list: `class`, `aria-label`, `data-*`.
- User-controlled values reach the DOM only via `textContent` (and `aria-label`).
- Optimistic chips are `<span>` elements (never `<input>`/`<button>`/`<select>`).
- Init failures are swallowed and logged via `console.error`.
- Native checkbox toggling and form submission work even when this script throws.

The `CHIP_CLASS_BASE` and `CHIP_CLASS_SELECTED` constants are duplicated as named module-level constants in both `src/components/tag-chip-checkboxes.tsx` and `public/js/tag-chip-checkboxes.js` (not extracted into a shared file, since this project has no JS build step). A parity test in the component test file asserts these constants match verbatim.

Loaded on the entry form, edit form, recurring create/edit forms, and list filter page. Idempotent on re-init.

### `public/js/tag-chip-picker.js` (legacy, replaced in Issue 18)

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

With JavaScript disabled none of the enhancement modules mount: the
category and tag inputs remain plain `<input type="text">` controls,
the tag checkboxes remain native server-rendered checkboxes, the form
posts the exact same fields, and the Issue 5 / Issue 6 server flow
(direct create when everything matches; consolidated
`confirm-create-new` page when anything is new) handles the submission
unchanged. The `08-no-js-fallback.spec.ts` and `21-entry-no-js-and-broken-js.spec.ts`
Playwright specs prove this end-to-end by running the same flows in a
`javaScriptEnabled: false` context and with a throwing JS module.
