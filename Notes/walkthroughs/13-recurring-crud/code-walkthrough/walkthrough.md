# Issue 13: Recurring Templates CRUD — Code Walkthrough

*2026-05-11T00:19:07Z by Showboat 0.6.1*
<!-- showboat-id: e3f64482-ac78-4530-9f4e-50511ea351f4 -->

## Overview

Issue 13 implements full CRUD for recurring expense templates. This walkthrough covers:
1. The recurrence stub in `src/lib/recurrence.ts`
2. The recurring DB access helpers in `src/lib/db/expense-access.ts`
3. The `parseRecurringCreate` validator in `src/lib/expense-validators.ts`
4. The shared recurring-form renderer in `src/routes/recurring/recurring-form.tsx`
5. The `/recurring` list page in `src/routes/build-recurring.tsx`
6. The create flow in `src/routes/recurring/build-create-recurring.tsx`
7. The edit/delete flow in `src/routes/recurring/build-edit-recurring.tsx`
8. The generalized confirmation renderer in `src/routes/expenses/expense-form.tsx`

## 1. Recurrence stub: nextOccurrenceAfter

Located in `src/lib/recurrence.ts`. Handles Monthly recurrence; Quarterly/Yearly throw until Issue 14. Clamps anchor day to the last day of the target month (e.g. anchor day 31 in April → April 30).

```bash
grep -n 'export const nextOccurrenceAfter' src/lib/recurrence.ts
```

```output
53:export const nextOccurrenceAfter = ({
```

## 2. Validator: parseRecurringCreate

Located in `src/lib/expense-validators.ts`. Returns `Result<ParsedRecurringCreate, FieldErrors>`. Rules: description ≤ 200, amount > 0 with ≤ 2 decimals, category ≤ 20, recurrence in VALID_RECURRENCES, anchorDate valid YYYY-MM-DD rejecting impossible dates.

```bash
grep -n 'parseRecurringCreate\|VALID_RECURRENCES\|RecurrenceSchema\|AnchorDateSchema' src/lib/expense-validators.ts | head -20
```

```output
891:export const VALID_RECURRENCES = ['Monthly', 'Quarterly', 'Yearly'] as const
892:export type Recurrence = (typeof VALID_RECURRENCES)[number]
907: * The fully-validated output of `parseRecurringCreate`.
921:export const RecurrenceSchema = pipe(
924:    (v) => typeof v === 'string' && (VALID_RECURRENCES as readonly string[]).includes(v),
933:export const AnchorDateSchema = pipe(
947:export const parseRecurringCreate = (
979:  const recurrenceError = firstIssueMessage(RecurrenceSchema, recurrenceRaw)
985:  const anchorDateError = firstIssueMessage(AnchorDateSchema, anchorDate)
```

## 3. Recurring DB helpers

The following helpers were added to `src/lib/db/expense-access.ts`:
- `listRecurring(db)` — joins recurring with category + recurringTag + tag, returns rows sorted by description asc
- `getRecurringById(db, id)` — single row lookup, returns null when not found
- `createRecurringWithTags(db, input)` — used on all-existing path; no new category/tag DB writes
- `createManyAndRecurring(db, input)` — atomic batch: optional new category, new tags, template, recurringTag links
- `updateRecurringWithTags(db, input)` — all-existing edit path
- `updateManyAndRecurring(db, input)` — atomic batch edit with new items
- `deleteRecurring(db, id)` — cascade delete; past expenses' recurringId is set null by the FK

```bash
grep -n 'export const listRecurring\|export const getRecurringById\|export const createRecurringWithTags\|export const createManyAndRecurring\|export const updateRecurringWithTags\|export const updateManyAndRecurring\|export const deleteRecurring' src/lib/db/expense-access.ts
```

```output
783:export const listRecurring = (db: DrizzleClient): Promise<Result<RecurringRow[], Error>> =>
849:export const getRecurringById = (
920:export const createRecurringWithTags = (
982:export const createManyAndRecurring = (
1098:export const updateRecurringWithTags = (
1171:export const updateManyAndRecurring = (
1281:export const deleteRecurring = (db: DrizzleClient, id: string): Promise<Result<void, Error>> =>
```

## 4. Shared form renderer

`src/routes/recurring/recurring-form.tsx` exports `renderRecurringForm({ mode, action, state, payloads })`. The form renders all six fields (description, amount, category, recurrence, anchor date, tags) with sticky `value` attributes and per-field error blocks. The submit button reads 'Add recurring' in create mode and 'Save changes' in edit mode.

```bash
wc -l src/routes/recurring/recurring-form.tsx
```

```output
197 src/routes/recurring/recurring-form.tsx
```

## 5. List page

`src/routes/build-recurring.tsx` — GET /recurring. Calls `listRecurring`, then for each row calls `nextOccurrenceAfter` inside a try/catch (Quarterly/Yearly fall back to '—' until Issue 14). Renders a DaisyUI zebra table.

## 6. Create flow

`src/routes/recurring/build-create-recurring.tsx` — three routes:
- `GET /recurring/new` — renders form with category/tag payloads and optional flash state
- `POST /recurring` — validates → resolves existing/new items → either saves directly or shows confirmation
- `POST /recurring/confirm-create-new` — defensive re-validation → atomic create via `createManyAndRecurring` or direct via `createRecurringWithTags`

## 7. Edit/delete flow

`src/routes/recurring/build-edit-recurring.tsx` — five routes:
- `GET /recurring/:id/edit` — loads template, pre-populates form with `formatCentsPlain`
- `POST /recurring/:id/edit` — same diff logic as create; all-existing → `updateRecurringWithTags`; new items → confirmation
- `POST /recurring/:id/confirm-edit-new` — defensive re-validation → `updateManyAndRecurring`
- `GET /recurring/:id/delete` — confirmation page with full template preview
- `POST /recurring/:id/delete` — calls `deleteRecurring`, redirects to list

## 8. Generalized confirmation renderer

`src/routes/expenses/expense-form.tsx` — `renderConfirmNewItems` now accepts an optional `entity: 'expense' | 'recurring'` prop. When `entity='recurring'`:
- testid prefix changes to `confirm-recurring-{create,edit}-new-*`
- preview shows Recurrence and Anchor date rows instead of Date
- hidden inputs carry `recurrence`/`anchorDate` instead of `date`

## Unit test coverage

Run the relevant unit tests to verify all passing:

```bash
bun test tests/expense-validators.spec.ts tests/expense-access.spec.ts tests/recurrence.spec.ts 2>&1 | tail -4
```

```output

 197 pass
 0 fail
Ran 197 tests across 3 files. [9.64s]
```

197 unit tests pass across expense-validators, expense-access, and recurrence specs.

```bash
bun run tsc --noEmit 2>&1 | grep 'error TS' | grep -v 'bun:test\|send-email\|sign-up-utils\|time-access\|db-access-retry\|expense-access.spec\|recurrence.spec\|expense-validators.spec' | head -5
```

```output
src/lib/db/summary-access.ts(9,43): error TS6133: 'sql' is declared but its value is never read.
```

Only one pre-existing TS warning (unused 'sql' in summary-access.ts). No new type errors from Issue 13 changes.
