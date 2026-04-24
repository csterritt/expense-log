## Issue 10: Tags management page

**Type**: AFK
**Blocked by**: Issue 6

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

Build out `/tags` as the tag analogue of Issue 9: alphabetical list, create/rename/delete with the same rules as categories — lowercase normalization, case-insensitive uniqueness, merge-on-rename-collision with confirmation, delete blocked when referenced by any expense. Delete-blocked error states the count of referencing expenses.

`expense-repo` gains `listTags`, `createTag`, `renameTag`, `mergeTag`, `deleteTag`.

Blocked by Issue 6 (not Issue 1) because tag references from expenses only become exercisable once the tag-attachment path exists.

See PRD sections _Category/tag semantics_, _Management: tags_, user stories 48, 49, 50.

### How to verify

- **Manual**:
  1. Visit `/tags`; confirm alphabetical list.
  2. Create, rename, merge, delete; same flows as Issue 9 but on tags.
  3. Try to delete a tag used by N expenses; confirm the error states N.
- **Automated**: Playwright e2e mirror of the category page tests, on tags.

### Acceptance criteria

- [ ] Given tag create/rename, when submitted, then the same lowercase-normalization and case-insensitive uniqueness apply as for categories.
- [ ] Given a rename target that already exists, when confirmed, then expense→tag references are repointed and the source tag is deleted atomically.
- [ ] Given a tag referenced by N expenses, when the user clicks Delete, then the delete is blocked and the error states N.

### User stories addressed

- User story 48: Tags page lists alphabetically
- User story 49: create/rename/delete with category-parallel rules
- User story 50: delete-blocked error states reference count

---
