# src/lib/db/expense-access.ts

Read/write helpers for the `expense` table, `recurring` table, and their joins. The largest DB access module (~1520 lines). All functions use `withRetry` and return `Result` types.

## Types

- `ExpenseRow` — id, date, description, categoryName, amountCents, tagNames[], recurringId
- `ExpenseDetailRow` — extends ExpenseRow with categoryId, tagIds[]
- `ListExpenseFilters` — from, to, description, categoryId, tagIds[], tagMode
- `CreateExpenseInput`, `CreateExpenseWithTagsInput`, `UpdateExpenseWithTagsInput`
- `CreateCategoryAndExpenseInput`, `CreateManyAndExpenseInput`, `UpdateManyAndExpenseInput`
- `RecurringRow` — id, description, amountCents, categoryId, categoryName, recurrence, anchorDate, tagIds[], tagNames[]
- `CreateRecurringWithTagsInput`, `CreateManyAndRecurringInput`, `UpdateRecurringWithTagsInput`, `UpdateManyAndRecurringInput`
- `MaterializeRecurringResult` — generated, skipped, failed[]

## Expense Functions

### createExpense(db, input): Result\<{ id }, Error\>

Creates expense after verifying categoryId exists. Uses `crypto.randomUUID()`.

### listExpenses(db, filters): Result\<ExpenseRow[], Error\>

Lists expenses with filters: date range (from/to), description LIKE, categoryId, tagIds with OR/AND mode. Sorted by date DESC, description ASC. Includes tag names via join.

### createCategoryAndExpense(db, input): Result\<{ categoryId, expenseId }, Error\>

Atomically creates a new category + expense in a single D1 batch.

### createExpenseWithTags(db, input): Result\<{ id }, Error\>

Creates expense + expenseTag links in a single batch. De-duplicates tagIds.

### getExpenseById(db, id): Result\<ExpenseDetailRow | null, Error\>

Looks up single expense with category name/id and sorted tag list.

### updateExpenseWithTags(db, input): Result\<{ id }, Error\>

Updates expense fields and replaces all expenseTag links in a single batch.

### updateManyAndExpense(db, input): Result\<{ id, categoryId, createdTagIds }, Error\>

Atomically creates new category + new tags + updates expense + replaces tag links in a single batch.

### createManyAndExpense(db, input): Result\<{ categoryId, expenseId, createdTagIds }, Error\>

Atomically creates new category + new tags + expense + tag links in a single batch.

### deleteExpense(db, id): Result\<void, Error\>

Deletes expense. Cascade deletes expenseTag rows automatically.

## Recurring Functions

### listRecurring(db): Result\<RecurringRow[], Error\>

Lists all recurring templates with category name and sorted tags. Ordered by description ASC.

### getRecurringById(db, id): Result\<RecurringRow | null, Error\>

Looks up single recurring template with tags.

### createRecurringWithTags(db, input): Result\<{ id }, Error\>

Creates recurring template + recurringTag links in a single batch.

### createManyAndRecurring(db, input): Result\<{ categoryId, recurringId, createdTagIds }, Error\>

Atomically creates new category + new tags + recurring template + tag links in a single batch.

### updateRecurringWithTags(db, input): Result\<{ id }, Error\>

Updates recurring template fields and replaces tag links. Does NOT modify previously generated expense rows.

### updateManyAndRecurring(db, input): Result\<{ id, categoryId, createdTagIds }, Error\>

Atomically creates new category + new tags + updates recurring + replaces tag links in a single batch.

### deleteRecurring(db, id): Result\<void, Error\>

Deletes recurring template. Cascade deletes recurringTag rows. Sets `expense.recurringId` to null on past generated expenses.

## Materialization Functions

### materializeRecurring(db, today): Result\<MaterializeRecurringResult, Error\>

Cron-triggered materialization of all pending recurring expenses:

1. Loads all recurring templates with tags (with retry)
2. For each template: finds last occurrence, computes dates via `occurrencesToGenerate`, inserts expense rows with `recurringId` + `occurrenceDate`
3. Unique-index violations on `(recurringId, occurrenceDate)` are treated as skips
4. Per-template errors collected in `failed[]`, remaining templates continue

## Dependencies

- `drizzle-orm` — query builders
- `true-myth/result` — Result type
- `ulid` — ID generation for tags
- `../../db/schema` — all table definitions
- `../../local-types` — `DrizzleClient`
- `../db-helpers` — `withRetry`, `toResult`
- `../et-date` — `todayEt`
- `../recurrence` — `occurrencesToGenerate`
