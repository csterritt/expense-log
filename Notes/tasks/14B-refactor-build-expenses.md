# Tasks for 14B: Refactor build-expenses.tsx into multiple files

Parent issue: None (standalone refactoring)
Parent PRD: `Notes/PRD-expense-log.md`

## Tasks

### 1. Create expense-list-renderer module

**Type**: WRITE
**Output**: `src/routes/expenses/expense-list-renderer.tsx` exports `renderFilterBar`, `renderExpenseTable`, and `renderExpenses` functions. These functions are moved from `build-expenses.tsx` with all their dependencies (imports, types) preserved. The file uses the same functional style, JSDoc documentation, and follows project conventions.
**Depends on**: none

Move the render functions (lines 63-297) to a new file. Keep all imports needed by these functions at the top of the new file. Ensure proper type exports are included. The functions should remain pure render functions with no side effects.

---

### 2. Create expense-form-helpers module

**Type**: WRITE
**Output**: `src/routes/expenses/expense-form-helpers.ts` exports `readRawBody` and `emptyState` helper functions. These are moved from `build-expenses.tsx` with all dependencies preserved.
**Depends on**: none

Move the helper functions (lines 58-61 and 299-309) to a new file. Keep imports at the top. These are pure utility functions that parse form data and create default state objects.

---

### 3. Create expense-get-handler module

**Type**: WRITE
**Output**: `src/routes/expenses/expense-get-handler.ts` exports a single function `handleExpensesGet` that contains the GET /expenses route handler logic (lines 312-392 from build-expenses.tsx). The function accepts the Hono app context and returns the response.
**Depends on**: 1

Extract the GET handler into its own file. The handler should import from the new `expense-list-renderer` module for rendering. Keep all database access logic, filter parsing, and error handling within this handler.

---

### 4. Create expense-post-handler module

**Type**: WRITE
**Output**: `src/routes/expenses/expense-post-handler.ts` exports a single function `handleExpensesPost` that contains the POST /expenses route handler logic (lines 394-498 from build-expenses.tsx). The function accepts the Hono app context and returns the response.
**Depends on**: 2

Extract the POST handler for expense creation into its own file. The handler should import from the new `expense-form-helpers` module. Keep all validation, database lookup, and confirmation page rendering logic within this handler.

---

### 5. Create expense-confirm-post-handler module

**Type**: WRITE
**Output**: `src/routes/expenses/expense-confirm-post-handler.ts` exports a single function `handleExpensesConfirmPost` that contains the POST /expenses/confirm-create-new route handler logic (lines 500-595 from build-expenses.tsx). The function accepts the Hono app context and returns the response.
**Depends on**: 2

Extract the confirmation POST handler into its own file. The handler should import from the new `expense-form-helpers` module. Keep all validation, database operations for creating new categories/tags, and the final expense creation logic within this handler.

---

### 6. Refactor build-expenses.tsx to use new modules

**Type**: WRITE
**Output**: `src/routes/expenses/build-expenses.tsx` is reduced to a thin orchestrator that imports the three handler functions and registers them with the Hono app. The file retains the `buildExpenses` export but delegates all logic to the imported handlers.
**Depends on**: 3, 4, 5

Replace the inline route handlers with imports and calls to the new handler functions. Keep the `CONFIRM_CREATE_NEW_PATH` constant in this file since it's used across handlers. Ensure the file still exports `buildExpenses` as before. Remove any imports that are no longer needed.

---

### 7. Update imports in affected files

**Type**: WRITE
**Output**: Any files that import from `src/routes/expenses/build-expenses.tsx` are updated to continue working correctly. Since the public API (`buildExpenses` function) remains unchanged, this task is primarily a verification step.
**Depends on**: 6

Check `src/index.ts` and any other files that import from `build-expenses.tsx`. Verify that the refactoring maintains backward compatibility. No changes should be needed if the public API is preserved.

---

### 8. Run existing e2e tests to verify functionality

**Type**: TEST
**Output**: All existing e2e tests in `e2e-tests/expenses/` pass without modification, confirming that the refactoring preserves all existing behavior.
**Depends on**: 7

Run the full e2e test suite for expenses using the existing test runner. Pay particular attention to tests that cover:
- List rendering
- Entry form submission
- Validation errors
- New category/tag creation flows
- Filter functionality

---

### 9. Run unit tests to verify functionality

**Type**: TEST
**Output**: All existing unit tests pass without modification, confirming that the refactoring preserves all existing behavior at the code level.
**Depends on**: 7

Run the full unit test suite using the existing test runner. Verify that no tests are broken by the file structure changes.

---

### 10. Update the wiki

**Type**: DOCUMENT
**Output**: Wiki pages under `Notes/wiki/` are updated to reflect the new file structure for the expenses route. `Notes/wiki/index.md` and `Notes/wiki/log.md` are updated according to the wiki rules.
**Depends on**: 9

Follow `Notes/wiki/AGENTS.md` and `Notes/wiki/wiki-rules.md`. Update or create pages under `Notes/wiki/src/routes/expenses/` to document the new module structure. Cross-link to the original `build-expenses` documentation. Append a single dated entry for this refactoring.

---

### 11. Final review

**Type**: REVIEW
**Output**: A human reviews the refactored code to ensure it follows project conventions, maintains the same functionality, and improves code organization.
**Depends on**: 10

Review the new files to ensure they follow the project's coding style rules (functional, no classes, proper JSDoc, one export per file). Verify that the separation of concerns is logical and that each file has a single, clear responsibility.

---
