# Review of `Notes/plan.md`

## Overall assessment

The plan is thoughtful, detailed, and clearly written, but it is **not yet a reliable implementation plan in its current form**.

Its biggest strengths are:

- It captures the product goals from `Notes/Notes.md` well.
- It recognizes important technical concerns such as money storage in cents, recurring processing, migrations, validation, and test seeding.
- It breaks the work into understandable phases.
- It tries to enforce test-first discipline.

Its biggest weaknesses are:

- It is **internally inconsistent** about what is already done versus what is still pending.
- It does not fully align with some important rules in `Notes/architecture.md`.
- It leaves several key behavioral decisions unspecified, especially around deletion semantics, recurrence rules, date handling, and uniqueness rules.
- Some phases are too large or too ambitious for the point at which they appear.

My conclusion is:

- **As a planning artifact, this is a good start but not yet a good final plan.**
- It should be revised before being treated as the source of truth for implementation status or sequencing.

## What the plan gets right

### 1. It matches the product goals reasonably well

The plan covers the main items from `Notes/Notes.md`:

- expense tracking
- categorization
- tags
- history
- summary
- recurring expenses
- shared multi-user visibility

That is a strong sign that the plan is grounded in the stated product requirements.

### 2. It identifies several real implementation risks

The plan correctly calls out:

- storing money as integer cents
- the need for a join table for tags
- the need for scheduled processing for recurring expenses
- migration ordering
- dual client/server validation
- test data seeding

These are real risks, and calling them out early is good planning.

### 3. It uses a reasonable separation of concerns

The phase breakdown into schema, db access, routes, summary, recurring, navigation, test support, and final verification is sensible at a high level.

### 4. It thinks about testing, not just implementation

The TDD sections are useful and show good intent. The plan is better because it defines how work should be verified, not just what should be built.

## Major problems that should be fixed

### 1. The completion status is not believable as written

This is the biggest issue.

The plan marks many later phases as complete while earlier foundational phases remain incomplete:

- Phase 2 is incomplete
- Phase 3 is incomplete
- Phase 4 is incomplete
- but Phases 5, 6, 7, 8, 9, and much of 10 are marked complete

That is not a coherent dependency chain.

Examples:

- Category and tag management routes in Phase 5 almost certainly depend on schema, paths, validators, and db-access functions from earlier phases.
- Summary in Phase 6 depends on expense querying and filtering behavior from earlier phases.
- Recurring expenses in Phase 7 depend on the expense schema and expense creation logic.
- Navigation and test infrastructure in Phases 8 and 9 depend on the routes they support actually existing.
- Final verification in Phase 10 cannot honestly be considered complete if core CRUD work is still marked incomplete.

### Recommendation

One of these should happen:

- Either convert the document back into a pure plan with all items unchecked.
- Or convert it into a progress tracker with **accurate, verified status** and explicit dependency notes.

Right now it is neither a trustworthy plan nor a trustworthy execution log.

### 2. The plan conflicts with the architecture guide on database access organization

`Notes/architecture.md` says:

- all database queries go through `src/lib/db-access.ts`

But this plan introduces:

- `src/lib/expense-db-access.ts`

That may still be a reasonable design, but it is a deviation from the architecture document. A plan should either:

- follow the architecture exactly and extend `src/lib/db-access.ts`, or
- explicitly state that the architecture is being revised to allow feature-specific db-access files

### Recommendation

Add a decision near Phase 2:

- either keep all expense queries in `src/lib/db-access.ts`
- or update the architecture guide to allow feature-scoped database access modules such as `expense-db-access.ts`

Without that, the plan is not fully correct relative to the documented architecture.

### 3. The security requirements from the architecture are not fully operationalized

The architecture says:

- every route must apply `secureHeaders(STANDARD_SECURE_HEADERS)` and `signedInAccess` middleware

The plan only mentions signed-in protection at a high level in the assumptions. It does not consistently turn that into concrete implementation requirements per route.

### Recommendation

Add explicit checklist items that every new GET and POST route must:

- use `secureHeaders(STANDARD_SECURE_HEADERS)`
- apply `signedInAccess`
- follow the route builder and handler conventions from the architecture guide
- be registered explicitly in `src/index.ts`

This should not be left implicit.

### 4. The plan leaves important data behavior unspecified

Several rules must be decided before implementation, or the work will drift.

#### Category deletion semantics are unclear

The schema says `expense.categoryId` is nullable. That implies a category could be deleted and expenses could remain with `categoryId = null`.

But the tests in Phase 5 suggest deleting a category in use should show a warning.

Those are not the same decision.

Possible valid approaches include:

- restrict deletion if any expense uses the category
- allow deletion and null out `expense.categoryId`
- soft-delete categories

The plan must choose one.

#### Tag deletion semantics are unclear

For tags, the choices are different:

- restrict deletion if linked to expenses
- allow deletion and remove rows from `expenseTag`
- soft-delete tags

Again, the plan needs one explicit rule.

#### Recurring expense template behavior is unclear

The plan says recurring expenses reference an `expenseTemplateId`. Important unanswered questions:

- What happens if the template expense is edited?
- What happens if the template expense is deleted?
- Does recurring processing clone the latest version of the template or a snapshot captured at recurring creation time?

This is a major correctness question.

### Recommendation

Add a section called `Behavioral decisions` that defines:

- category deletion behavior
- tag deletion behavior
- recurring template update/delete behavior
- whether soft delete exists anywhere

### 5. Date and timezone handling are under-specified

The plan stores dates as text and defaults to today, but it does not say:

- whether dates are stored as `YYYY-MM-DD`
- whether calculations use UTC or the user’s local date
- how recurring schedules behave around month boundaries
- what happens for monthly recurrences on the 29th, 30th, or 31st

For expenses and recurring schedules, these are not minor details.

### Recommendation

Add explicit rules such as:

- expense dates are stored as `YYYY-MM-DD`
- recurrence calculations use a defined timezone strategy
- monthly recurrence behavior for short months is explicitly specified
- all date parsing/formatting rules are centralized and tested

### 6. Uniqueness and normalization rules are missing

The plan says categories and tags are created inline if they do not exist, but it never defines what “exist” means.

Questions that need answers:

- Is `Food` the same as `food`?
- Are leading/trailing spaces trimmed?
- Are blank or punctuation-only values allowed?
- Are category names globally unique?
- Are tag names globally unique?

Without explicit normalization, duplicates will proliferate.

### Recommendation

Add rules such as:

- trim whitespace before validation
- reject empty values after trimming
- compare names case-insensitively
- enforce unique category and tag names at both application and database levels if possible

### 7. The recurrence model is too vague for a reliable implementation plan

The plan mentions:

- weekly
- monthly
- multi-month

But that is not a full recurrence specification.

Questions still open:

- Are allowed values a fixed set?
- Is “multi-month” expressed as an integer interval?
- Can a recurring expense generate multiple missed entries if the scheduler has not run for a while?
- How is idempotency handled if the cron job runs twice?

These are high-risk areas.

### Recommendation

Before implementation, define:

- the exact recurrence representation
- the valid period values
- missed-run catch-up behavior
- idempotency strategy for scheduled processing
- whether processing is transactional

Without these, the recurring plan is not yet robust.

## Medium-priority issues

### 8. The route and path design is a bit inconsistent

The plan includes:

- `EXPENSES.NEW: '/expenses/new'`

But expense creation is also described as a form on `GET /expenses` with `POST /expenses`.

If creation happens inline on the list page, a separate `NEW` route may be unnecessary.

Similarly, categories and tags have list/edit/delete paths, but no explicit create paths, even though the product notes call for CRUD.

### Recommendation

Clarify the route model:

- either use inline create only and remove unused `NEW` paths
- or add explicit create routes where true CRUD is intended

For categories and tags specifically, I would recommend either:

- adding a create action on the management pages, or
- explicitly stating that creation is only supported from the expense form

Right now the plan says CRUD but only partially specifies it.

### 9. Phase 4 is carrying too much UX scope for the “core feature” phase

Phase 4 includes:

- new expense form
- inline category/tag creation
  n- history list
- filtering
- sorting
- alternating month backgrounds
- type-in search controls

That is a lot to put into the first major user-facing phase.

It increases the risk that core expense CRUD gets delayed by non-essential UI details.

### Recommendation

Split Phase 4 into:

- **Phase 4A**: minimal create/list/edit/delete expense flow
- **Phase 4B**: filters, sorting, type-ahead UX, month background styling

That would make progress easier to verify and reduce delivery risk.

### 10. The testing strategy is good in spirit, but not always at the right level

The plan leans heavily on test routes for database and processor verification.

That may fit the current project, but some of the logic described is better tested lower in the stack when possible, especially:

- recurrence date calculation
- normalization rules
- summary aggregation

These are logic-heavy areas that are easier to verify with focused tests than only through full route flows.

### Recommendation

Keep the E2E tests, but add lower-level tests for pure logic where practical, especially for:

- recurrence date advancement
- amount parsing/formatting
- filter/query construction
- summary aggregation
- name normalization

### 11. Indexing and query performance are not addressed

Even for a small app, some indexes should be planned early.

Likely useful indexes include:

- `expense.date`
- `expense.categoryId`
- `expense.userId`
- join-table indexes for `expenseTag`
- unique index on normalized `category.name`
- unique index on normalized `tag.name`

### Recommendation

Add an item in Phase 1 for indexes and constraints, not just tables.

### 12. Final verification should include more than typecheck and Playwright

The final verification phase is helpful, but it is incomplete for this feature set.

It should also confirm:

- migrations run cleanly from scratch
- scheduled recurring processing can be exercised in local/dev mode
- deletes behave correctly for in-use categories/tags
- summary totals match seeded data exactly
- auth still protects every expense route

### Recommendation

Expand Phase 10 to include explicit verification of:

- migration bootstrap on a clean database
- recurring scheduler behavior
- authorization coverage
- data integrity after edits/deletes

## Best-practice concerns

### 13. The plan should define invariants, not just tasks

The architecture guide is strong because it states rules. This plan would be much better if it also stated a short list of invariants.

Examples of useful invariants:

- all expense amounts are stored as integer cents
- all expense routes require signed-in access
- category and tag names are normalized before lookup/creation
- summary totals are computed from persisted expenses only
- recurring processing is idempotent
- all paths live in `src/constants.ts`
- all db access uses the approved data-access pattern

These invariants would help prevent subtle drift during implementation.

### 14. Some tasks are written as implementation guesses rather than verified architectural choices

Example:

- type-in search and “add new” option for category/tag controls

That may be desirable, but `Notes/Notes.md` only requires create-on-entry, not necessarily a searchable custom control. Given the stated architecture of a simple HTML/CSS frontend, this could be over-designed for the first pass.

### Recommendation

Distinguish between:

- **required behavior**
- **nice-to-have UX enhancements**

This will keep scope under control.

## Specific additions I would make to the plan

### Add a new section: `Behavioral decisions`

Include explicit decisions for:

- category deletion behavior
- tag deletion behavior
- recurring template behavior
- date storage format
- timezone strategy
- name normalization and uniqueness
- recurrence period rules
- missed-run behavior
- idempotency guarantees

### Add a new phase or sub-phase for shared domain utilities

Before route work, add a small phase for utilities such as:

- amount parsing and formatting
- date formatting/parsing helpers
- recurrence date calculation helpers
- category/tag normalization helpers

That would make the rest of the implementation cleaner and easier to test.

### Add explicit data constraints

Phase 1 should mention:

- foreign key behavior on delete/update
- unique constraints
- indexes
- nullable versus required fields

### Add explicit validation requirements

The plan should define validations for at least:

- amount must be a positive monetary value
- date must be valid
- description required versus optional
- description max length
- category/tag max lengths
- recurrence rule validity
- duplicate category/tag prevention

### Add regression items tied to architecture requirements

Include checks that:

- new routes are registered in `src/index.ts`
- secure headers are applied
- signed-in access is enforced
- constants are centralized in `src/constants.ts`
- test-only routes remain properly guarded with production removal markers where required

## Specific items I would change

### Change 1: Fix the status markers

This is the first thing I would change.

The current checked and unchecked boxes make the document hard to trust. Either:

- reset all boxes to unchecked and treat the file as a pure plan, or
- revise every status to reflect actual completed work only

### Change 2: Resolve the db-access file decision

The plan should either align with `src/lib/db-access.ts` or intentionally update the architecture documentation.

### Change 3: Split Phase 4 into smaller deliverables

Core CRUD should land before advanced filtering and custom selection UX.

### Change 4: Add exact behavioral rules for deletes, recurrence, and normalization

These are correctness issues, not optional polish.

### Change 5: Make recurring implementation more defensive

The plan should explicitly cover:

- idempotency
- duplicate-run protection
- catch-up behavior for missed schedules
- transaction boundaries

## Bottom line

This plan is **promising but not ready to be followed as-is**.

It shows good product understanding and good instincts about testing and architecture, but it needs revision in four major ways:

- make the execution status internally consistent
- align with the architecture guide more explicitly
- define missing data and behavior rules
- reduce scope in the first user-facing implementation phase

## Recommended verdict

- **Correctness**: partially correct, but missing several decisions required for reliable implementation
- **Best practices**: mixed; strong intent, but weak on architectural alignment and invariant definition
- **Is it a good plan?**: good draft, not good final plan
- **Should it change?**: yes, definitely
- **Should anything be added?**: yes, especially behavioral rules, constraints, invariants, and a clearer sequencing model
