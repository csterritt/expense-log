# Tasks for #01: Schema migration, navigation header, and empty expense list page

Parent issue: `Notes/issues/01-schema-nav-empty-list.md`
Parent PRD: `Notes/PRD-expense-log.md`

## Tasks

### 1. Add expense-feature tables to schema and generate migration

**Type**: MIGRATE
**Output**: `src/db/schema.ts` defines `category`, `tag`, `expense`, `expenseTag`, `recurring`, `recurringTag` with all FKs, `onDelete` actions, and timestamps per the PRD _Data model_ section; the `schema` export and `$inferSelect`/`$inferInsert` type exports are extended in the same style as the existing tables; a Drizzle-generated migration in `drizzle/` creates all six tables and the partial unique index on `expense(recurringId, occurrenceDate) WHERE recurringId IS NOT NULL`.
**Depends on**: none

Follow the existing pattern in `src/db/schema.ts` (sqliteTable, `text`/`integer`, `.references(() => …, { onDelete: … })`, `schema` export, type exports). Use integer cents for amounts, `YYYY-MM-DD` text for dates, ULID-shaped `text` primary keys, and `integer('…', { mode: 'timestamp' })` for `createdAt`/`updatedAt`. Generate the migration using the existing drizzle tooling (see `build-schema-update.sh`). Drizzle may not express the partial unique index directly; if not, hand-edit the generated SQL to add `CREATE UNIQUE INDEX … ON expense(recurringId, occurrenceDate) WHERE recurringId IS NOT NULL`. Do not modify the better-auth tables.

---

### 2. Human review of schema & migration SQL

**Type**: REVIEW
**Output**: Reviewer signs off on the schema diff, the FK `onDelete` choices, and the partial unique index before any further work lands.
**Depends on**: 1

The parent issue is flagged HITL specifically for this gate. Surface the schema diff and the raw migration SQL to the user and wait for explicit approval before proceeding.

---

### 3. Add route path constants

**Type**: WRITE
**Output**: `src/constants.ts` exposes `PATHS.EXPENSES = '/expenses'`, `PATHS.CATEGORIES = '/categories'`, `PATHS.TAGS = '/tags'`, `PATHS.SUMMARY = '/summary'`, `PATHS.RECURRING = '/recurring'`.
**Depends on**: 2

Extend the existing `PATHS` object in `src/constants.ts`, matching the shape used by `PATHS.PRIVATE`, `PATHS.PROFILE`, etc. Do not touch unrelated constants.

---

### 4. Placeholder route builders for Categories, Tags, Summary, Recurring

**Type**: WRITE
**Output**: Four new files under `src/routes/`: `build-categories.tsx`, `build-tags.tsx`, `build-summary.tsx`, `build-recurring.tsx`. Each exports a single `buildXxx(app)` that registers a GET on its `PATHS.*` path gated by `signedInAccess`, and renders `useLayout(c, …)` with an `<h1>` matching the nav label and a minimal placeholder paragraph. Each is wired into `src/index.ts` alongside the existing `buildPrivate(app)` call.
**Depends on**: 3

Follow the exact pattern of `src/routes/build-private.tsx`: MPL header, `secureHeaders(STANDARD_SECURE_HEADERS)`, `signedInAccess` middleware, `useLayout`. Import and call each builder in `src/index.ts` near `buildPrivate(app)`.

---

### 5. e2e spec: unauthenticated redirects for all five expense routes

**Type**: TEST
**Output**: A single new Playwright spec file under `e2e-tests/general/` that asserts visiting each of `/expenses`, `/categories`, `/tags`, `/summary`, `/recurring` while signed out redirects to `/sign-in` with the standard auth error message.
**Depends on**: 4

Use helpers in `e2e-tests/support/` in the same style as the existing `e2e-tests/no-sign-up/` specs. Parametrize across the five paths. Run with the default `dev-open-sign-up` server.

---

### 6. Build `/expenses` page with empty-state

**Type**: WRITE
**Output**: `src/routes/expenses/build-expenses.tsx` exports `buildExpenses(app)` that registers `GET /expenses` gated by `signedInAccess`, rendering a heading "Expenses" and the empty-state message "No expenses yet" with `data-testid="expenses-empty-state"`. Wired into `src/index.ts`.
**Depends on**: 4

Same skeleton as the placeholders from task 4. Do not add the entry form, list, filters, or any DB reads — those are out of scope for this issue. Place the file in an `expenses/` subdirectory per the PRD _Route modules_ section.

---

### 7. e2e spec: signed-in headings and empty-state

**Type**: TEST
**Output**: A single new Playwright spec file that signs in a test user, visits each of the five routes, asserts a 200 response with the expected `<h1>`, and additionally asserts that `/expenses` renders the empty-state testid and text.
**Depends on**: 6

Reuse sign-in helpers from `e2e-tests/support/`. Keep the spec to observable behavior only — no DB seeding, since no expenses exist yet.

---

### 8. Add header navigation links

**Type**: WRITE
**Output**: `src/routes/build-layout.tsx` renders, when `c.get('user')` is present, nav links "Expenses", "Categories", "Tags", "Summary", "Recurring" pointing at the respective `PATHS.*`, each with a `data-testid` of the form `<name>-nav` (e.g. `expenses-nav`). Preserve existing Profile link, sign-out form, and welcome text. No changes for signed-out users.
**Depends on**: 3

Edit only the signed-in branch of the navbar in `src/routes/build-layout.tsx`. Use DaisyUI styling consistent with the existing navbar buttons (e.g. `menu menu-horizontal` or `btn btn-ghost`).

---

### 9. e2e spec: header nav link visibility and targets

**Type**: TEST
**Output**: A single new Playwright spec file that asserts the five nav links are visible when signed in, hidden when signed out, and that clicking each lands on the correct path with the correct heading.
**Depends on**: 8

Use `data-testid` selectors from task 8. Reuse sign-in helpers from `e2e-tests/support/`.

---

### 10. Walkthrough of the implementation

**Type**: WALKTHROUGH
**Output**: A showboat walkthrough under `Notes/walkthroughs/01-schema-nav-empty-list/` covering the schema additions, route wiring, layout nav changes, and empty-state page.
**Depends on**: 9

Run `uvx showboat --help` first to confirm current flags, then generate into the new directory.

---

### 11. Final human review

**Type**: REVIEW
**Output**: User confirms all manual verification steps from the issue's _How to verify_ section pass and that every acceptance-criteria checkbox is satisfied, before merge.
**Depends on**: 10

---
