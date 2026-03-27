# Expense Log — Implementation Plan

## Assumptions

- The existing auth system (better-auth, sign-in, sign-up, profile, etc.) is complete and unchanged.
- All new expense features are behind `signedInAccess` middleware.
- Categories and tags are shared across all users (not per-user).
- Categories are created inline from the expense form if they don't exist; same for tags.
- Recurring expenses store a template + recurrence rule; actual expense creation is triggered by a cron/scheduled handler.
- "All users see all expenses" means no ownership filtering on reads, but we track who entered each expense.
- The summary page is a separate route (`/expenses/summary`).
- Amounts are stored as integers (cents) to avoid floating-point issues; displayed as dollars.

## Pitfalls

- **Floating-point money** — Store cents as integers in SQLite. Convert on display only.
- **Many-to-many tags** — Requires a join table (`expenseTag`). Keep queries simple with Drizzle joins.
- **Recurring expense scheduler** — Cloudflare Workers support `scheduled()` handler via cron triggers. Must be configured in `wrangler.jsonc`.
- **Migration ordering** — New tables must be added via Drizzle migration (`drizzle-kit generate`). Run migration before coding routes.
- **Form validation** — Client-side via HTML attributes; server-side via validators. Both must agree.
- **Test database seeding** — Seed endpoint must be extended to include expense/category/tag test data.

---

## Phase 1: Database Schema & Migrations

- [ ] 1.1 Add `category` table to `src/db/schema.ts` (id, name, createdAt)
- [ ] 1.2 Add `tag` table to `src/db/schema.ts` (id, name, createdAt)
- [ ] 1.3 Add `expense` table to `src/db/schema.ts` (id, userId FK, amountCents integer, date text, description, categoryId FK nullable, createdAt, updatedAt)
- [ ] 1.4 Add `expenseTag` join table to `src/db/schema.ts` (expenseId FK, tagId FK, composite PK)
- [ ] 1.5 Add `recurringExpense` table to `src/db/schema.ts` (id, expenseTemplateId FK, period enum-like text, nextRunDate text, isActive boolean, createdAt, updatedAt)
- [ ] 1.6 Export types: `Category`, `Tag`, `Expense`, `ExpenseTag`, `RecurringExpense` + `New*` insert types
- [ ] 1.7 Add tables to `schema` export object
- [ ] 1.8 Run `drizzle-kit generate` to create migration SQL
- [ ] 1.9 Run migration against local D1 (`wrangler d1 migrations apply`)

### TDD for Phase 1

- **Red**: Write a test route (`/test/database/expense-tables`) that queries each new table and expects empty results. Test fails because tables don't exist yet.
- **Green**: Apply migration. Test passes.

---

## Phase 2: Database Access Layer

- [ ] 2.0 Create `src/lib/expense-db-access.ts` file
- [ ] 2.1 Add category CRUD functions to `src/lib/expense-db-access.ts`:
  - `getAllCategories(db)` → `Result<Category[], Error>`
  - `getCategoryByName(db, name)` → `Result<Category[], Error>`
  - `createCategory(db, name)` → `Result<Category, Error>`
  - `updateCategory(db, id, name)` → `Result<boolean, Error>`
  - `deleteCategory(db, id)` → `Result<boolean, Error>`
- [ ] 2.2 Add tag CRUD functions to `src/lib/expense-db-access.ts`:
  - `getAllTags(db)` → `Result<Tag[], Error>`
  - `getTagByName(db, name)` → `Result<Tag[], Error>`
  - `createTag(db, name)` → `Result<Tag, Error>`
  - `updateTag(db, id, name)` → `Result<boolean, Error>`
  - `deleteTag(db, id)` → `Result<boolean, Error>`
- [ ] 2.3 Add expense CRUD functions to `src/lib/expense-db-access.ts`:
  - `createExpense(db, data)` → `Result<Expense, Error>`
  - `getExpenses(db, filters?)` → `Result<ExpenseWithDetails[], Error>` (joins category + tags)
  - `getExpenseById(db, id)` → `Result<ExpenseWithDetails | null, Error>`
  - `updateExpense(db, id, data)` → `Result<boolean, Error>`
  - `deleteExpense(db, id)` → `Result<boolean, Error>`
- [ ] 2.4 Add expense-tag link functions:
  - `setExpenseTags(db, expenseId, tagIds)` → `Result<boolean, Error>` (delete old + insert new)
- [ ] 2.5 Add recurring expense functions:
  - `createRecurringExpense(db, data)` → `Result<RecurringExpense, Error>`
  - `getRecurringExpenses(db)` → `Result<RecurringExpense[], Error>`
  - `updateRecurringExpense(db, id, data)` → `Result<boolean, Error>`
  - `deleteRecurringExpense(db, id)` → `Result<boolean, Error>`
  - `getDueRecurringExpenses(db, today)` → `Result<RecurringExpense[], Error>`
  - `advanceRecurringExpenseDate(db, id, nextDate)` → `Result<boolean, Error>`

### TDD for Phase 2

- **Red**: Add test endpoints under `/test/database/` that call each db-access function and verify results. Tests fail because functions don't exist.
- **Green**: Implement each function. Tests pass.
- Extend `seedDatabase` and `clearDatabase` to handle new tables.

---

## Phase 3: Constants & Paths

- [ ] 3.1 Add expense paths to `PATHS` in `src/constants.ts`:
  - `EXPENSES.LIST: '/expenses'`
  - `EXPENSES.NEW: '/expenses/new'`
  - `EXPENSES.EDIT: '/expenses/:id/edit'`
  - `EXPENSES.DELETE: '/expenses/:id/delete'`
  - `EXPENSES.SUMMARY: '/expenses/summary'`
- [ ] 3.2 Add category management paths:
  - `CATEGORIES.LIST: '/categories'`
  - `CATEGORIES.EDIT: '/categories/:id/edit'`
  - `CATEGORIES.DELETE: '/categories/:id/delete'`
- [ ] 3.3 Add tag management paths:
  - `TAGS.LIST: '/tags'`
  - `TAGS.EDIT: '/tags/:id/edit'`
  - `TAGS.DELETE: '/tags/:id/delete'`
- [ ] 3.4 Add recurring expense paths:
  - `RECURRING.LIST: '/recurring'`
  - `RECURRING.NEW: '/recurring/new'`
  - `RECURRING.EDIT: '/recurring/:id/edit'`
  - `RECURRING.DELETE: '/recurring/:id/delete'`
- [ ] 3.5 Add expense-related `MESSAGES` and `VALIDATION` constants
- [ ] 3.6 Add expense URLs to `BASE_URLS` in `e2e-tests/support/test-data.ts`

---

## Phase 4: Expense CRUD Routes (Core Feature)

- [ ] 4.1 Create `src/routes/expenses/build-expenses.tsx` — GET `/expenses` — list view with:
  - New expense form at top (amount, date defaulting to today, description, category dropdown with type-in search and "add new" option, tag multi-select with type-in search and "add new" option)
  - History table below, sorted by default by date descending
  - Different background color per month, switching from white for the current month, light gray for the month before that, white for two months back, etc.
  - Filter controls (category, tag, description search)
  - Sort toggle
- [ ] 4.2 Create `src/routes/expenses/handle-create-expense.ts` — POST `/expenses` — create expense + auto-create category/tag if new
- [ ] 4.3 Create `src/routes/expenses/build-edit-expense.tsx` — GET `/expenses/:id/edit` — edit form
- [ ] 4.4 Create `src/routes/expenses/handle-update-expense.ts` — POST `/expenses/:id/edit` — update expense
- [ ] 4.5 Create `src/routes/expenses/handle-delete-expense.ts` — POST `/expenses/:id/delete` — delete expense
- [ ] 4.6 Add form validation in `src/lib/validators.ts` for expense fields
- [ ] 4.7 Register all expense routes in `src/index.ts`

### TDD for Phase 4

- **Red**: Write E2E tests in `e2e-tests/expenses/` for:
  - `create-expense.spec.ts` — fill form, submit, see it in history
  - `edit-expense.spec.ts` — edit existing expense, verify changes
  - `delete-expense.spec.ts` — delete expense, verify removal
  - `expense-validation.spec.ts` — submit invalid data, see errors
  - `expense-list.spec.ts` — verify sort, filter, month backgrounds
- **Green**: Implement routes. Tests pass.

---

## Phase 5: Category & Tag Management Routes

- [ ] 5.1 Create `src/routes/categories/build-categories.tsx` — GET `/categories` — list + inline edit
- [ ] 5.2 Create `src/routes/categories/handle-update-category.ts` — POST `/categories/:id/edit`
- [ ] 5.3 Create `src/routes/categories/handle-delete-category.ts` — POST `/categories/:id/delete`
- [ ] 5.4 Create `src/routes/tags/build-tags.tsx` — GET `/tags` — list + inline edit
- [ ] 5.5 Create `src/routes/tags/handle-update-tag.ts` — POST `/tags/:id/edit`
- [ ] 5.6 Create `src/routes/tags/handle-delete-tag.ts` — POST `/tags/:id/delete`
- [ ] 5.7 Register category and tag routes in `src/index.ts`

### TDD for Phase 5

- **Red**: Write E2E tests in `e2e-tests/categories/` and `e2e-tests/tags/`:
  - `category-crud.spec.ts` — create via expense form, rename, delete
  - `tag-crud.spec.ts` — create via expense form, rename, delete
  - `category-in-use.spec.ts` — attempt to delete category with expenses, see warning
  - `tag-in-use.spec.ts` — same for tags
- **Green**: Implement routes. Tests pass.

---

## Phase 6: Summary Page

- [ ] 6.1 Create `src/routes/expenses/build-summary.tsx` — GET `/expenses/summary`:
  - Filter by category(ies) and/or tag(s) via multi-select
  - Totals per category and per tag
  - Sort by category or tag
  - Date range filter
- [ ] 6.2 Register summary route in `src/index.ts`

### TDD for Phase 6

- **Red**: Write E2E tests in `e2e-tests/expenses/`:
  - `expense-summary.spec.ts` — seed data, verify totals, filter, sort
- **Green**: Implement summary page. Tests pass.

---

## Phase 7: Recurring Expenses

- [ ] 7.1 Create `src/routes/recurring/build-recurring.tsx` — GET `/recurring` — list + create form
- [ ] 7.2 Create `src/routes/recurring/handle-create-recurring.ts` — POST `/recurring`
- [ ] 7.3 Create `src/routes/recurring/build-edit-recurring.tsx` — GET `/recurring/:id/edit`
- [ ] 7.4 Create `src/routes/recurring/handle-update-recurring.ts` — POST `/recurring/:id/edit`
- [ ] 7.5 Create `src/routes/recurring/handle-delete-recurring.ts` — POST `/recurring/:id/delete`
- [ ] 7.6 Create `src/lib/recurring-processor.ts` — logic to create expenses from due recurring templates
- [ ] 7.7 Add `scheduled()` export in `src/index.ts` for Cloudflare cron trigger
- [ ] 7.8 Add cron trigger config in `wrangler.jsonc`
- [ ] 7.9 Register recurring routes in `src/index.ts`

### TDD for Phase 7

- **Red**: Write E2E tests in `e2e-tests/recurring/`:
  - `recurring-crud.spec.ts` — create, edit, delete recurring expense
  - `recurring-validation.spec.ts` — invalid period, missing fields
- **Red**: Write unit-style test endpoint for `recurring-processor`:
  - `/test/database/process-recurring` — set clock, seed a due recurring expense, call processor, verify expense created and next date advanced
- **Green**: Implement routes and processor. Tests pass.

---

## Phase 8: Navigation & Layout Updates

- [ ] 8.1 Update `build-layout.tsx` navbar to include links to Expenses, Categories, Tags, Recurring, Summary (visible when signed in)
- [ ] 8.2 Update `build-private.tsx` to redirect to `/expenses` or add expense links
- [ ] 8.3 Update `PATHS` references for any navigation changes

### TDD for Phase 8

- **Red**: Update existing E2E tests that check navbar content to expect new links.
- **Green**: Update layout. Tests pass.

---

## Phase 9: Test Infrastructure Updates

- [ ] 9.1 Extend `e2e-tests/support/test-data.ts` with expense/category/tag test data constants
- [ ] 9.2 Extend `e2e-tests/support/db-helpers.ts` with `seedExpenses()`, `clearExpenses()`
- [ ] 9.3 Add `e2e-tests/support/expense-helpers.ts` with form fill helpers for expense creation
- [ ] 9.4 Add test database endpoints for new tables in `src/routes/test/database.ts`
- [ ] 9.5 Verify all existing auth/profile E2E tests still pass (no regressions)

---

## Phase 10: Final Verification

- [ ] 10.1 Run `tsc --noEmit` — no type errors
- [ ] 10.2 Run `npx playwright test` — all tests pass
- [ ] 10.3 Manual smoke test: create expense, edit, delete, check summary, set up recurring
- [ ] 10.4 Run `prettier --write src/` for formatting

---

## Modifications to Existing Tests

- **`e2e-tests/general/`** — If any tests check the navbar or private page content, update them to expect new expense-related links.
- **`e2e-tests/support/db-helpers.ts`** — `clearDatabase` must also clear expense, category, tag, expenseTag, and recurringExpense tables. `seedDatabase` must remain backward-compatible (only seed auth data unless expense seeding is explicitly called).
- **No existing test logic should be removed** — only extended.

## Red/Green TDD Discipline

For every phase:

1. **Red** — Write the failing test(s) first. Run `npx playwright test -x` to confirm they fail for the right reason (missing route/function, not a typo).
2. **Green** — Implement the minimum code to make the test pass.
3. **Refactor** — Clean up, extract shared components/helpers, verify tests still pass.
4. **Repeat** — Move to the next checklist item.
