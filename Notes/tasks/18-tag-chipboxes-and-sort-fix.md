# Tasks for #18: Tag chip-checkbox UI everywhere + chronological time-period sort on Summary

Parent issue: `Notes/issues/18-tag-chipboxes-and-sort-fix.md`
Parent PRD: `Notes/PRD-expense-log.md`

These tasks follow the Red/Green/Refactor discipline described in `Notes/skills/code-writing/always-do-red-green.md`. Each feature is split into a **RED** step (write a failing test first), a **GREEN** step (write the minimal code to make the test pass), and a **REFACTOR** step (clean up once the test is green). Do not skip ahead — RED must fail for the right reason before GREEN begins, and REFACTOR must keep the suite green.

## Tasks

### 1. RED: failing validator tests for the mutation-form tag-input contract

**Type**: RED
**Output**: `tests/expense-validators.spec.ts` adds failing coverage for the new server-authoritative tag-input contract on mutation forms, split into two test groups to keep the validator's HTTP/DB independence intact:

- **(1a) Pure parser unit tests** (no repository in scope): assert that the parser, given a request body and the pre-fetched existing-tag list, produces the right normalized output without any DB call. Each submitted `tagId` is syntactically validated against the exact Crockford-base32 ULID regex `^[0-9A-HJKMNP-TV-Z]{26}$` (uppercase; lowercase input is rejected as invalid format, not silently uppercased) and invalid-format ids are excluded from the parser's `lookupCandidateTagIds` output; the **raw** submitted `tagId` count (before dedupe) is capped (e.g. 64) and exceeding the cap is a recoverable validation error — 65 copies of the same valid id error even though dedupe would yield one; after syntactic + cap filtering, repeated ids are deduped; `newTags` is split on any run of commas and/or ASCII whitespace, then trimmed → lowercased → empties dropped → tokens validated against `^[a-z0-9_-]{1,20}$` → deduped case-insensitively, accepting the separator forms `foo,bar` / `foo bar` / `foo, bar` / `foo,,bar` / `foo\nbar` / `foo,  bar , baz`; a `newTags` token failing the regex or any submission exceeding the raw-length cap (e.g. 500) or post-split token-count cap (e.g. 32) is a recoverable validation error; a `newTags` token matching the lowercase name of an existing tag (selected or not) is normalized into a selection of that existing tag and is not surfaced as a new-tag entry — specifically: the resolved existing tag id is included in the returned `tagIds`, the token is removed from `newTags`, the tag is attached exactly once even if also chip-selected, and on a successful normalization the raw `newTags` text is replaced with the normalized residual (only unresolved new-tag tokens) for round-tripping; on validation error the raw `newTags` text is preserved verbatim. Also include a parallel block for the `categoryId` contract: invalid-format `categoryId` is excluded from the parser's `lookupCandidateCategoryId` output, and a submitted new-category name is normalized identically to a `newTags` token (trim → lowercase → `^[a-z0-9_-]{1,20}$`).
- **(1b) Handler / repository tests** (covered together with task 2's GREEN step): a spy/mock tag repository asserts that only parser-approved (syntactically valid) ids ever reach `listTagsByIds` (and parallel `listCategoriesByIds` for `categoryId`). Tests assert that an unknown or stale `tagId` produces a recoverable global error on the form with all other field values preserved, while invalid-format ids are filtered before any lookup. This group exercises the post handler + parser together; the parser stays HTTP- and DB-agnostic.

Run the suite and confirm the new tests fail before moving on.
**Depends on**: none

Read and follow the project coding standards in `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/always-do-red-green.md`. Reuse the existing validator test structure in `tests/expense-validators.spec.ts`. Assert normalized outputs and `FieldErrors`-shaped errors, not implementation details.

---

### 2. GREEN: implement the mutation-form tag-input validator

**Type**: GREEN
**Output**: `src/lib/expense-validators.ts` exposes a validator (e.g. `parseTagInputs(raw, existingTags)`) producing `{ tagIds: string[]; newTags: string[]; fieldErrors: FieldErrors }` from a request body carrying repeated `tagId` values and a single `newTags` text field, applying the contract covered by task 1. The validator performs ULID syntactic check + raw-count cap before any DB lookup, dedupes after filtering, normalizes `newTags` per the rules in task 1, and folds `newTags` tokens that collide with existing tag names into the `tagIds` set. Tests must include a spy/mock tag repository asserting that syntactically-invalid ids never reach `listTagsByIds` / equivalent lookup. Write only the minimum needed to turn the task-1 tests green.
**Depends on**: 1

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Follow the existing `parseExpenseListFilters` / expense-form validator patterns: HTTP-agnostic input, `FieldErrors`-shaped output, pure function. Keep the exact ULID regex (`^[0-9A-HJKMNP-TV-Z]{26}$`), the new-tag token regex (`^[a-z0-9_-]{1,20}$`), and all caps as named module-level constants. Do not introduce a DB lookup here — accept the existing-tag list as an argument so the caller (post handler) drives the lookup once on the validator's already-syntactically-clean id set.

---

### 3. REFACTOR: tidy the mutation tag-input validator

**Type**: REFACTOR
**Output**: With the new validator tests green, refactor `src/lib/expense-validators.ts` to share helpers with the existing CSV-tag parsing only where it materially reduces duplication; otherwise leave the CSV path alone (task 36 deletes it). Ensure the new module-level constants (caps, regexes) are named and reused. Run the validator suite and confirm it stays green.
**Depends on**: 2

Read and follow `Notes/skills/code-writing/always-do-red-green.md`. Refactors must not change observable behavior; do not add new test cases here — if a gap appears, return to a new RED step instead.

---

### 4. RED: failing parser tests for filter-side `tagId[]` (list + summary)

**Type**: RED
**Output**: `tests/expense-validators.spec.ts` adds failing coverage extending `parseSummaryQuery` and the list-filter parser. Tests assert: syntactically invalid `tagId` values (non-ULID per the regex from task 1) are silently dropped on both the list filter and `/summary`; submitted raw `tagId` count is truncated to the configured cap rather than erroring (page still renders); `parseSummaryQuery` validates the `sort` column against a **dimension-aware** allow-list — `sort=tag` with `dimension=category` or `dimension=time` falls back to the default sort, and `sort=category` with `dimension=tag` or `dimension=time` falls back; unknown sort directions fall back; non-`YYYY-MM-DD` `from`/`to` **and** shape-correct but invalid calendar dates such as `2026-02-31`, `2026-13-01`, `2026-00-10` are treated as absent (silently dropped, no error). Stale-but-syntactically-valid `tagId` removal and the rendered filter UI omitting them is asserted in tasks 31/33 (handler/render layer), not here. Run the suite and confirm the new tests fail before moving on.
**Depends on**: 3

Read and follow the project coding standards in `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/always-do-red-green.md`. Reuse the validator test structure already in `tests/expense-validators.spec.ts`. Assert normalized outputs, not implementation details.

---

### 5. GREEN: extend filter parsers for dimension-aware allow-list + ULID drop

**Type**: GREEN
**Output**: `src/lib/expense-validators.ts` updates `parseSummaryQuery` (and the list-filter parser used by the expense list) to apply the ULID syntactic check + raw-count cap truncation to incoming `tagId` values silently (no error), and to validate `sort.column` against the dimension's result-table columns plus the always-present `count`, `total`, and `timePeriod`. Invalid (out-of-dimension or unknown) sort columns and invalid directions fall back to defaults. Non-`YYYY-MM-DD` `from`/`to` and shape-correct but invalid calendar dates are treated as absent. Write only the minimum needed to turn the task-4 tests green.
**Depends on**: 3, 4

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Reuse the ULID regex constant introduced in task 2 and the existing `isValidYmd` helper. Keep the dimension→valid-columns map as a single named lookup so it composes with the sort-link rendering in `build-summary.tsx`.

---

### 6. REFACTOR: tidy the filter parsers

**Type**: REFACTOR
**Output**: With the new parser tests green, refactor `src/lib/expense-validators.ts` to share repeated-`tagId` accumulation and ULID-filter logic between `parseSummaryQuery` and the list-filter parser without changing observable behavior. Run the validator suite and confirm it stays green.
**Depends on**: 5

Read and follow `Notes/skills/code-writing/always-do-red-green.md`. Do not weaken assertions or introduce new behavior — return to a new RED step if a gap appears.

---

### 7. RED: failing unit tests for chronological summary sort + year-bearing labels

**Type**: RED
**Output**: `tests/summary-access.spec.ts` adds failing coverage asserting: Month rows render `Mmm YYYY` labels (e.g. `Mar 2026`) and sort by an internal `(year, monthIndex 0..11)` key so that `Apr 2026` follows `Jan/Feb/Mar 2026`, never preceding them alphabetically; Quarter rows render `Mmm-Mmm YYYY` labels and sort by `(year, quarterIndex 0..3)` so that `Jan-Mar 2026` precedes `Apr-Jun 2026` precedes `Jul-Sep 2026` precedes `Oct-Dec 2026`; Year rows render `YYYY` and sort numerically; `Dec 2025` and `Jan 2026` with the same category produce two distinct rows (no cross-year aggregation) with `Dec 2025` sorting before `Jan 2026` in default ascending order; clicking the time-period header toggles ascending/descending using the internal key, never the rendered label; when the user sorts by `count`, `total`, `category`, or `tag`, ties retain default group-then-chronological-time-period ordering; in the `Category + Tag` dimension, clicked `category` (asc or desc) ties break on `tag asc` then `timePeriod asc`, and clicked `tag` (asc or desc) ties break on `category asc` then `timePeriod asc`; default sort is group columns ascending (case-insensitive alphabetical for category/tag) then chronological time-period ascending. Run the suite and confirm the new tests fail before moving on.
**Depends on**: none

Read and follow the project coding standards in `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/always-do-red-green.md`. Reuse the seeding harness from existing summary tests. Assert returned `timePeriod` labels and row order, not SQL shape.

---

### 8. GREEN: implement chronological sort + year-bearing labels in `summary-access.ts`

**Type**: GREEN
**Output**: `src/lib/db/summary-access.ts` carries an internal chronological key alongside each row's rendered label: Month → `(year, monthIndex 0..11)` rendered `Mmm YYYY`; Quarter → `(year, quarterIndex 0..3)` rendered `Mmm-Mmm YYYY`; Year → `year` rendered `YYYY`. Month and Quarter rows are keyed by `(year, index)` so different calendar years are distinct rows. Default sort and explicit time-period sort both use the internal key; the rendered label is never compared. Sort by `count`, `total`, `category`, or `tag` breaks ties with default group-then-chronological-time-period ordering. For the `Category + Tag` dimension, clicked group-column tie-breakers are explicit: `sort=category` (asc/desc) breaks ties on `tag asc`, then `timePeriod asc`; `sort=tag` (asc/desc) breaks ties on `category asc`, then `timePeriod asc`. Write only the minimum needed to turn the task-7 tests green.
**Depends on**: 7

Read and follow the project coding standards in `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/database-access`. Match the existing `summary-access.ts` style. Extract the key/label projection into small helpers (`monthKeyAndLabel`, `quarterKeyAndLabel`, `yearKeyAndLabel`) and reuse `et-date` month-name lookup. Do not compare rendered labels anywhere in the sort path.

---

### 9. REFACTOR: tidy `summary-access.ts`

**Type**: REFACTOR
**Output**: With the chronological-sort tests green, refactor `src/lib/db/summary-access.ts` for clarity: collapse the three key/label helpers if a single parameterized helper reads better; tighten the `SummaryRow` type so the internal key is required but excluded from any serialized payload; ensure the dimension-driven column shape is unaffected. Run the full unit-test suite and confirm it stays green.
**Depends on**: 8

Read and follow `Notes/skills/code-writing/always-do-red-green.md` and `Notes/skills/code-writing/database-access`. Refactors must not change observable behavior — return to a new RED step if a gap appears.

---

### 10. RED: failing component-level tests for the shared `tag-chip-checkboxes` component

**Type**: RED
**Output**: A new test file (e.g. `tests/tag-chip-checkboxes.spec.ts` or an e2e fixture under `e2e-tests/`) asserts the shared component renders: every supplied tag as a labeled `<input type="checkbox" name="tagId" value="<ulid>">` styled as a chip, alphabetically sorted case-insensitively, wrapping via `flex-wrap`/`gap-2`; selected chips visually distinct from unselected via a stable class hook; chip labels safely render user-controlled tag names (including a stored value containing HTML metacharacters like `<script>`) via JSX default escaping; optional adjacent `newTags` text input is present only when the `allowNewTags` prop is true; with an empty supplied tag list, the component renders no chips and — on mutation forms (`allowNewTags=true`) — still renders the `newTags` input and a small empty-state hint (e.g. “No tags yet.”), while on filter forms (`allowNewTags=false`) it renders no chips and no input; the component is dropdown-free and works without JS. Run the suite and confirm the tests fail before moving on.
**Depends on**: none

Read and follow `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/styling-html-and-tsx`. Use the existing list-filter chip rendering in `expense-list-renderer.tsx` (`renderFilterBar`) as the reference for class hooks and structure. Assert rendered HTML attributes and class hooks, not implementation details.

---

### 11. GREEN: build the shared `tag-chip-checkboxes.tsx` component

**Type**: GREEN
**Output**: `src/components/tag-chip-checkboxes.tsx` exports a single component that takes the existing tag list, the set of currently-selected tag ids, an `allowNewTags` flag, and an optional `newTagsValue` prop, and renders the chip block described in task 10 — server-rendered native checkboxes, alphabetical case-insensitive ordering, `flex-wrap`/`gap-2`, selected-vs-unselected styling, JSX-escaped labels, optional adjacent `<input type="text" name="newTags">` when `allowNewTags` is true, empty-state behavior per task 10 (mutation-form hint vs. silent filter-form empty). The component is purely presentational, dropdown-free, and renders correctly without JavaScript. Write only the minimum needed to turn the task-10 tests green.
**Depends on**: 10

Read and follow `Notes/skills/code-writing/styling-html-and-tsx` and the named-export rule in `Notes/skills/AGENTS.md`. Mirror the class hooks already used by `renderFilterBar` so the list filter can adopt the component unchanged. Use `value`/`checked`, never `defaultValue`/`defaultChecked`. Never use `dangerouslySetInnerHTML`.

---

### 12. WRITE: client JS `public/js/tag-chip-checkboxes.js`

**Type**: WRITE
**Output**: `public/js/tag-chip-checkboxes.js` is a new file whose only responsibilities are (a) styling the chip toggle interaction (e.g. reflecting `:checked` state via a class hook for browsers that need it) and (b) optimistically rendering typed `newTags` tokens as already-selected chips next to the existing chip block using `textContent` and `setAttribute` only — never `innerHTML`. `setAttribute` is restricted to a known safe-attribute allow-list (`class`, `aria-label`, `data-*`); user-controlled values must never be used as attribute names, on form-control `value` attributes, as event-handler values (`on*`), or in URL-bearing attributes (`href`, `src`, `formaction`, etc.). Optimistic chips are **non-form-control elements** (rendered as `<span>` or `<div>`, never `<input>` / `<button>` / `<select>`), so user-controlled new-tag text reaches the DOM only via `textContent` (and, if needed, a safe `aria-label`); the submitted form data still flows through the existing native `tagId` checkboxes and `newTags` text input. Init failures are swallowed and logged via `console.error`; native checkbox toggling and form submission must continue to work even when the script throws. The file is validated end-to-end by tasks 14a/14d, 16, 18, 20, 31, and 33 (no-JS and broken-JS fallback assertions); no dedicated RED precedes it because its observable behavior surfaces only through the e2e specs. Update `timestamp-build-filenames.js` if it indexes JS asset names.
**Depends on**: 11

Read and follow `Notes/skills/code-writing/web-behavior`. Do not introduce a build step or framework. Keep the file dependency-free and idempotent on re-init. Never call `innerHTML`, `document.write`, or `eval`.

---

### 13. REFACTOR: tidy the shared component + client JS

**Type**: REFACTOR
**Output**: With the component and JS tests green, refactor for clarity. Because this project has no JS build step (vanilla static JS served from `public/`), the shared chip-class names are **duplicated** as named module-level constants in both `src/components/tag-chip-checkboxes.tsx` and `public/js/tag-chip-checkboxes.js` (not extracted into a shared file). Add a small parity test (in the component test file) that asserts the JS file's exported constants match the component's constants verbatim (e.g. by reading the JS file as text and asserting the expected `const CHIP_CLASS_BASE = '…'` and `const CHIP_CLASS_SELECTED = '…'` lines appear); regressing the duplication is then a test failure rather than a silent drift. Ensure the JS is robust to being loaded on a page with zero existing chips. Re-run the unit suite and any component tests and confirm everything stays green.
**Depends on**: 12

Read and follow `Notes/skills/code-writing/always-do-red-green.md` and `Notes/skills/code-writing/styling-html-and-tsx`. Refactors must not change observable behavior.

---

### 14a. RED: Playwright spec — expense entry chip UI (depends only on GREEN of the form wiring)

**Type**: RED
**Output**: `e2e-tests/expenses/XX-entry-tag-chip-ui.spec.ts` signs in, seeds tags `food`, `gift`, `restaurant`, `lego`, opens the entry form, and asserts: every tag appears as a chip-checkbox in alphabetical case-insensitive order with wrap; selected chips are visually distinct; toggling two chips on and submitting attaches both tags. Run the spec and confirm it fails before moving on.
**Depends on**: 3, 13

Read and follow `Notes/skills/code-writing/always-do-red-green.md`. This is the smallest unit of e2e coverage so that task 15 can GREEN it without the confirmation hardening of tasks 22–24 in place.

---

### 14b. RED: Playwright spec — entry new-tag confirmation flow (depends on confirmation hardening)

**Type**: RED
**Output**: `e2e-tests/expenses/XX-entry-new-tag-confirmation.spec.ts` asserts: typing two new tag names with a mixed comma+whitespace separator and submitting reaches a confirmation page listing both new tags; confirming creates them atomically and attaches them; typing `Food` in the new-tags input while `food` is already chip-selected attaches `food` exactly once and does not surface `Food` as a new tag. Run the spec and confirm it fails before moving on.
**Depends on**: 3, 13, 24

Read and follow `Notes/skills/code-writing/always-do-red-green.md`. Authored after the expense-confirmation handler hardening (task 24) so that the spec's confirmation-side assertions have a chance of passing under the GREEN step that follows.

---

### 14c. RED: Playwright spec — entry tamper + validation-error preservation (depends on confirmation hardening)

**Type**: RED
**Output**: `e2e-tests/expenses/XX-entry-tamper-and-error.spec.ts` asserts: cancelling the confirmation preserves chip selections, the new-tags text, and the new-category text; submitting a tampered `tagId` (DevTools-injected unknown or non-ULID) shows a recoverable global error with all other values preserved and triggers no DB lookup for the bad id (asserted with the validator-level repository spy from task 2 plus a route-level no-query assertion); tampering with hidden confirmation-page fields (modified amount, modified description, injected `tagId`, swapped `categoryId`) is rejected by the HMAC-signature / pending-state check ahead of revalidation, with all values preserved on re-render. Run the spec and confirm it fails before moving on.
**Depends on**: 3, 13, 24

Read and follow `Notes/skills/code-writing/always-do-red-green.md`.

---

### 14d. RED: Playwright spec — entry no-JS and broken-JS fallback (depends on JS wiring)

**Type**: RED
**Output**: `e2e-tests/expenses/XX-entry-no-js-and-broken-js.spec.ts` asserts: submitting with JS disabled still works (native checkboxes toggle, `newTags` text submits as-is, confirmation page handles both correctly, round-trip preserves all values); injecting a throwing `tag-chip-checkboxes.js` does not block native checkbox toggling or form submission. Run the spec and confirm it fails before moving on.
**Depends on**: 12, 13

Read and follow `Notes/skills/code-writing/always-do-red-green.md`. Authored after the JS file (task 12) and the component+JS refactor (task 13) so the no-JS/broken-JS conditions can be exercised meaningfully. Use the sign-in and database helpers from `e2e-tests/support/`. Run with `npx playwright test -x` while developing.

---

### 15. GREEN: wire the expense entry form to the shared component + validator

**Type**: GREEN
**Output**: `src/routes/expenses/expense-form.tsx` renders the shared `tag-chip-checkboxes` component with `allowNewTags=true`, replacing the existing CSV `tags` text input enhanced by `tag-chip-picker.js`. `src/routes/expenses/expense-post-handler.ts` consumes `tagId[]` + `newTags` via the validator from tasks 2/3, forwards normalized values through the existing inline-create confirmation flow, and re-renders the form with preserved values on validation errors. Write only the minimum needed to turn the task-14a spec green. Tasks 14b, 14c, and 14d are addressed by later GREEN work (confirmation hardening in tasks 23–24 for 14b/14c; the JS file in task 12 plus this GREEN step for 14d).
**Depends on**: 14a

Read and follow `Notes/skills/AGENTS.md` and the skills under `Notes/skills/code-writing`. Reuse the existing confirmation flow end-to-end; do not introduce a parallel flow. Use `value`/`checked`. Keep all rendering server-authoritative.

---

### 16. RED: failing Playwright spec — expense edit form chip-checkbox + new-tag input

**Type**: RED
**Output**: A new spec under `e2e-tests/expenses/` mirrors task 14 for the expense edit page, also asserting that pre-existing tag attachments render as selected chips on initial load and that toggling chips off detaches the corresponding tags on save. Run the spec and confirm it fails before moving on.
**Depends on**: 3, 13

Read and follow `Notes/skills/code-writing/always-do-red-green.md`. Reuse selectors and helpers from task 14 rather than duplicating them.

---

### 17. GREEN: wire the expense edit form

**Type**: GREEN
**Output**: `src/routes/expenses/build-edit-expense.tsx` and its POST handler render the shared component and consume `tagId[]` + `newTags` through the validator, replacing the CSV input. Pre-existing attachments render selected; toggled-off chips detach on save. Write only the minimum needed to turn the task-16 spec green.
**Depends on**: 16

Read and follow `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/database-access`. Preserve the existing confirmation flow for newly-introduced tags or categories.

---

### 18. RED: failing Playwright spec — recurring create form chip-checkbox + new-tag input

**Type**: RED
**Output**: A new spec under `e2e-tests/expenses/` (or a sibling directory) covers `build-create-recurring.tsx`: chip-checkbox block renders, alphabetical wrap, selected-vs-unselected styling, toggle-and-submit attaches tags to the new recurring template, new-tag input reaches the recurring confirmation page, cancel preserves all values. Run the spec and confirm it fails before moving on.
**Depends on**: 3, 13

Read and follow `Notes/skills/code-writing/always-do-red-green.md`.

---

### 19. GREEN: wire the recurring create form

**Type**: GREEN
**Output**: `src/routes/recurring/build-create-recurring.tsx`, `src/routes/recurring/recurring-form.tsx`, and the recurring create POST handler render the shared component and consume `tagId[]` + `newTags`, replacing the CSV path. Write only the minimum needed to turn the task-18 spec green.
**Depends on**: 18

Read and follow `Notes/skills/AGENTS.md`. Preserve the recurring confirmation flow end-to-end.

---

### 20. RED: failing Playwright spec — recurring edit form chip-checkbox + new-tag input

**Type**: RED
**Output**: A new spec covers `build-edit-recurring.tsx`: pre-existing tag attachments render selected; chip toggling, new-tag input, and cancellation behave per tasks 16/18; saving updates attachments. Run the spec and confirm it fails before moving on.
**Depends on**: 3, 13

Read and follow `Notes/skills/code-writing/always-do-red-green.md`. Reuse helpers from task 18.

---

### 21. GREEN: wire the recurring edit form

**Type**: GREEN
**Output**: `src/routes/recurring/build-edit-recurring.tsx` and its POST handler render the shared component and consume `tagId[]` + `newTags` through the validator. Pre-existing attachments render selected; toggled-off chips detach on save. Write only the minimum needed to turn the task-20 spec green.
**Depends on**: 20

Read and follow `Notes/skills/AGENTS.md`.

---

### 22. RED: failing tests for expense-confirmation hardening

**Type**: RED
**Output**: New unit + e2e coverage asserts, for the **expense** confirmation route: the confirm handler revalidates every field (shape, character set, length, caps, ULID syntax, `tagId` existence, collision normalization, money parsing, date validity, `categoryId` syntactic + existence check) **and** rejects tampered hidden fields (modified amount from `10.00` to a valid `20.00`, modified description, injected unknown `tagId`, valid-but-swapped `categoryId`) via an HMAC-signature mismatch (or equivalent server-side pending-state divergence) before normal revalidation — with a recoverable error and all values preserved; a confirmation-time tag-name race (another request creates the same new tag between initial submit and confirm) silently reuses the existing row and attaches it; a confirmation-time category-name race silently reuses the existing category (existing category race/collision handling remains intact); any failure during confirmation (unique-constraint surfaced as non-tag conflict, revalidation failure, unexpected DB error) leaves no partial expense/category/tag rows and returns the user to a recoverable state with values preserved (atomicity); validation errors are not logged as server errors and unexpected errors log route + class + stack only (never raw form bodies, amounts, or names) — assertions go through the project's standard log-capture / DB-error-injection helper (e.g. `tests/support/log-capture.ts` and the existing `withForcedDbError` hook), not ad-hoc logging paths. The race-tolerant-reuse behavior must rest on DB-layer uniqueness, not application-only checks: include a schema/migration assertion (e.g. against `drizzle/meta/*_snapshot.json` or a direct `PRAGMA index_list`/`sqlite_master` probe) that `tag.name` and `category.name` carry a **global** unique index (case-insensitive, since all signed-in users share the same tag and category sets per the PRD's no-per-user-ownership rule), and a regression test that bypasses the application checks (raw insert) to confirm the DB rejects the duplicate. Run the suite and confirm the tests fail before moving on.
**Depends on**: 15, 17

Read and follow `Notes/skills/code-writing/always-do-red-green.md` and `Notes/skills/code-writing/database-access`. Use `/test/set-clock` and DB-level fixture insertion to force the race conditions deterministically.

---

### 23. GREEN: harden the expense confirmation handler

**Type**: GREEN
**Output**: `src/routes/expenses/expense-confirm-post-handler.ts` (and any shared helper) verifies the HMAC signature (or stored pending-state token) over the canonical confirmation payload **before** running validation, rejecting tamper attempts with a recoverable error and all values preserved; then fully revalidates the submitted confirmation payload using the validator from tasks 2/3, treats hidden inputs as round-trip convenience only, performs create-or-reuse for new tags and the new category inside a single DB transaction with the resulting expense + attachments, silently reuses existing rows on name-collision races, surfaces other unique-constraint failures as recoverable user-facing errors with all values preserved, and applies the project's logging discipline via the shared log helper (no raw form bodies / amounts / names; route + class + stack on unexpected errors only). The HMAC signing key is read from a Worker secret (e.g. `CONFIRMATION_SIGNING_KEY`) — fail closed if absent. Write only the minimum needed to turn the task-22 tests green.
**Depends on**: 22

Read and follow `Notes/skills/AGENTS.md`, `Notes/skills/code-writing/database-access`, and the project logging conventions. Reuse existing `withRetry` / transaction idioms from `expense-access.ts`. Do not duplicate validation logic — call the task-2 validator.

---

### 24. REFACTOR: tidy the expense confirmation handler

**Type**: REFACTOR
**Output**: With expense-confirmation tests green, refactor `expense-confirm-post-handler.ts` for clarity: extract the create-or-reuse helpers for tag and category so the recurring confirmation handlers (tasks 26 and 29) can share them; tighten error-state value preservation into a single helper. Re-run the suite and confirm it stays green.
**Depends on**: 23

Read and follow `Notes/skills/code-writing/always-do-red-green.md`. No behavior change here.

---

### 25. RED: failing tests for recurring-create confirmation hardening

**Type**: RED
**Output**: New unit + e2e coverage mirrors task 22 for the **recurring create** confirmation route: full revalidation, tampered-hidden-field rejection, tag-name and category-name race silent reuse, atomic create/reuse of category + tags + recurring template in a single transaction, recoverable error state with all values preserved, logging discipline. Run the suite and confirm it fails before moving on.
**Depends on**: 19, 24

Read and follow `Notes/skills/code-writing/always-do-red-green.md`.

---

### 26. GREEN: harden the recurring-create confirmation handler

**Type**: GREEN
**Output**: The recurring create confirmation handler (`recurring-confirm-post-handler.ts` or its project-equivalent code path) fully revalidates, reuses the helpers extracted in task 24, and creates the recurring template plus any new category + tags in a single DB transaction with race-tolerant reuse. Write only the minimum needed to turn the task-25 tests green.
**Depends on**: 25

Read and follow `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/database-access`.

---

### 27. REFACTOR: tidy the recurring-create confirmation handler

**Type**: REFACTOR
**Output**: Collapse any remaining duplication between the recurring-create confirmation handler and the expense confirmation handler into shared helpers; ensure error-state preservation goes through the same single helper introduced in task 24. Re-run the suite and confirm it stays green.
**Depends on**: 26

Read and follow `Notes/skills/code-writing/always-do-red-green.md`. No behavior change.

---

### 28. RED: failing tests for recurring-edit confirmation hardening

**Type**: RED
**Output**: New unit + e2e coverage mirrors task 25 for the **recurring edit** confirmation flow, additionally asserting that pre-existing attachments survive a no-op edit and that toggling chips off detaches the corresponding tags atomically with the edit. Run the suite and confirm it fails before moving on.
**Depends on**: 21, 27

Read and follow `Notes/skills/code-writing/always-do-red-green.md`.

---

### 29. GREEN: harden the recurring-edit confirmation handler

**Type**: GREEN
**Output**: The recurring edit confirmation handler fully revalidates and performs create-or-reuse-or-detach for tags and category inside a single transaction with the edited recurring template, using the helpers from tasks 24 and 27. Write only the minimum needed to turn the task-28 tests green.
**Depends on**: 28

Read and follow `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/database-access`.

---

### 30. REFACTOR: tidy the recurring-edit confirmation handler

**Type**: REFACTOR
**Output**: With recurring-edit confirmation tests green, consolidate any remaining duplication across the three confirmation handlers (expense, recurring-create, recurring-edit) into named shared helpers under `src/lib/` or a sibling module, without changing any observable behavior. Re-run the full unit + Playwright suites and confirm they stay green.
**Depends on**: 29

Read and follow `Notes/skills/code-writing/always-do-red-green.md`. No behavior change.

---

### 31. RED: failing Playwright spec — list-page tag filter unification + tampered/excess `tagId` drop

**Type**: RED
**Output**: A new spec under `e2e-tests/expenses/` asserts the list-page filter bar's tag chips are visually consistent with the entry form's chip block (same class hooks, same alphabetical order, same wrap), that the existing AND/OR toggle and `mode=and|or` query-string contract are preserved unchanged, that excess `tagId` values beyond the configured cap are silently truncated, that syntactically-invalid `tagId` values are silently dropped, that syntactically-valid-but-stale (no longer existing) `tagId` values are silently omitted from the rendered filter UI after existence resolution (no error, no placeholder), and that an unexpected list-read failure (force-injected via a DB error hook) renders the project's standard error response with sanitized logging (route + class + stack; no raw query string, no `tagId` values, no user data). Run the spec and confirm it fails before moving on.
**Depends on**: 6, 13

Read and follow `Notes/skills/code-writing/always-do-red-green.md`.

---

### 32. GREEN: switch list-page tag filter to the shared component

**Type**: GREEN
**Output**: `src/routes/expenses/expense-list-renderer.tsx` renders the shared `tag-chip-checkboxes` component (with `allowNewTags=false`) in `renderFilterBar`, replacing the inline chip rendering. The AND/OR toggle and `mode=and|or` query-string contract remain unchanged. The list filter applies the truncation + ULID-drop behavior added in task 5, silently omits stale `tagId` selections from the rendered chip block after existence resolution against the loaded tag list, and routes unexpected list-read failures through the project's standard error response with sanitized logging (no raw query string, no `tagId` values). Write only the minimum needed to turn the task-31 spec green.
**Depends on**: 31

Read and follow `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/styling-html-and-tsx`. Do not change the AND/OR control or the `mode` parameter.

---

### 33. RED: failing Playwright spec — Summary filter chip block + chronological sort + malformed-query fallback

**Type**: RED
**Output**: A new spec under `e2e-tests/summary/` asserts: the Summary tag filter is a chip-checkbox block (no `<select multiple>`) using the shared component, preserves the `name="tagId"` query-string contract, has no new-tag input, and applies AND semantics across two selected tags; with seeded expenses across `Jan`–`Apr` of one year, the default-sorted Month-granularity table reads `Jan 2026, Feb 2026, Mar 2026, Apr 2026` top-to-bottom; Quarter granularity reads `Jan-Mar 2026, Apr-Jun 2026, Jul-Sep 2026, Oct-Dec 2026`; clicking the time-period header toggles to descending chronological (not reverse-alphabetical); seeding `Dec 2025` and `Jan 2026` produces two distinct rows with `Dec 2025` first under default ascending; `/summary?dimension=bogus&granularity=zzz&sort=foo&direction=sideways&tagId=does-not-exist&from=not-a-date&to=2026-02-31` renders with defaults and no 500; `/summary?dimension=category&sort=tag` falls back to default sort (dimension-aware allow-list); untagged expenses contribute no rows under dimension `Tag` or `Category + Tag`; syntactically-valid-but-stale `tagId` values are silently omitted from the rendered filter UI after existence resolution; an unexpected Summary-read failure (force-injected via a DB error hook) renders the project's standard error response with sanitized logging (no raw query string, no `tagId` values). Run the spec and confirm it fails before moving on.
**Depends on**: 6, 9, 13

Read and follow `Notes/skills/code-writing/always-do-red-green.md`. Use `/test/set-clock` for deterministic seeding across years.

---

### 34. GREEN: switch Summary filter to the shared component + render chronological labels

**Type**: GREEN
**Output**: `src/routes/build-summary.tsx` replaces the existing `<select id="summary-tag-filter" multiple>` with the shared `tag-chip-checkboxes` component (with `allowNewTags=false`), preserving the `name="tagId"` query-string contract; renders the year-bearing labels (`Mmm YYYY` / `Mmm-Mmm YYYY` / `YYYY`) returned by `summary-access.ts`; renders sortable column headers driven by the dimension-aware allow-list from task 5; renders the malformed-query fallback per task 5; omits stale `tagId` selections silently from the rendered filter UI after existence resolution; routes unexpected Summary-read failures through the project's standard error response with sanitized logging (no raw query string, no `tagId` values). Write only the minimum needed to turn the task-33 spec green.
**Depends on**: 33

Read and follow `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/styling-html-and-tsx`. Preserve the existing controls (dimension, granularity, from/to, submit, clear) and `data-testid` names.

---

### 35. REFACTOR: tidy `build-summary.tsx`

**Type**: REFACTOR
**Output**: With the Summary spec green, refactor `build-summary.tsx` for clarity: extract the sort-link helper so its query-string serialization round-trips the parsed `parseSummaryQuery` state cleanly; collapse any duplication between the controls form and the sort links; ensure the file matches the style of the surrounding routes. Re-run the unit suite and the new Playwright specs and confirm everything stays green.
**Depends on**: 34

Read and follow `Notes/skills/code-writing/always-do-red-green.md` and `Notes/skills/code-writing/styling-html-and-tsx`. No behavior change or testid change.

---

### 36. WRITE: cleanup — remove `tag-chip-picker.js` and the CSV tag input

**Type**: WRITE
**Output**: `public/js/tag-chip-picker.js` is deleted; every `<script src="/js/tag-chip-picker.js">` reference is removed (in `expense-form.tsx`, `recurring-form.tsx`, `build-edit-expense.tsx`, `build-create-recurring.tsx`, `build-edit-recurring.tsx`, `expense-list-renderer.tsx`); the now-unused `data-tag-chip-picker` attribute and the `tagsCsvMax`-based CSV input field are removed from those forms; the CSV-parsing path in the validators and post handlers is removed if and only if no other caller depends on it. After cleanup no rendered page produces a 404 for `/js/tag-chip-picker.js`. Run the full unit + Playwright suites and confirm everything stays green.
**Depends on**: 15, 17, 19, 21, 30, 32, 34

Read and follow `Notes/skills/AGENTS.md`. Do not weaken any test or skip any assertion to make cleanup pass — return to a new RED step if a gap is discovered.

---

### 37. DOCUMENT: update the wiki

**Type**: DOCUMENT
**Output**: Wiki pages under `Notes/wiki/` document the Issue 18 changes: the shared `tag-chip-checkboxes` component and its `allowNewTags` prop, the server-authoritative tag-input contract (ULID syntactic check, count cap, `newTags` regex + caps, collision normalization), the dimension-aware sort allow-list, the chronological summary sort with internal `(year, monthIndex|quarterIndex)` keys and `Mmm YYYY` / `Mmm-Mmm YYYY` / `YYYY` labels, the confirmation atomicity + race-tolerant reuse rules (for expense, recurring create, and recurring edit), the safe-rendering rule for legacy / invalid stored names, and the progressive-enhancement guarantee. Update `Notes/wiki/index.md` and append one `## [YYYY-MM-DD] ingest | Issue 18: Tag chip-checkbox UI everywhere + chronological time-period sort on Summary` entry to `Notes/wiki/log.md`.
**Depends on**: 36

Follow `Notes/wiki/AGENTS.md` and `Notes/wiki/wiki-rules.md`. Cross-link the existing `expense-validators`, `summary-access`, `et-date`, expense + recurring confirmation, and route wiki pages where the behavior is extended or replaced.

---

### 38. CODE WALKTHROUGH

**Type**: CODE WALKTHROUGH
**Output**: A new walkthrough directory at `Notes/walkthroughs/18-tag-chipboxes-and-sort-fix/code-walkthrough/` containing showboat-generated files that explain the implementation across the shared component + JS, the new validator and the extended filter parsers, the chronological sort in `summary-access.ts`, the three hardened confirmation handlers, and the wired-up forms (entry, edit, recurring create, recurring edit, list filter, summary filter).
**Depends on**: 37

Run `uvx showboat --help` first to confirm current flags, then generate the walkthrough into the specified directory.

---

### 39. UI WALKTHROUGH

**Type**: UI WALKTHROUGH
**Output**: A new walkthrough directory at `Notes/walkthroughs/18-tag-chipboxes-and-sort-fix/ui-walkthrough/` containing showboat-generated files that demonstrate the user-facing flows: chip-checkbox UI on entry, edit, recurring create, recurring edit, list filter, and summary filter; new-tag input on mutation forms with the confirmation round-trip; cancel + error-state value preservation; chronological time-period sort on Month and Quarter (including cross-year ordering); descending header toggle; malformed-query fallback on `/summary`; tampered-`tagId` recoverable error on a mutation form; no-JS fallback and broken-JS fallback.
**Depends on**: 38

Run `uvx showboat --help` first to confirm current flags, then generate the walkthrough into the specified directory.

---

### 40. Final human review

**Type**: REVIEW
**Output**: A human has reviewed the completed Issue 18 implementation, confirmed every checkbox in the issue's _Acceptance criteria_ section (Tag UI, Mutation validation, Confirmation / race behavior, Summary sorting, Security and progressive enhancement), and worked through the manual checklist in the issue's _How to verify_ section, with particular attention to: chip-checkbox parity across entry / edit / recurring create / recurring edit / list filter / summary filter; new-tag input behavior including separator forms, collision normalization, and confirmation atomicity; tampered-hidden-field rejection at every confirmation route; race-tolerant reuse for both tag and category names on all three confirmation flows; chronological Month and Quarter ordering with cross-year row distinctness; dimension-aware sort fallback; malformed-query fallback on `/summary` with no 500; safe rendering of legacy stored names containing HTML metacharacters; no-JS and broken-JS fallbacks.
**Depends on**: 39

Review the final diff, run the focused and full relevant test suites (`npm test`, the new Playwright specs, and the existing `e2e-tests/expenses/`, `e2e-tests/summary/`, and recurring specs to ensure no regression), and manually verify each affected page against the issue's checklist.

---
