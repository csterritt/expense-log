## Issue 1: Schema migration, navigation header, and empty expense list page

**Type**: HITL
**Blocked by**: None — can start immediately

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

The foundational tracer slice. Add a Drizzle migration and `src/db/schema.ts` entries for all expense-feature tables: `category`, `tag`, `expense`, `expenseTag`, `recurring`, `recurringTag`, including the unique dedupe index on `expense(recurringId, occurrenceDate)`. Add header links (Expenses, Categories, Tags, Summary, Recurring) in `src/routes/build-layout.tsx`. Mount all five routes behind the existing signed-in middleware (the same pattern as `buildPrivate`). `/expenses` shows a page with the heading and an empty-state message ("No expenses yet"). `/categories`, `/tags`, `/summary`, and `/recurring` each render a minimal placeholder page behind the same auth guard so the nav does not produce broken links.

See PRD sections _Data model (new tables)_, _Navigation_, and _Auth and multi-user_.

This slice is HITL because it introduces six new tables with cross-FK relationships and a conditional unique index — the schema and migration SQL should get a human review before merge.

### How to verify

- **Manual**:
  1. Run the migration locally; confirm all six tables + the conditional unique index exist.
  2. Sign in; click each header link and confirm each page loads 200 and shows the appropriate heading.
  3. Visit `/expenses` with no data; confirm the empty-state message.
  4. Sign out; visit each of `/expenses`, `/categories`, `/tags`, `/summary`, `/recurring`; confirm redirect to `/sign-in`.
- **Automated**: Playwright e2e asserts that (a) unauthenticated visits to all five routes redirect to sign-in, (b) signed-in visits to all five render 200 with the expected headings, and (c) `/expenses` with no data shows the empty-state text.

### Acceptance criteria

- [ ] Given an unauthenticated visitor, when they visit `/expenses`, `/categories`, `/tags`, `/summary`, or `/recurring`, then they are redirected to `/sign-in`.
- [ ] Given a signed-in user on any page, when they view the header, then they see links to Expenses, Categories, Tags, Summary, and Recurring.
- [ ] Given a signed-in user with no expenses, when they visit `/expenses`, then they see an empty-state message.
- [ ] Given the migration is run, when the schema is inspected, then `category`, `tag`, `expense`, `expenseTag`, `recurring`, `recurringTag` all exist with the FK and index constraints specified in the PRD.

### User stories addressed

- User story 24: empty-state message under the form
- User story 55: unauthenticated visitors redirected to sign-in
- User story 56: header navigation links

---
