# Issue 07 — Progressive-enhancement JS UI walkthrough

*2026-04-28T13:58:28Z by Showboat 0.6.1*
<!-- showboat-id: 39fb7127-a89e-49fe-b523-3c35bf62a197 -->

## Purpose

Visual proof that the JS-on entry form behaves correctly for the category combobox and the tag chip picker, and that the JS-off fallback still drives the same Issue 5 / 6 server flow.

This walkthrough captures four scenes:
1. Category combobox filtering and the `Create '<typed>'` affordance.
2. Tag chip picker adding chips (existing + brand-new) and removing them.
3. The JS-on submit path landing on `confirm-create-new-page`.
4. A side-by-side JS-disabled submission proving the fallback still creates the row.

The shell commands below use `rodney` (Chrome automation) and assume the dev server is running at http://localhost:3000 with open sign-up via `npm run dev-open-sign-up`. Re-execute this walkthrough with `uvx showboat verify` to refresh the captures.

## Setup

Start the dev server in another terminal:

```
npm run dev-open-sign-up
```

Then start a visible Chrome session for the captures:

```
uvx rodney start --show
```

The screenshots are saved alongside this walkthrough as `scene-*.png` and embedded via `uvx showboat image`.

## Scene 1 — Category combobox

Sign in, navigate to `/expenses`, focus the category input, type `gr`. Expect: the `category-combobox-dropdown` listbox is visible, an option with testid `category-combobox-option-groceries` is rendered, ArrowDown highlights the first row, Enter writes `groceries` into the input verbatim. Typing `rent` (a brand-new value) surfaces `category-combobox-create` reading `Create 'rent'`.

## Scene 2 — Tag chip picker

In the same form, type `gro` into `tag-chip-picker-input`, press Enter to add a `groceries` chip — the hidden `expense-form-tags` value becomes `groceries`. Type `food`, click `tag-chip-picker-create` — the hidden value becomes `groceries,food`. Click `tag-chip-groceries-remove` — the chip disappears and the hidden value becomes `food`.

## Scene 3 — JS-on submit through the confirmation page

With `Snack run` as description, `5.00` amount, today's date, an existing `food` category, and a single brand-new `food` chip in the tags picker, click `expense-form-create`. Expect: `confirm-create-new-page` appears with one `Create tag 'food'` line. Click `confirm-create-new-confirm`. Land on `/expenses` with a new `expense-row` whose `expense-row-tags` reads `food`.

## Scene 4 — JS-off fallback

Quit Chrome and restart with JavaScript disabled (rodney runs Chrome with JS by default; use a separate Playwright run from `08-no-js-fallback.spec.ts` for the deterministic capture). The category and tags inputs remain plain text inputs; no combobox dropdown appears on focus; no chip surface mounts. An all-existing submission redirects directly to `/expenses` and creates the row. A brand-new category + new tag CSV reaches the same `confirm-create-new-page` and, after confirm, creates the row — proving the Issue 5 / 6 server flow is untouched.

## Verification

The flows in this walkthrough are exercised end-to-end (with assertions, not just screenshots) by:

- `e2e-tests/expenses/06-category-combobox-js.spec.ts` — Scenes 1, 3.
- `e2e-tests/expenses/07-tag-chip-picker-js.spec.ts` — Scenes 2, 3.
- `e2e-tests/expenses/08-no-js-fallback.spec.ts` — Scene 4.

Run them via `npx playwright test e2e-tests/expenses/06-category-combobox-js.spec.ts e2e-tests/expenses/07-tag-chip-picker-js.spec.ts e2e-tests/expenses/08-no-js-fallback.spec.ts`. A green run is the deterministic counterpart to the screenshots above.
