# Issue 10 — Tag Management Page UI Walkthrough

*2026-05-05T20:08:21Z by Showboat 0.6.1*
<!-- showboat-id: 3fc0b908-a1cd-4f85-9caa-66cf5c229bc9 -->

## Purpose

Visual proof that the /tags management page correctly handles the full lifecycle of a tag: create with lowercase normalization and duplicate validation, rename with sticky error on collision, merge confirmation/cancel/confirm, and delete (blocked when referenced, succeeds when unreferenced).

This walkthrough describes five scenes that correspond to the six test cases in e2e-tests/expenses/13-tag-management.spec.ts:

1. Create tag — lowercase normalization + duplicate field error.
2. Create validation — over-limit sticky input.
3. Rename — lowercase normalization to a new name.
4. Rename collision — merge confirmation page flow (confirm then cancel).
5. Delete — blocked with count, then succeeds for an unreferenced tag.

The shell commands below use rodney (Chrome automation) and assume the dev server is running at http://localhost:3000 with the database seeded via the test endpoints. Re-execute with uvx showboat verify to refresh captures.

## Setup

Start the dev server in another terminal:

```
npm run dev-open-sign-up
```

Then start a visible Chrome session for the captures:

```
uvx rodney start --show
```

Screenshots are saved alongside this walkthrough as scene-*.png and embedded via uvx showboat image.

## Scene 1 — Create tag with lowercase normalization and duplicate field error

Sign in, navigate to /tags. The page shows the Create tag form (tag-create-name input, create-tag-action button) and an empty Manage tags section with the tags-empty-state message.

Type 'Travel' into tag-create-name and click create-tag-action. Expect: PRG redirect back to /tags; the tag-row-name cell reads 'travel' (lowercased on insert); tags-empty-state is gone; tags-table is visible with one row.

Type 'TRAVEL' into tag-create-name and click create-tag-action. Expect: PRG redirect back to /tags; tag-create-name-error is visible and contains 'already exists'; tag-row count is still 1; tag-row-name still reads 'travel'.

## Scene 2 — Create validation with over-limit sticky input

Starting from a clean /tags page, type a string of tagNameMax+1 characters (e.g. 26 g's) into tag-create-name and click create-tag-action. Expect: PRG redirect; tag-create-name-error is visible; tag-create-name retains the full over-limit value (sticky via FORM_ERRORS cookie); tags-empty-state is still shown (zero rows were inserted).

## Scene 3 — Rename tag to a new lowercase name

Seed the 'travel' tag. Navigate to /tags. In the rename form for the 'travel' row (tag-rename-name input, rename-tag-action button), type 'Trips' and click rename-tag-action. Expect: PRG redirect; the row previously showing 'travel' now shows 'trips'; no row for 'travel' remains.

## Scene 4 — Rename collision: merge confirmation, confirm, then cancel

Seed two expenses: one tagged 'travel', one tagged 'trips'. Navigate to /tags (both tags are now shown). In the rename form for the 'travel' row, type 'TRIPS' and click rename-tag-action.

Confirm sub-scene: tag-merge-confirm-page is rendered. merge-source-name reads 'travel'; merge-target-name reads 'trips'; merge-expense-count reads 'All 1 expenses will be reassigned'. Click confirm-merge-tag-action. Expect: PRG redirect to /tags; no 'travel' row; 'trips' row remains; the expense previously tagged 'travel' is now tagged 'trips' (visible on /expenses).

Cancel sub-scene: repeat the setup with two fresh 'travel'/'trips' tags. Reach the merge confirmation page again. Click cancel-merge-tag-action. Expect: PRG redirect to /tags; both 'travel' and 'trips' rows are still present.

## Scene 5 — Delete blocked then deleted

Seed two expenses tagged 'travel' and a standalone 'dining' tag (no expenses). Navigate to /tags (both 'travel' and 'dining' rows visible). Click delete-tag-action for 'travel'. Expect: PRG redirect to /tags; the role='alert' flash banner contains '2 expenses reference'; the 'travel' row is still present; the 'dining' row is still present.

Click delete-tag-action for 'dining'. Expect: PRG redirect to /tags; the 'dining' row is gone; the 'travel' row is still present.

## Verification

Run npx playwright test e2e-tests/expenses/13-tag-management.spec.ts to execute all six scenarios deterministically. Each test uses testWithDatabase for per-test database isolation so the scenes above can be executed in any order or repeated without manual cleanup.
