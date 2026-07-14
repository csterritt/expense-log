## Issue 9: Categories management page

**Type**: AFK
**Blocked by**: Issue 1

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

Build out `/categories` to list all categories alphabetically, each row with Rename and Delete controls. Add:

- A single-field create form (name, ≤ 20 chars, lowercase-normalized) with case-insensitive uniqueness enforced at both the validator and the DB unique index.
- Rename action: normalizes to lowercase. If the target name already exists (case-insensitive), the server renders a merge-confirmation page (source → target, "All N expenses will be reassigned"). Confirm: one atomic transaction repoints every `expense.categoryId` to the target and deletes the source; redirect back to `/categories`.
- Delete action: blocked if any expense references the category (FK `RESTRICT`). The UI surfaces the reference count in the error message. Otherwise deletes and redirects back.

`expense-repo` gains `listCategories`, `createCategory`, `renameCategory`, `mergeCategory`, `deleteCategory`.

See PRD sections _Category/tag semantics_, _Management: categories_, user stories 42–47.

### How to verify

- **Manual**:
  1. Visit `/categories`; confirm alphabetical list.
  2. Create `Food`; confirm stored as `food`.
  3. Try to create `FOOD`; confirm uniqueness error.
  4. Rename `food` → `groceries` (exists); confirm merge confirmation page; confirm; confirm expenses repointed.
  5. Try to delete a referenced category; confirm blocked with "N expenses reference this category".
  6. Delete an unreferenced category; confirm removal.
- **Automated**: Playwright e2e for create, duplicate-on-create, rename-simple, rename-with-merge, delete-blocked, delete-success.

### Acceptance criteria

- [ ] Given two categories with names differing only in case, when either is submitted via create, then a uniqueness error is shown.
- [ ] Given a rename target that already exists, when the user submits, then a merge confirmation page renders; on confirm, all referencing expenses are repointed and the source is deleted atomically.
- [ ] Given a category referenced by N expenses, when the user clicks Delete, then the delete is blocked and the error states N.
- [ ] Given a category with no references, when the user clicks Delete, then it is deleted and the user is redirected back.

### User stories addressed

- User story 42: Categories page lists alphabetically
- User story 43: create new category
- User story 44: rename with lowercase normalization
- User story 45: merge-on-rename-collision with confirmation
- User story 46: delete blocked when referenced
- User story 47: case-insensitive uniqueness at create

---
