# Tasks for #07: Progressive-enhancement JS — category combobox and tag chip picker

Parent issue: `Notes/issues/07-progressive-enhancement-js.md`
Parent PRD: `Notes/PRD-expense-log.md`

## Tasks

### 1. Add `listTags` DB helper

**Type**: WRITE
**Output**: `src/lib/db/expense-access.ts` exports `listTags(db): Promise<Result<TagRow[], Error>>` returning every tag ordered by `name ASC`, wrapped with `withRetry` in the same shape as the existing `listCategories` helper.
**Depends on**: none

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Match the drizzle import style, `Result` wrapping, and `withRetry` pattern already used by `listCategories` in the same file. The helper is HTTP-agnostic — it does not know about the request.

---

### 2. Unit test for `listTags`

**Type**: TEST
**Output**: `tests/expense-access.spec.ts` covers `listTags`: returns `ok([])` on an empty table; returns the full set ordered by `name ASC` when several tags are seeded with mixed-case names preserved as-stored.
**Depends on**: 1

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Reuse whatever test-DB harness the Issue 05 / Issue 06 helper tests use — do not invent a new harness. If those tests deferred DB assertions to e2e, mirror that decision here and document it in the file header.

---

### 3. Embed existing categories and tags in the entry-form page

**Type**: WRITE
**Output**: The GET `/expenses` handler in `src/routes/expenses/build-expenses.tsx` calls `listCategories` and `listTags` alongside the existing list query. The rendered page emits two JSON payloads inside `<script type="application/json">` tags with stable testids `data-testid="categories-data"` and `data-testid="tags-data"`, each containing a plain array of `{ name: string }` (lower-cased as stored). The category `<input name="category">` gains a `data-category-combobox` attribute; the tags `<input name="tags">` gains a `data-tag-chip-picker` attribute. No client JS is loaded yet. Both inputs remain fully functional for the no-JS path — their existing attributes, `value` bindings, and field-error blocks are unchanged.
**Depends on**: 1

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Use the `value` attribute (not `defaultValue`). Keep the JSON payloads small — only the fields the client JS actually needs. Escape the JSON properly so a stray `</script>` in data cannot break out (standard practice: replace `<` with `\u003c`).

---

### 4. Load the progressive-enhancement scripts on the entry-form page

**Type**: WRITE
**Output**: The entry-form page (and only that page) emits `<script src="/js/category-combobox.js" defer>` and `<script src="/js/tag-chip-picker.js" defer>` at the end of its rendered tree. Confirm the Cloudflare static-assets binding in `wrangler.jsonc` already serves `/js/...` out of `./public/` — if it does, no config change is needed; if it does not, extend the binding minimally so `public/js/*.js` is reachable at `/js/*.js`. Create an empty `public/js/` directory (with a placeholder `.gitkeep` if required) so the module files in tasks 5 and 9 have a home.
**Depends on**: 3

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Do not add these scripts to `src/renderer.tsx` — they must only load on the entry-form page so other pages pay zero cost.

---

### 5. Scaffold `category-combobox.js` — init and data load

**Type**: WRITE
**Output**: `public/js/category-combobox.js` is a self-contained vanilla-JS module (no frameworks, no build step, no imports). On `DOMContentLoaded` it finds every element with `data-category-combobox`, reads the sibling `categories-data` JSON block, and attaches an internal controller per input that exposes `{ getValue, setValue, getCategories, open, close }` on a module-private `WeakMap`. The controller also builds the listbox container DOM (empty, hidden, `role="listbox"`, unique id linked to the input via `aria-controls` and `aria-owns`) and hooks `input` / `focus` / `blur` / `keydown` handlers that currently only toggle `aria-expanded` and call no-op render/select functions exported from the module. Must be safe to run with zero `data-category-combobox` elements present (no-op). No user-visible behavior yet beyond focus/blur causing `aria-expanded` to flip.
**Depends on**: 4

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Use arrow functions and functional style — no classes. Keep all module state in closures or a single top-level `WeakMap` keyed by the input element. Use `addEventListener`, not inline handlers.

---

### 6. Implement `category-combobox.js` — render, filter, select, keyboard

**Type**: WRITE
**Output**: The scaffolded module now (a) renders a filtered dropdown of categories whose `name` contains the typed substring case-insensitively, (b) shows a "Create '<typed>'" row when the typed value does not exact-match any category (case-insensitive), (c) supports ArrowUp / ArrowDown / Enter / Escape / Tab keyboard navigation with a visible active-option highlight and `aria-activedescendant`, (d) on mouse click or Enter writes the chosen or typed name verbatim into the underlying `name="category"` input so the submitted form is byte-identical to the no-JS path, and (e) closes on blur-outside and on Escape. Every interactive row gets a `data-testid` of `category-combobox-option-<slug>` and the "Create" row gets `data-testid="category-combobox-create"`. The dropdown container gets `data-testid="category-combobox-dropdown"`.
**Depends on**: 5

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. ALWAYS put braces around `if` / `while` bodies. Use `data-testid` in `name-action` form for interactive rows. Do not hard-code category lists — read from the JSON payload attached in task 3.

---

### 7. Playwright e2e for category combobox (JS-on)

**Type**: TEST
**Output**: New spec `e2e-tests/expenses/06-category-combobox-js.spec.ts` signs in, seeds at least two categories (e.g. `groceries`, `utilities`), visits `/expenses`, and exercises: typing `gr` filters the dropdown to `groceries`; ArrowDown + Enter selects it and the `expense-form-category` input's `value` is `groceries`; submitting with remaining valid fields goes straight to `/expenses` (no confirmation page) and the new row shows category `groceries`; typing a brand-new name `rent` surfaces the `category-combobox-create` row, clicking it fills the input, and submitting routes through the existing `confirm-create-new-page` — confirm and assert the row is created with the new category.
**Depends on**: 6

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Use the sign-in / seed helpers from `e2e-tests/support/`. Follow the structure of `e2e-tests/expenses/03-validation-errors.spec.ts`. Default Playwright browsers have JS enabled — no extra context config needed.

---

### 8. Scaffold `tag-chip-picker.js` — init, data load, initial-value parse

**Type**: WRITE
**Output**: `public/js/tag-chip-picker.js` is a self-contained vanilla-JS module. On `DOMContentLoaded` it finds every element with `data-tag-chip-picker`, reads the sibling `tags-data` JSON block, parses the input's existing `value` CSV into an initial chip-name array (using the same trim / lower-case / empty-drop / first-appearance-dedupe semantics as `parseTagCsv`), and mounts a wrapper DOM around the original input: a chip surface, a visually separate search input, and an empty suggestions listbox — all with a stable set of testids (`tag-chip-picker-surface`, `tag-chip-picker-input`, `tag-chip-picker-list`). The original `name="tags"` input is converted to `type="hidden"` and kept in sync with the chip state (initially the same CSV it started with, re-serialized from the parsed chips). The module exposes `{ getChips, setChips, addChip, removeChip }` on a module-private `WeakMap`. No filtering, no rendering of chips or suggestions yet — just the skeleton and the hidden-input sync.
**Depends on**: 4

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Use arrow functions and functional style — no classes. Re-implement the `parseTagCsv` normalization locally rather than trying to share code with the server — keep the client module dependency-free. Match the server wire format exactly: comma-separated, no surrounding spaces.

---

### 9. Implement `tag-chip-picker.js` — chips, suggestions, add, remove, keyboard

**Type**: WRITE
**Output**: The scaffolded module now (a) renders the current chip array as `<span>`-based chips each containing the name and a `<button type="button">` × with `data-testid="tag-chip-<slug>-remove"`, (b) as the user types into the search input, renders a filtered suggestion list of tags whose `name` includes the typed substring (case-insensitive) minus already-selected chips, (c) shows a "Create '<typed>'" row when the typed value does not exact-match any known tag and is not already a chip, (d) adds a chip on Enter, Comma, mouse click on a suggestion, or click on the Create row, (e) removes a chip on × click or on Backspace when the search input is empty, (f) keeps the hidden `name="tags"` input's `value` in sync with the chip state as a normalized CSV after every change, (g) is ARIA-compliant (`role="combobox"` on the search input, `role="listbox"` on suggestions, `role="option"` on each row, `aria-activedescendant` during keyboard navigation). Suggestion rows get `data-testid="tag-chip-picker-option-<slug>"`; the Create row gets `data-testid="tag-chip-picker-create"`.
**Depends on**: 8

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. ALWAYS put braces around `if` / `while` bodies. Every chip and suggestion name rendered to the DOM must go through `textContent` (never `innerHTML`) so tag names are safe against injection. Keep the hidden input's CSV format byte-identical to what the no-JS path would POST for the same chip set.

---

### 10. Playwright e2e for tag chip picker (JS-on)

**Type**: TEST
**Output**: New spec `e2e-tests/expenses/07-tag-chip-picker-js.spec.ts` signs in, seeds an existing tag (e.g. `groceries`) and category, visits `/expenses`, and exercises: typing `gro` surfaces `groceries` in the suggestion list; Enter adds a chip; typing `food` surfaces `tag-chip-picker-create` and clicking it adds a `food` chip; the hidden `expense-form-tags` input's `value` is now `groceries,food` (order = add order, normalized); clicking the × on the `groceries` chip removes it and the hidden input becomes `food`; submitting routes through `confirm-create-new-page`, lists `Create tag 'food'`, confirm, and the new row's `expense-row-tags` is `food`. A second flow pre-seeds the form (via a server-side redirect with a typed CSV) and asserts the chips re-hydrate correctly from the hidden input's initial `value`.
**Depends on**: 9

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Use the sign-in / seed helpers from `e2e-tests/support/`. Follow the structure of the Issue 06 tags e2e spec.

---

### 11. Playwright JS-disabled fallback smoke tests

**Type**: TEST
**Output**: New spec `e2e-tests/expenses/08-no-js-fallback.spec.ts` that builds a Playwright context with `javaScriptEnabled: false`, signs in, visits `/expenses`, and asserts: the category `<input>` is still a plain text input (no combobox dropdown appears on focus); the tags `<input>` is still a plain text input (no chip surface mounts); submitting with all-existing values reaches `/expenses` directly and creates the row; submitting with a brand-new category and new tag CSV reaches `confirm-create-new-page` and, after confirm, creates the row — proving the Issues 5/6 server flow is untouched.
**Depends on**: 6, 9

Read and follow the non-functional requirements and coding standards specified in the files under `Notes/non-functional-reqs/`. Build the disabled-JS context via `browser.newContext({ javaScriptEnabled: false })` inside the spec rather than globally in `playwright.config.ts`. Follow the structure of existing expense e2e specs for sign-in, seeding, and assertions.

---

### 12. Update the wiki

**Type**: DOCUMENT
**Output**: Wiki under `Notes/wiki/` documents: the new `listTags` helper in `expense-access`; the embedded `categories-data` / `tags-data` JSON contract on the entry-form page; the `data-category-combobox` / `data-tag-chip-picker` auto-init hooks; the two new `public/js/` modules and their public `data-testid` surface; and the progressive-enhancement guarantee that JS-off behavior is identical to Issues 5 / 6. `Notes/wiki/index.md` and `Notes/wiki/log.md` updated per `Notes/wiki/wiki-rules.md`.
**Depends on**: 11

Follow `Notes/wiki/AGENT.md` and `Notes/wiki/wiki-rules.md`. Cross-link to the Issue 05 inline-category pages and the Issue 06 tags pages. Append a single `## [YYYY-MM-DD] ingest | Issue 07: progressive-enhancement JS` entry to `log.md`.

---

### 13. Code walkthrough

**Type**: CODE WALKTHROUGH
**Output**: A showboat walkthrough under `Notes/walkthroughs/07-progressive-enhancement-js/code-walkthrough/` covering the JSON embed, the two scaffolded JS modules, the render/interaction layers, the hidden-input sync contract, and the JS-on vs JS-off equivalence.
**Depends on**: 12

Run `uvx showboat --help` first to confirm current flags, then generate into the new directory.

---

### 14. UI walkthrough

**Type**: UI WALKTHROUGH
**Output**: A showboat + rodney walkthrough under `Notes/walkthroughs/07-progressive-enhancement-js/ui-walkthrough/` with screenshots showing: the category combobox filtering and "Create 'x'" affordance; the tag chip picker adding / removing chips; the full JS-on submit path through the confirmation page; and a side-by-side JS-disabled submission proving the fallback still works.
**Depends on**: 13

Run `uvx showboat --help` and `uvx rodney --help` first to confirm current flags, then generate into the new directory.

---

### 15. Final human review

**Type**: REVIEW
**Output**: User confirms every manual verification step and every acceptance-criterion checkbox from the issue's _How to verify_ / _Acceptance criteria_ sections is satisfied.
**Depends on**: 14

---
