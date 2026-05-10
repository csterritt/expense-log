# Issue 13: Recurring Templates CRUD — UI Walkthrough

*2026-05-11T00:21:05Z by Showboat 0.6.1*
<!-- showboat-id: 5f9963eb-e98c-42a5-bd2e-7cf07c1b62b6 -->

## Overview

This walkthrough describes the user-facing flows for recurring template CRUD (Issue 13). Screenshots cannot be captured in this environment (no Chromium binary), so each step is documented as a narrative with the relevant URL and testid assertions.

## Prerequisites

- Dev server running on `http://localhost:3000`
- Signed in as a known user
- Database cleared and seeded (uses `testWithDatabase` wrapper in e2e tests)

---

## Flow 1: Empty /recurring list

Navigate to `/recurring`. The page shows `data-testid='recurring-page'` with `data-testid='recurring-empty'` reading 'No recurring templates yet.' and a 'New recurring' link (`data-testid='recurring-new'`) pointing to `/recurring/new`.

---

## Flow 2: Create with inline category and tag

1. Click 'New recurring' → navigates to `/recurring/new`.
2. The page renders `data-testid='recurring-new-page'` with a form (`data-testid='recurring-form'`).
3. Fill in: Description='Monthly rent', Amount='1200.00', Category='brandnewcat', Recurrence='Monthly', Anchor date=today, Tags='brandnewtag'.
4. Click 'Add recurring' (`data-testid='recurring-form-create'`).
5. Server detects new category and new tag → renders `data-testid='confirm-recurring-create-new-page'`.
6. The list (`data-testid='confirm-recurring-create-new-list'`) shows:
   - `confirm-recurring-create-new-category-line`: 'Create category brandnewcat'
   - `confirm-recurring-create-new-tag-line`: 'Create tag brandnewtag'
7. The preview shows description, amount, recurrence, anchor-date, category, tags (no 'date' row).
8. Click 'Confirm' (`data-testid='confirm-recurring-create-new-confirm'`).
9. Redirected to `/recurring` with success flash. Template row visible.

---

## Flow 3: Populated list with next-occurrence column

On `/recurring` with a Monthly template anchored to the 15th:
- `recurring-row-description`: 'Monthly rent'
- `recurring-row-amount`: '1,200.00'
- `recurring-row-category`: 'brandnewcat'
- `recurring-row-tags`: 'brandnewtag'
- `recurring-row-recurrence`: 'Monthly'
- `recurring-row-anchor-date`: e.g. '2025-06-15'
- `recurring-row-next-occurrence`: computed by `nextOccurrenceAfter`, e.g. '2025-07-15'
- `recurring-row-edit`: 'Edit' link → `/recurring/:id/edit`

---

## Flow 4: Edit-save (no new items)

1. Click 'Edit' → navigates to `/recurring/:id/edit`.
2. Page renders `data-testid='recurring-edit-page'` with form pre-populated: amount shows '1200.00' (plain decimal, no thousands comma).
3. Change amount to '1500.00', click 'Save changes' (`data-testid='recurring-form-save'`).
4. No new categories/tags → saves directly. Redirected to `/recurring` with success flash.
5. Row shows amount '1,500.00'.

---

## Flow 5: Edit introducing a new tag

1. Navigate to `/recurring/:id/edit`.
2. Append ', newtag' to the tags field.
3. Click 'Save changes'.
4. Server detects new tag → renders `data-testid='confirm-recurring-edit-new-page'`.
5. List shows only `confirm-recurring-edit-new-tag-line` (no category line since category is existing).
6. Click 'Confirm' → redirected to `/recurring` with updated tags row.

---

## Flow 6: Delete confirmation page

1. Navigate to `/recurring/:id/edit`, click 'Delete' (`data-testid='recurring-edit-delete'`).
2. Page renders `data-testid='confirm-delete-recurring-page'` with full template preview (description, amount, category, tags, recurrence, anchor date).
3. Cancel returns to `/recurring/:id/edit`. Template still listed.
4. Re-open delete page, click 'Delete' (`data-testid='confirm-delete-recurring-confirm'`).
5. Redirected to `/recurring` with success flash. Template row gone.

---

## Flow 7: Past generated expense preserved after delete

1. Seed a generated expense linked to the template via `POST /test/database/seed-generated-expense`.
2. Visit `/expenses` → generated expense row visible.
3. Delete the template (Flow 6 steps 1–5).
4. Re-visit `/expenses` → generated expense row **still visible** (FK is ON DELETE SET NULL, so recurringId is nulled but the expense row remains).
5. The template row is no longer on `/recurring`.
