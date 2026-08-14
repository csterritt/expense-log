# Idempotency Ledger

The submission idempotency ledger is the server-side dedupe backbone introduced by [Issue 19](../issues/19-submission-idempotency-backbone.md). It prevents a replayed POST (e.g. a user double-clicking submit, or a network retry) from creating a second expense row, while never blocking a legitimate first submit. The design is server-authoritative and HTTP-agnostic: the dedupe decision is made in the data layer, not in the browser.

## Components

- **Ledger table** — `submissionKey` in [src/db/schema.ts](src/db/schema.md). Primary key `key` (a server-minted ULID), `userId` (FK → `user.id` with `onDelete: 'cascade'`), `outcome` (JSON-serialized `{ path, message }`), `createdAt` (timestamp). Created by migration `drizzle/0005_perpetual_carnage.sql`.
- **Helper** — [`withIdempotency`](src/lib/submission-idempotency.md) in `src/lib/submission-idempotency.ts`. HTTP-agnostic; accepts a drizzle client.
- **Hidden form field** — `submissionKey` rendered by the entry form and round-tripped through the confirm form, minted per GET render in `expense-get-handler.ts`.
- **Handler wiring** — the two committing expense handlers route their writes through `withIdempotency`.

## The `withIdempotency` Contract

`withIdempotency(db, { key, userId, run })` has four branches, walked in order:

| Branch | Condition | Behaviour | Ledger row? |
|--------|-----------|-----------|-------------|
| Absent / malformed key | `key` is not a Crockford-base32 ULID | runs `run` exactly once, no dedupe | no |
| Replay | a row already exists for `key` | returns the stored outcome, `run` not invoked | (existing) |
| Validation / commit failure | `run` returns `Result.err` | returns the error, key stays resubmittable | no |
| Fresh key | well-formed key, no existing row | runs `run`, inserts ledger row on success, prunes stale rows | yes (on success) |

**Transaction guarantee**: `run` performs its write first, and only on success does the helper insert the ledger row — so the ledger row records a commit that already happened. A duplicate key short-circuits at the `select` before `run` is ever invoked.

**Corrupt-stored-value defense**: `parseOutcome` returns `null` on a malformed stored outcome, causing the helper to fall through and re-run the mutation rather than poisoning the submit.

**TTL prune**: `pruneStaleLedgerRows` deletes rows older than `LEDGER_TTL_MS` (~24h) opportunistically after every successful write. Failures are swallowed and logged so housekeeping can never break a submit.

## Key Lifecycle

1. **GET render** (`expense-get-handler.ts`): a fresh ULID is minted server-side per rendered page and threaded into the form state. It is never generated in the browser, so it is stable for a given rendered page and cannot be tampered with before the POST.
2. **Entry form** (`expense-form.tsx`): the key is rendered as a hidden `<input name="submissionKey">`.
3. **Confirm form** (`renderConfirmNewItems`): the same key is round-tripped through the confirm page's hidden fields (alongside `category` / `tagId` / `newTags`), so the confirm POST carries the original key.
4. **POST handler** (`readRawBody` in `expense-form-helpers.ts`): extracts `submissionKey` from the parsed body, defaulting to `''` when absent or non-string.
5. **Commit**: the handler passes `raw.submissionKey` + `requireUserId(c)` to `withIdempotency`, which either short-circuits to the stored outcome or runs the commit and records the ledger row.

## Handlers That Use It

Only the actual commit calls are wrapped. Pre-write validation and the confirmation-page render branch stay outside the idempotent section so a failed validation records no ledger row and the key stays resubmittable.

- **Direct-create path** — `handleExpensesPost` in [expense-post-handler.ts](src/routes/expenses/expense-post-handler.md). When nothing is new (existing category + only existing tags), the commit goes straight through `withIdempotency` wrapping `createExpenseWithTags`. When something is new, the handler renders the confirmation page instead — no write, no ledger row.
- **Confirm-create path** — `handleExpensesConfirmPost` in [expense-confirm-post-handler.ts](src/routes/expenses/expense-confirm-post-handler.md). After `resolveConfirmTagsAndCategory` succeeds (all pre-write validation done), the commit goes through `withIdempotency` wrapping `createManyAndExpense`. The confirm form's hidden `submissionKey` is the original one minted on the entry GET, so a replay of either the entry POST or the confirm POST dedupes against the same ledger row.

Both handlers share the `EXPENSE_ADDED_OUTCOME` constant (`{ path: PATHS.EXPENSES, message: 'Expense added.' }`) so a replay reproduces the original success redirect.

## Key Design Decisions

1. **HTTP-agnostic helper** — `withIdempotency` takes a drizzle client, not a Hono context, so it is unit-testable and reusable across handlers.
2. **Server-minted key** — the ULID is generated in the GET handler, never in the browser, so it is stable for a given rendered page and cannot be tampered with before the POST.
3. **Validation stays outside the idempotent section** — pre-write validation and the confirmation-page render are not wrapped, so a failed validation records no ledger row and the key stays resubmittable.
4. **Best-effort TTL prune** — stale rows are deleted opportunistically after every successful write; failures are swallowed and logged so housekeeping can never break a submit.
5. **Corrupt-stored-value defense** — `parseOutcome` returns `null` on a malformed stored outcome, causing the helper to fall through and re-run the mutation rather than poisoning the submit.
6. **Shared outcome constant** — `EXPENSE_ADDED_OUTCOME` is shared by the direct-create and confirm-create handlers so a replay of either POST reproduces the same redirect.

## Tests

- [submission-idempotency.spec.ts](unit-tests.md) — integration coverage for all four contract branches (fresh, replay, validation failure, absent/malformed key) against the test-DB harness.

## Walkthrough

- [Code walkthrough (Issue 19)](../walkthroughs/19-submission-idempotency-backbone/code-walkthrough/code-walkthrough.md) — showboat-generated walkthrough of the implementation.

## References

- PRD: `Notes/PRD-expense-log.md` — _Data model (new tables)_
- Issue: `Notes/issues/19-submission-idempotency-backbone.md`
- Tasks: `Notes/tasks/19-submission-idempotency-backbone.md`
