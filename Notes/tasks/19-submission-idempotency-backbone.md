# Tasks for #19: Submission idempotency ledger + server dedupe backbone

Parent issue: `Notes/issues/19-submission-idempotency-backbone.md`
Parent PRD: `Notes/PRD-expense-log.md`

These tasks follow the Red/Green/Refactor discipline described in `Notes/skills/code-writing/always-do-red-green.md`. RED must fail for the right reason before GREEN begins, and REFACTOR must keep the suite green. This issue delivers no client behaviour change; it is exercised entirely server-side by replaying a POST.

## Tasks

### 1. Add the `submissionKey` ledger table + Drizzle migration

**Type**: MIGRATE  
**Output**: `src/db/schema.ts` defines a new `submissionKey` table with `key` (text, primary key — a ULID), `userId` (text, FK → the auth `user.id` with `ON DELETE CASCADE`), `outcome` (text — the canonical post-submit redirect target plus its flash message), and `createdAt` (integer timestamp, not null). It is added to the exported `schema` object and gets `SubmissionKey` / `NewSubmissionKey` inferred types alongside the other tables. A new migration file exists under `drizzle/` (generated via the project's `build-schema-update.sh` / drizzle-kit flow) that creates the table with the FK and cascade exactly as specified in the PRD _Data model (new tables)_.  
**Depends on**: none

Follow the existing table definitions in `src/db/schema.ts` (mirror the `session` table's `userId` FK-with-cascade shape). Use the project's normal migration-generation workflow; do not hand-edit generated SQL beyond what the tool produces. Match the `onDelete: 'cascade'` convention already used for `session` and `account`.

---

### 2. RED: failing integration tests for `withIdempotency`

**Type**: RED  
**Output**: A new spec `tests/submission-idempotency.spec.ts` adds failing coverage for a not-yet-existing `withIdempotency` helper: (a) a fresh key runs `run` exactly once, persists its returned outcome, and returns that outcome; (b) replaying the same key returns the stored outcome and performs no second write (assert the target table row count is unchanged and `run` is not invoked); (c) a `run` that signals validation failure records no ledger row and leaves the key resubmittable; (d) an absent or malformed `key` runs `run` exactly once with no dedupe and records no ledger row. Run the suite and confirm the new tests fail (helper does not exist yet) before moving on.  
**Depends on**: 1

Read and follow the project coding standards in `Notes/skills/AGENTS.md` and `Notes/skills/code-writing/always-do-red-green.md`. Reuse the test-DB harness in `tests/helpers/test-db.ts` used by the other `db` specs. Assert observable outcomes (row counts, returned outcome value, `run` invocation count via a spy) rather than implementation details. Seed a `user` row so the FK is satisfiable.

---

### 3. GREEN: build `src/lib/submission-idempotency.ts`

**Type**: GREEN  
**Output**: `src/lib/submission-idempotency.ts` exports `withIdempotency(db, { key, userId, run })` where `run` performs the mutation and returns the outcome to persist. On a fresh, well-formed key it runs `run`, and — inside the same drizzle transaction as the write — records the `submissionKey` row (`key`, `userId`, serialized `outcome`, `createdAt`), returning the outcome. A duplicate key short-circuits to the stored outcome without re-running `run`. An absent or malformed key runs `run` once with no dedupe and never blocks a legitimate submit. Write only the minimum needed to turn the task-2 tests green.  
**Depends on**: 2

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Keep the helper HTTP-agnostic (accept the drizzle client, not a Hono context). Reuse the `Result` and transaction patterns from `src/lib/db/expense-access.ts` and the `withRetry` wrapper in `src/lib/db-helpers.ts`. Generate/validate keys as Crockford-base32 ULIDs consistent with the existing `ulid` usage.

---

### 4. GREEN: render + round-trip the hidden `submissionKey` on the entry/confirm forms

**Type**: GREEN  
**Output**: The expense entry form (`src/routes/expenses/expense-form.tsx`, `renderExpenseForm`) renders a server-generated hidden `submissionKey` input (ULID minted per GET render). `renderConfirmNewItems` round-trips that same `submissionKey` through its hidden fields so the confirm POST carries the original key. `readRawBody` in `src/routes/expenses/expense-form-helpers.ts` extracts `submissionKey` from the parsed body. No behaviour change yet beyond the field being present and preserved.  
**Depends on**: 3

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Follow the existing hidden-input pattern in `renderConfirmNewItems` (e.g. the `category` / `tagId` / `newTags` hidden fields). Mint the ULID in the GET handler (`expense-get-handler.ts`) and thread it into the form state/props so it is stable for a given rendered page; do not generate it in the browser.

---

### 5. GREEN: route the committing expense handlers through `withIdempotency`

**Type**: GREEN  
**Output**: `handleExpensesPost` (direct-create path) in `src/routes/expenses/expense-post-handler.ts` and `handleExpensesConfirmPost` in `src/routes/expenses/expense-confirm-post-handler.ts` run their committing write through `withIdempotency`, keyed off the submitted `submissionKey` and the signed-in `userId`. The persisted outcome is the success redirect target + flash message; replaying the same key reproduces that redirect without a second write. Validation failures and the confirmation-page render (no write) do not record a ledger row.  
**Depends on**: 3, 4

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Obtain `userId` the same way the signed-in handlers already do (via the `signedInAccess` middleware context). Only wrap the actual commit calls (`createExpenseWithTags` / `createManyAndExpense`); leave the pre-write validation and confirmation-render branches outside the idempotent section so a failed validation stays resubmittable.

---

### 6. GREEN: opportunistically prune stale ledger rows

**Type**: GREEN  
**Output**: `submission-idempotency.ts` (or a small helper it calls) deletes `submissionKey` rows older than a short TTL (~24h) opportunistically during normal writes, so the ledger does not grow unbounded. The TTL is a named file-level constant. Pruning failures are swallowed and never block or fail a legitimate submit.  
**Depends on**: 3

Read and follow the project coding standards in `Notes/skills/AGENTS.md`. Compare against `createdAt`; keep the delete best-effort (log-and-continue on error) so it never turns a successful submission into a failure.

---

### 7. REFACTOR: tidy the idempotency module and handler wiring

**Type**: REFACTOR  
**Output**: With the suite green, factor any duplicated key-extraction / outcome-serialization logic shared between the two handlers into `submission-idempotency.ts` or a small helper, and ensure TTL / key-format constants are named and reused. Run the unit suite and confirm it stays green.  
**Depends on**: 5, 6

Read and follow `Notes/skills/code-writing/always-do-red-green.md`. Refactors must not change observable behavior; do not add new test cases here — if a gap appears, return to a new RED step.

---

### 8. Document the idempotency ledger in the wiki

**Type**: DOCUMENT  
**Output**: A wiki page under `Notes/wiki` (per `Notes/wiki/wiki-rules.md`) documents the `submissionKey` ledger table, the `withIdempotency` contract (fresh vs. replayed vs. malformed key, transaction guarantee, TTL prune), and which handlers use it. Cross-linked from the relevant existing wiki index.  
**Depends on**: 7

---

### 9. Human review: server-side replay verification

**Type**: REVIEW  
**Output**: A human confirms the manual checks in the issue: submit a valid expense and note the `submissionKey`; replay the exact POST via curl and confirm no second row and the original success redirect; submit a validation-failing expense and confirm no ledger row plus normal resubmission with the same key.  
**Depends on**: 8

---
