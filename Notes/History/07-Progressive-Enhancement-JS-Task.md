# Cascade Chat Conversation

  Note: _This is purely the output of the chat conversation and does not contain any raw data, codebase snippets, etc. used to generate the output._

### User Input

Read the file SKILL.md under @[Notes/skills/issue-to-tasks]  and do what it says. the issue to write tasks for is @[Notes/issues/07-progressive-enhancement-js.md] 

*Viewed [SKILL.md](file:///home/chris/expense-log/Notes/skills/issue-to-tasks/SKILL.md) *

*Viewed [07-progressive-enhancement-js.md](file:///home/chris/expense-log/Notes/issues/07-progressive-enhancement-js.md) *

*Listed directory [issues](file:///home/chris/expense-log/Notes/issues) *

*Listed directory [non-functional-reqs](file:///home/chris/expense-log/Notes/non-functional-reqs) *

*Listed directory [public](file:///home/chris/expense-log/public) *

*Listed directory [Notes](file:///home/chris/expense-log/Notes) *

*Searched filesystem*

*Searched filesystem*

*Viewed [06-tags-no-js-inline-creation.md](file:///home/chris/expense-log/Notes/tasks/06-tags-no-js-inline-creation.md) *

*Viewed [coding-style.md](file:///home/chris/expense-log/Notes/non-functional-reqs/coding-style.md) *

*Viewed [web-behavior.md](file:///home/chris/expense-log/Notes/non-functional-reqs/web-behavior.md) *

*Grep searched codebase*

*Listed directory [db](file:///home/chris/expense-log/src/lib/db) *

*Listed directory [walkthroughs](file:///home/chris/expense-log/Notes/walkthroughs) *

*Grep searched codebase*

*Grep searched codebase*

*Grep searched codebase*

*Grep searched codebase*

*Grep searched codebase*

*Viewed [index.ts](file:///home/chris/expense-log/src/index.ts) *

*Viewed [renderer.tsx](file:///home/chris/expense-log/src/renderer.tsx) *

*Grep searched codebase*

*Grep searched codebase*

*Grep searched codebase*

### Planner Response

I have enough context. Here's the proposed task list for Issue 7. I'll quiz you before writing the file.

# Proposed Tasks for Issue 7: Progressive-enhancement JS

## 1. Add `listTags` DB helper
**Type**: WRITE
**Output**: `listTags(db)` in `@/home/chris/expense-log/src/lib/db/expense-access.ts:1` returns `Result<TagRow[], Error>` of all tags ordered by name asc, wrapped in `withRetry`.
**Depends on**: none

## 2. Embed existing categories and tags in the entry-form page as JSON
**Type**: WRITE
**Output**: GET `/expenses` handler in `@/home/chris/expense-log/src/routes/expenses/build-expenses.tsx:1` calls `listCategories` and the new `listTags`, and the rendered page emits two `<script type="application/json">` blocks with stable testids (e.g. `data-testid="categories-data"`, `data-testid="tags-data"`) carrying just the `name` arrays. The category text input gets a `data-category-combobox` attribute and a sibling hidden listbox container; the tags CSV input gets a `data-tag-chip-picker` attribute with placeholder DOM hooks the JS module will populate. No JS yet.
**Depends on**: 1

## 3. Load the progressive-enhancement scripts
**Type**: WRITE
**Output**: The entry-form page (only) emits `<script src="/js/category-combobox.js" defer>` and `<script src="/js/tag-chip-picker.js" defer>`. Files are referenced from `public/js/`. Confirm the Cloudflare static-assets binding under `@/home/chris/expense-log/wrangler.jsonc:11` already serves `/js/...` from [./public](file:///home/chris/expense-log/public:0:0-0:0).
**Depends on**: 2

## 4. Implement `category-combobox.js`
**Type**: WRITE
**Output**: `public/js/category-combobox.js` is a self-contained vanilla module that auto-initializes on every element with `data-category-combobox`. It reads the categories JSON from the embedded script tag, renders a filtered dropdown as the user types, shows a "Create '<typed>'" affordance when no exact case-insensitive match exists, supports keyboard navigation (Up/Down/Enter/Escape), and on selection writes the chosen or typed name back into the original `name="category"` input so submission is identical to the no-JS path. Must be ARIA-compliant (`role="combobox"`, `aria-expanded`, `aria-activedescendant`). No frameworks, no build step.
**Depends on**: 3

## 5. Playwright e2e for category combobox (JS-on)
**Type**: TEST
**Output**: New spec under `e2e-tests/expenses/` that signs in, seeds categories, visits `/expenses`, types into the category input, asserts the filtered dropdown and "Create 'foo'" row, selects an existing match and submits — confirming the existing-match server branch fires (no confirmation page). A second flow types a brand-new name, picks the "Create" affordance, and confirms the existing inline-creation confirmation flow runs unchanged.
**Depends on**: 4

## 6. Implement `tag-chip-picker.js`
**Type**: WRITE
**Output**: `public/js/tag-chip-picker.js` auto-initializes on every element with `data-tag-chip-picker`. It reads the tags JSON, replaces the visible CSV input with a chip surface plus a search input, shows a filtered suggestion list and a "Create '<typed>'" row, accumulates selections as chips with a × button, and keeps a hidden input named `tags` in sync as a CSV in the exact wire format the no-JS path posts. Supports keyboard add (Enter/Comma) and chip removal (Backspace on empty / × click). ARIA-compliant. Pre-populates chips from the hidden input's existing `value` so server-redirect re-renders restore prior selections.
**Depends on**: 3

## 7. Playwright e2e for tag chip picker (JS-on)
**Type**: TEST
**Output**: Spec exercising: add chips for existing tags, add a chip for a brand-new name, remove a chip via ×, submit and assert the combined confirmation page lists the right `Create tag '...'` lines, confirm and assert the row's `expense-row-tags` matches. Also covers the cancel-and-restore path.
**Depends on**: 6

## 8. Playwright JS-disabled fallback smoke tests
**Type**: TEST
**Output**: Spec(s) using a Playwright context with `javaScriptEnabled: false` that submit the entry form via the plain category text input and the plain tags CSV input, asserting the existing Issues 5/6 server flow still produces the same result for both an all-existing submission and a new-category-plus-new-tag submission.
**Depends on**: 4, 6

## 9. Update wiki
**Type**: DOCUMENT
**Output**: Wiki under [Notes/wiki/](file:///home/chris/expense-log/Notes/wiki:0:0-0:0) documents the two PE modules, the embedded JSON contract, the new `listTags` helper, and the `data-*` hooks. `index.md` and `log.md` updated per `Notes/wiki/wiki-rules.md`.
**Depends on**: 8

## 10. Code walkthrough
**Type**: CODE WALKTHROUGH
**Output**: Showboat walkthrough under `Notes/walkthroughs/07-progressive-enhancement-js/code-walkthrough/` covering the JSON embed, the two JS modules, and the JS-on/JS-off contract.
**Depends on**: 9

## 11. UI walkthrough
**Type**: UI WALKTHROUGH
**Output**: Showboat + rodney screenshots under `Notes/walkthroughs/07-progressive-enhancement-js/ui-walkthrough/` showing combobox filtering, "Create 'x'" affordance, chip add/remove, and submit.
**Depends on**: 10

## 12. Final human review
**Type**: REVIEW
**Output**: User confirms every manual verification step and acceptance-criterion checkbox from the issue is satisfied.
**Depends on**: 11

---

*Asked user a question*

*Edited relevant file*

### Planner Response

# Summary

Wrote the task breakdown to `@/home/chris/expense-log/Notes/tasks/07-progressive-enhancement-js.md` with your requested split: tasks 4 and 6 from the draft are now each two tasks — `5`/`6` for the category combobox (scaffold, then render/interact) and `8`/`9` for the tag chip picker (scaffold, then render/interact). The JS-on e2e tests (7, 10) follow their respective render tasks, plus a standalone JS-off fallback spec (11), then DOCUMENT (12), CODE WALKTHROUGH (13), UI WALKTHROUGH (14), and REVIEW (15).

**Key design choices baked in**:

- **Data source**: embedded `<script type="application/json">` blocks (testids `categories-data`, `tags-data`) rather than a new endpoint — no CSRF, no extra round-trip.
- **Hidden-input contract**: both modules mutate the existing `name="category"` / `name="tags"` inputs so the server POST is byte-identical to the no-JS path.
- **Scripts**: loaded only on the entry-form page via `<script defer>`, served from the existing [./public](file:///home/chris/expense-log/public:0:0-0:0) static-assets binding in `@/home/chris/expense-log/wrangler.jsonc:11`.