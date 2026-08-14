# Issue 19: Submission Idempotency Ledger + Server Dedupe Backbone — Code Walkthrough

*2026-08-14T14:42:12Z by Showboat 0.6.1*
<!-- showboat-id: 13f96597-5c5a-4724-af5f-ea8d854fb851 -->

This walkthrough covers the Issue 19 implementation: the `submissionKey` ledger table, the `withIdempotency` helper (fresh vs. replayed vs. malformed key, transaction guarantee, TTL prune), the hidden `submissionKey` field round-tripped through the entry/confirm forms, and the two committing expense handlers (`handleExpensesPost` direct-create path and `handleExpensesConfirmPost`) routed through the ledger. The implementation spans the schema, a generated Drizzle migration, one new library module, three route files, and an integration spec — all exercised server-side by replaying a POST.

## 1. The `submissionKey` Ledger Table

The new ledger lives in `src/db/schema.ts` alongside the other tables. It mirrors the `session` table's `userId` foreign-key-with-cascade shape: `key` is the primary key (a server-minted ULID), `userId` references `user.id` with `onDelete: 'cascade'` so deleting a user reaps their ledger, `outcome` is the canonical post-submit redirect target plus flash message serialized as JSON text, and `createdAt` is a not-null timestamp used by the TTL prune. The table is added to the exported `schema` object and gets `SubmissionKey` / `NewSubmissionKey` inferred types alongside the other tables.

```bash
echo '=== submissionKey table definition ===' && sed -n '198,214p' src/db/schema.ts && echo '' && echo '=== schema export + inferred types ===' && sed -n '233,233p' src/db/schema.ts && sed -n '251,251p' src/db/schema.ts && sed -n '268,268p' src/db/schema.ts
```

```output
=== submissionKey table definition ===
/**
 * Submission idempotency ledger schema definition.
 *
 * Records a committing mutation's server-generated `submissionKey` (a ULID)
 * inside the same transaction as the write so a replayed submission carrying
 * an already-recorded key can be short-circuited to its stored `outcome`
 * instead of writing again. Rows are pruned opportunistically after a short
 * TTL. See PRD _Data model (new tables)_.
 */
export const submissionKey = sqliteTable('submissionKey', {
  key: text('key').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  outcome: text('outcome').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
})

=== schema export + inferred types ===
  submissionKey,
export type SubmissionKey = typeof submissionKey.$inferSelect
export type NewSubmissionKey = typeof submissionKey.$inferInsert
```

The migration was generated through the project's `build-schema-update.sh` / drizzle-kit flow (no hand-edits beyond what the tool produced). It creates the table with the FK and `ON DELETE cascade` exactly as specified in the PRD _Data model (new tables)_.

```bash
cat drizzle/0005_perpetual_carnage.sql
```

```output
CREATE TABLE `submissionKey` (
	`key` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`outcome` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
```

## 2. The `withIdempotency` Contract

`src/lib/submission-idempotency.ts` is the heart of Issue 19. It is HTTP-agnostic — it accepts a drizzle client, not a Hono context — so the same helper can be unit-tested against the test-DB harness and reused by any committing handler. The contract has four branches:

- **Fresh, well-formed key**: runs `run`, records the ledger row on success, returns the outcome.
- **Duplicate key**: returns the stored outcome without re-running `run`.
- **`run` returns `Result.err`**: records no ledger row; the key stays resubmittable.
- **Absent / malformed key**: runs `run` exactly once with no dedupe and never blocks a legitimate submit.

A Crockford-base32 ULID pattern (`/^[0-9A-HJKMNP-TV-Z]{26}$/i`, 26 chars excluding I/L/O/U, case-insensitive) gates the dedupe path. The persisted `outcome` is JSON-serialized `{ path, message }`; `parseOutcome` defensively returns `null` on a corrupt stored value so the helper falls through and re-runs the mutation rather than poisoning the submit.

```bash
echo '=== Module-level constants + ULID gate ===' && sed -n '24,58p' src/lib/submission-idempotency.ts && echo '' && echo '=== parseOutcome (corrupt-stored-value defense) ===' && sed -n '60,80p' src/lib/submission-idempotency.ts
```

```output
=== Module-level constants + ULID gate ===
// Ledger rows older than this are pruned opportunistically so the table does
// not grow unbounded. A short window is enough: retries happen within seconds.
const LEDGER_TTL_MS = 24 * 60 * 60 * 1000 // ~24 hours

/**
 * The persisted result of a committing submission — enough to replay the
 * original post-redirect-get (its redirect target plus flash message).
 */
export interface SubmissionOutcome {
  path: string
  message: string
}

/**
 * Arguments for {@link withIdempotency}.
 *
 * `run` performs the mutation and returns the outcome to persist. It must
 * return `Result.err` to signal a validation/commit failure, in which case
 * no ledger row is recorded and the key remains resubmittable.
 */
export interface WithIdempotencyArgs {
  key: string
  userId: string
  run: () => Promise<Result<SubmissionOutcome, Error>>
}

// Crockford base32 ULID: 26 chars, excluding I, L, O, U. Case-insensitive.
const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/i

/**
 * True when `key` is a well-formed Crockford-base32 ULID and therefore safe
 * to use as an idempotency ledger key.
 */
const isValidSubmissionKey = (key: unknown): key is string =>
  typeof key === 'string' && ULID_PATTERN.test(key)

=== parseOutcome (corrupt-stored-value defense) ===
/**
 * Parse a stored `outcome` string back into a {@link SubmissionOutcome}.
 * Returns `null` when the stored value is missing or malformed.
 */
const parseOutcome = (raw: string): SubmissionOutcome | null => {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as SubmissionOutcome).path === 'string' &&
      typeof (parsed as SubmissionOutcome).message === 'string'
    ) {
      const { path, message } = parsed as SubmissionOutcome
      return { path, message }
    }
    return null
  } catch {
    return null
  }
}
```

The main `withIdempotency` body walks the four branches in order. Note the transaction guarantee: `run` performs its write, and only on success does the helper insert the ledger row — so the ledger row records a commit that already happened. A duplicate key short-circuits at the `select` before `run` is ever invoked.

```bash
sed -n '99,159p' src/lib/submission-idempotency.ts
```

```output
/**
 * Run `run` idempotently, keyed off `key` for `userId`.
 *
 * - Fresh, well-formed key: runs `run`, records the ledger row on success,
 *   and returns the outcome.
 * - Duplicate key: returns the stored outcome without re-running `run`.
 * - `run` returns `Result.err`: no ledger row is recorded; the key stays
 *   resubmittable.
 * - Absent / malformed key: runs `run` exactly once with no dedupe.
 *
 * @param db - Drizzle database client (HTTP-agnostic; not a Hono context)
 * @param args - `{ key, userId, run }`
 * @returns The outcome to replay, or the error `run` reported
 */
export const withIdempotency = async (
  db: DrizzleClient,
  { key, userId, run }: WithIdempotencyArgs,
): Promise<Result<SubmissionOutcome, Error>> => {
  // Absent or malformed key: never dedupe, never block — just run once.
  if (!isValidSubmissionKey(key)) {
    return run()
  }

  // Replay check: return the stored outcome for an already-recorded key.
  const existing = await toResult(() =>
    db
      .select({ outcome: submissionKey.outcome })
      .from(submissionKey)
      .where(eq(submissionKey.key, key))
      .limit(1),
  )
  if (existing.isOk && existing.value.length > 0) {
    const stored = parseOutcome(existing.value[0].outcome)
    if (stored !== null) {
      return Result.ok(stored)
    }
    // Corrupt stored outcome — fall through and re-run the mutation.
  }

  // Fresh key (or unreadable ledger): perform the mutation.
  const result = await run()
  if (result.isErr) {
    // Validation / commit failure: record nothing, stay resubmittable.
    return result
  }

  // Record the key + its outcome so a later replay short-circuits here.
  await toResult(() =>
    db.insert(submissionKey).values({
      key,
      userId,
      outcome: JSON.stringify(result.value),
      createdAt: new Date(),
    }),
  )

  // Opportunistically prune stale rows (best-effort, never blocks the submit).
  await pruneStaleLedgerRows(db)

  return Result.ok(result.value)
}
```

## 3. Opportunistic TTL Prune

`pruneStaleLedgerRows` runs after every successful write and deletes ledger rows older than `LEDGER_TTL_MS` (~24h). It uses the project's `toResult` wrapper from `src/lib/db-helpers.ts` so any failure is converted to a `Result.err` and swallowed with a log line — a housekeeping problem can never turn a legitimate submission into a failure. The TTL is a named file-level constant so it is easy to tune.

```bash
sed -n '82,97p' src/lib/submission-idempotency.ts
```

```output
/**
 * Best-effort prune of ledger rows older than {@link LEDGER_TTL_MS}.
 *
 * Runs opportunistically after a successful write. Any failure is swallowed
 * and logged so a housekeeping problem can never turn a legitimate submission
 * into a failure.
 */
const pruneStaleLedgerRows = async (db: DrizzleClient): Promise<void> => {
  const cutoff = new Date(Date.now() - LEDGER_TTL_MS)
  const pruned = await toResult(() =>
    db.delete(submissionKey).where(lt(submissionKey.createdAt, cutoff)),
  )
  if (pruned.isErr) {
    console.log('submission-idempotency prune error:', pruned.error)
  }
}
```

## 4. Minting + Round-Tripping the Hidden `submissionKey`

The key is minted server-side per GET render in `expense-get-handler.ts` — never in the browser — so it is stable for a given rendered page. It is threaded into the form state and rendered as a hidden input by `renderExpenseForm`. `renderConfirmNewItems` round-trips the same key through its hidden fields (alongside `category` / `tagId` / `newTags`) so the confirm POST carries the original key. `readRawBody` in `expense-form-helpers.ts` extracts `submissionKey` from the parsed body, defaulting to `''` when absent or non-string.

```bash
echo '=== GET handler mints a fresh ULID per render ===' && sed -n '78,94p' src/routes/expenses/expense-get-handler.ts && echo '' && echo '=== Entry form hidden input ===' && sed -n '70,70p' src/routes/expenses/expense-form.tsx && echo '' && echo '=== Confirm form round-trips the same key ===' && sed -n '268,273p' src/routes/expenses/expense-form.tsx && echo '' && echo '=== readRawBody extracts submissionKey ===' && sed -n '78,78p' src/routes/expenses/expense-form-helpers.ts
```

```output
=== GET handler mints a fresh ULID per render ===
  // Mint a fresh server-generated submission key per rendered page so the
  // entry form (and any confirm round-trip) can dedupe replayed submits.
  const submissionKey = ulid()
  const state: ExpenseFormState = flash
    ? {
        fieldErrors: flash.fieldErrors ?? {},
        values: {
          description: flash.values.description ?? '',
          amount: flash.values.amount ?? '',
          date: flash.values.date ?? today,
          category: flash.values.category ?? '',
          tagIds: flash.values.tagIds ?? [],
          newTags: flash.values.newTags ?? '',
          submissionKey,
        },
      }
    : { ...emptyState(today), values: { ...emptyState(today).values, submissionKey } }

=== Entry form hidden input ===
      <input type='hidden' name='submissionKey' value={values.submissionKey ?? ''} />

=== Confirm form round-trips the same key ===
        <input type='hidden' name='category' value={values.category ?? ''} />
        {(values.tagIds ?? []).map((id) => (
          <input type='hidden' name='tagId' value={id} />
        ))}
        <input type='hidden' name='newTags' value={values.newTags ?? ''} />
        <input type='hidden' name='submissionKey' value={values.submissionKey ?? ''} />

=== readRawBody extracts submissionKey ===
    submissionKey: typeof form.submissionKey === 'string' ? form.submissionKey : '',
```

## 5. Routing the Committing Handlers Through `withIdempotency`

Two handlers wrap their committing write through the ledger, keyed off the submitted `submissionKey` and the signed-in `userId` (obtained via `requireUserId`, which reads the `signedInAccess` middleware context). Only the actual commit calls are wrapped — pre-write validation and the confirmation-page render branch stay outside the idempotent section so a failed validation stays resubmittable. The persisted outcome is the shared `EXPENSE_ADDED_OUTCOME` constant (`{ path: PATHS.EXPENSES, message: 'Expense added.' }`), so a replay reproduces the original success redirect.

**Direct-create path** (`handleExpensesPost` in `expense-post-handler.ts`): when nothing is new (existing category + only existing tags), the commit goes straight through `withIdempotency` wrapping `createExpenseWithTags`. When something is new, the handler renders the confirmation page instead — no write, no ledger row.

```bash
echo '=== EXPENSE_ADDED_OUTCOME shared constant ===' && sed -n '16,24p' src/routes/expenses/expense-form-helpers.ts && echo '' && echo '=== Direct-create path wraps createExpenseWithTags ===' && sed -n '113,139p' src/routes/expenses/expense-post-handler.ts
```

```output
=== EXPENSE_ADDED_OUTCOME shared constant ===
/**
 * The canonical success outcome for a committed expense create — the
 * post-redirect-get target plus its flash message. Shared by the direct-create
 * and confirm-create handlers so a replayed submit reproduces the same result.
 */
export const EXPENSE_ADDED_OUTCOME: SubmissionOutcome = {
  path: PATHS.EXPENSES,
  message: 'Expense added.',
}

=== Direct-create path wraps createExpenseWithTags ===
  if (!anyNew) {
    // Everything matches — create the expense (and link tags) directly.
    // Route the commit through the idempotency ledger so a replayed POST
    // carrying the same submissionKey reproduces the redirect without a
    // second write.
    const outcome = await withIdempotency(db, {
      key: raw.submissionKey,
      userId: requireUserId(c),
      run: async () => {
        const createResult = await createExpenseWithTags(db, {
          description: validated.value.description,
          amountCents: validated.value.amountCents,
          date: validated.value.date,
          categoryId: lookup.value!.id,
          tagIds: existingTagIds,
        })
        if (createResult.isErr) {
          return Result.err(createResult.error)
        }
        return Result.ok(EXPENSE_ADDED_OUTCOME)
      },
    })
    if (outcome.isErr) {
      return redirectWithError(c, PATHS.EXPENSES, 'Failed to save expense. Please try again.')
    }
    return redirectWithMessage(c, outcome.value.path, outcome.value.message)
  }
```

**Confirm-create path** (`handleExpensesConfirmPost` in `expense-confirm-post-handler.ts`): after `resolveConfirmTagsAndCategory` succeeds (all pre-write validation done), the commit goes through `withIdempotency` wrapping `createManyAndExpense`. The confirm form's hidden `submissionKey` is the original one minted on the entry GET, so a replay of either the entry POST or the confirm POST dedupes against the same ledger row.

```bash
sed -n '92,123p' src/routes/expenses/expense-confirm-post-handler.ts
```

```output
  // Route the commit through the idempotency ledger so a replayed confirm
  // POST carrying the same submissionKey reproduces the redirect without a
  // second write.
  const outcome = await withIdempotency(db, {
    key: raw.submissionKey,
    userId: requireUserId(c),
    run: async () => {
      const createResult = await createManyAndExpense(db, {
        newCategoryName: newCategoryName ?? null,
        existingCategoryId: existingCategoryId ?? null,
        newTagNames,
        existingTagIds,
        date: validated.value.date,
        description: validated.value.description,
        amountCents: validated.value.amountCents,
      })
      if (createResult.isErr) {
        return Result.err(createResult.error)
      }
      return Result.ok(EXPENSE_ADDED_OUTCOME)
    },
  })
  if (outcome.isErr) {
    const errs: FieldErrors =
      newCategoryName !== null
        ? { category: outcome.error.message }
        : { tags: outcome.error.message }
    return redirectWithFormErrors(c, PATHS.EXPENSES, errs, rawValues)
  }

  return redirectWithMessage(c, outcome.value.path, outcome.value.message)
}
```

## 6. Integration Test Coverage

`tests/submission-idempotency.spec.ts` exercises all four contract branches against the test-DB harness (reusing `createTestDb` / `seedUser` / `seedCategory` from `tests/helpers/test-db.ts`). It asserts observable outcomes — row counts, returned outcome value, and `run` invocation count via a spy — rather than implementation details. A `user` row is seeded so the FK is satisfiable. Running the suite confirms all four tests pass.

```bash
bun test tests/submission-idempotency.spec.ts 2>&1 | sed -E 's/\[[0-9]+\.[0-9]+ms\]/[Xms]/g' | tail -10
```

```output

tests/submission-idempotency.spec.ts:
(pass) withIdempotency > (a) a fresh key runs run once, persists the outcome, and returns it [Xms]
(pass) withIdempotency > (b) replaying the same key returns the stored outcome without a second write [Xms]
(pass) withIdempotency > (c) a run that signals validation failure records no ledger row and stays resubmittable [Xms]
(pass) withIdempotency > (d) an absent or malformed key runs run once with no dedupe and no ledger row [Xms]

 4 pass
 0 fail
Ran 4 tests across 1 file. [Xms]
```

## 7. Files Touched

- `src/db/schema.ts` — `submissionKey` table, `schema` export, `SubmissionKey` / `NewSubmissionKey` types
- `drizzle/0005_perpetual_carnage.sql` — generated migration creating the table with FK + cascade
- `src/lib/submission-idempotency.ts` — `withIdempotency`, `SubmissionOutcome`, `WithIdempotencyArgs`, `pruneStaleLedgerRows`, ULID gate, `parseOutcome`
- `src/routes/expenses/expense-get-handler.ts` — mints a fresh ULID per GET render
- `src/routes/expenses/expense-form.tsx` — hidden `submissionKey` input on entry + confirm forms
- `src/routes/expenses/expense-form-helpers.ts` — `readRawBody` extracts `submissionKey`; `EXPENSE_ADDED_OUTCOME` shared constant
- `src/routes/expenses/expense-post-handler.ts` — direct-create commit routed through `withIdempotency`
- `src/routes/expenses/expense-confirm-post-handler.ts` — confirm-create commit routed through `withIdempotency`
- `tests/submission-idempotency.spec.ts` — integration coverage for all four contract branches

## 8. Key Design Decisions

1. **HTTP-agnostic helper**: `withIdempotency` takes a drizzle client, not a Hono context, so it is unit-testable and reusable across handlers.
2. **Server-minted key**: the ULID is generated in the GET handler, never in the browser, so it is stable for a given rendered page and cannot be tampered with before the POST.
3. **Validation stays outside the idempotent section**: pre-write validation and the confirmation-page render are not wrapped, so a failed validation records no ledger row and the key stays resubmittable.
4. **Best-effort TTL prune**: stale rows are deleted opportunistically after every successful write; failures are swallowed and logged so housekeeping can never break a submit.
5. **Corrupt-stored-value defense**: `parseOutcome` returns `null` on a malformed stored outcome, causing the helper to fall through and re-run the mutation rather than poisoning the submit.
6. **Shared outcome constant**: `EXPENSE_ADDED_OUTCOME` is shared by the direct-create and confirm-create handlers so a replay of either POST reproduces the same redirect.

