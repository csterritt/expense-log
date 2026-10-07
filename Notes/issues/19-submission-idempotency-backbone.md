## Issue 19: Submission idempotency ledger + server dedupe backbone

**Type**: AFK
**Blocked by**: None — can start immediately

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

The server-side backbone that makes a replayed submission safe, so a later client retry (Issues 20–24) can never double-write.

- Add the `submissionKey` table (idempotency ledger) and a Drizzle migration: `key` (ULID, PK), `userId` (FK → the auth `user` table, `ON DELETE CASCADE`), `outcome` (text — the canonical post-submit redirect target plus its flash message), `createdAt`. See PRD section _Data model (new tables)_.
- Build `src/lib/submission-idempotency.ts` exposing `withIdempotency(db, { key, userId, run })`: `run` performs the mutation and returns the outcome to persist; the key is recorded inside the same transaction as the write; a duplicate key short-circuits to the stored outcome without repeating the write; an absent/malformed key runs the mutation once without dedupe (never blocks a legitimate submit).
- Render a server-generated hidden `submissionKey` (ULID) on the expense entry form and round-trip it through the expense confirmation page's hidden field.
- Wire the committing expense handlers (direct create and the confirm-create handler) to run their write through `withIdempotency`, keyed off the submitted `submissionKey`.
- Opportunistically prune ledger rows older than a short TTL (e.g. 24h).

This issue delivers no client behaviour change; it is exercised by replaying a POST server-side.

See PRD sections _Data model (new tables)_, _Resilient form submission (client retry + server idempotency)_ (idempotency bullet), and the `submission-idempotency` module in _Module Design_.

### How to verify

- **Manual**:
  1. Submit a valid expense; note the created row and the hidden `submissionKey` value used.
  2. Replay the exact same POST (same `submissionKey`) with a tool such as curl; confirm no second expense row is created and the response is the original success redirect.
  3. Submit an expense that fails validation; confirm no ledger row is recorded and resubmitting with the same key proceeds normally.
- **Automated**: integration tests for `withIdempotency` — fresh key commits once; replayed key returns the stored outcome and inserts nothing; a validation-failed key leaves no ledger row.

### Acceptance criteria

- [ ] Given a committing expense submission with key K, when the same POST is replayed with key K, then exactly one expense row exists and the stored outcome is returned.
- [ ] Given a submission that fails validation, then no `submissionKey` ledger row is recorded and the same key may be resubmitted.
- [ ] Given an absent or malformed `submissionKey`, then the mutation runs exactly once without dedupe.
- [ ] Given the migration is applied, then the `submissionKey` table exists with the columns and FK specified in the PRD.

### User stories addressed

- User story 78: no duplicate writes on retry (server backbone)

---
