# Issue 01 — Schema, Navigation, and Empty Expense List

_2026-04-24T19:39:39Z by Showboat 0.6.1_

<!-- showboat-id: 06c40d81-078f-4eb9-baaa-dc0f53f30e10 -->

This walkthrough demonstrates the tracer slice for Issue 01: six new Drizzle-managed expense tables (behind a partial unique dedupe index), five route path constants, four placeholder route builders plus the /expenses page with its empty-state, and header navigation links that show up only when signed in.

## 1. Schema additions

New tables defined in src/db/schema.ts: category, tag, recurring, expense, expenseTag, recurringTag. The expense table carries a partial unique index on (recurringId, occurrenceDate) WHERE recurringId IS NOT NULL so the recurring-expenses cron (future work) cannot double-insert.

```bash
grep -E "^export const (category|tag|recurring|expense|expenseTag|recurringTag) =" src/db/schema.ts
```

```output
export const category = sqliteTable('category', {
export const tag = sqliteTable('tag', {
export const recurring = sqliteTable('recurring', {
export const expense = sqliteTable(
export const expenseTag = sqliteTable(
export const recurringTag = sqliteTable(
```

## 2. Generated migration SQL

```bash
cat drizzle/0002_sharp_sleeper.sql
```

````output
CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_name_unique` ON `category` (`name`);--> statement-breakpoint
CREATE TABLE `expense` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`amountCents` integer NOT NULL,
	`categoryId` text NOT NULL,
	`date` text NOT NULL,
	`recurringId` text,
	`occurrenceDate` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`categoryId`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`recurringId`) REFERENCES `recurring`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expense_recurring_occurrence_unique` ON `expense` (`recurringId`,`occurrenceDate`) WHERE "expense"."recurringId" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `expenseTag` (
	`expenseId` text NOT NULL,
	`tagId` text NOT NULL,
	PRIMARY KEY(`expenseId`, `tagId`),
	FOREIGN KEY (`expenseId`) REFERENCES `expense`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tagId`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `recurring` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`amountCents` integer NOT NULL,
	`categoryId` text NOT NULL,
	`recurrence` text NOT NULL,
	`anchorDate` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`categoryId`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `recurringTag` (
	`recurringId` text NOT NULL,
	`tagId` text NOT NULL,
	PRIMARY KEY(`recurringId`, `tagId`),
	FOREIGN KEY (`recurringId`) REFERENCES `recurring`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tagId`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `tag` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag_name_unique` ON `tag` (`name`);```
````

## 3. Verifying the new tables are present in the local D1

```bash
DB=$(ls .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite | grep -v metadata); sqlite3 "$DB" ".tables" | tr ' ' '\n' | sort | grep -v '^$'
```

```output
_cf_METADATA
account
category
expense
expenseTag
interestedEmail
recurring
recurringTag
session
singleUseCode
tag
user
verification
```

And confirming the partial unique index exists (pragma index_list on expense).

```bash
DB=$(ls .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite | grep -v metadata); sqlite3 "$DB" ".indexes expense"
```

```output
expense_recurring_occurrence_unique
```

## 4. Route path constants

```bash
grep -nE 'EXPENSES|CATEGORIES|TAGS|SUMMARY|RECURRING' src/constants.ts | head -10
```

```output
75:  EXPENSES: '/expenses' as const,
76:  CATEGORIES: '/categories' as const,
77:  TAGS: '/tags' as const,
78:  SUMMARY: '/summary' as const,
79:  RECURRING: '/recurring' as const,
```

## 5. Route builders and wiring

```bash
ls src/routes/build-categories.tsx src/routes/build-tags.tsx src/routes/build-summary.tsx src/routes/build-recurring.tsx src/routes/expenses/build-expenses.tsx
```

```output
src/routes/build-categories.tsx
src/routes/build-recurring.tsx
src/routes/build-summary.tsx
src/routes/build-tags.tsx
src/routes/expenses/build-expenses.tsx
```

```bash
grep -nE 'buildExpenses|buildCategories|buildTags|buildSummary|buildRecurring' src/index.ts
```

```output
17:import { buildExpenses } from './routes/expenses/build-expenses'
18:import { buildCategories } from './routes/build-categories'
19:import { buildTags } from './routes/build-tags'
20:import { buildSummary } from './routes/build-summary'
21:import { buildRecurring } from './routes/build-recurring'
176:buildExpenses(app)
177:buildCategories(app)
178:buildTags(app)
179:buildSummary(app)
180:buildRecurring(app)
```

## 6. Header navigation

```bash
grep -nE "data-testid='(expenses|categories|tags|summary|recurring)-nav'" src/routes/build-layout.tsx
```

```output
65:                data-testid='expenses-nav'
72:                data-testid='categories-nav'
76:              <a href={PATHS.TAGS} className='btn btn-ghost btn-sm' data-testid='tags-nav'>
79:              <a href={PATHS.SUMMARY} className='btn btn-ghost btn-sm' data-testid='summary-nav'>
85:                data-testid='recurring-nav'
```

## 7. /expenses empty-state

```bash
grep -n 'expenses-empty-state\|No expenses yet' src/routes/expenses/build-expenses.tsx
```

```output
21:      <p className='text-gray-600' data-testid='expenses-empty-state'>
22:        No expenses yet
```

## 8. End-to-end test evidence

```bash
npx playwright test e2e-tests/general/06-expense-routes-require-auth.spec.ts e2e-tests/general/07-expense-routes-signed-in.spec.ts e2e-tests/general/08-expense-nav-links.spec.ts --reporter=line 2>&1 | tail -5
```

```output
[1A[2KDatabase sessions cleared successfully

[1A[2KDatabase cleared successfully

[1A[2K  18 passed (20.9s)
```
