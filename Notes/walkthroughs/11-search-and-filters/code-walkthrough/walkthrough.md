# Issue 11 Search and Filters Code Walkthrough

*2026-05-06T00:37:29Z by Showboat 0.6.1*
<!-- showboat-id: 65252280-ca69-4a10-9ea4-e1ba36d363af -->

This walkthrough documents the Issue 11 expense-list filter bar implementation. It covers: the extended ListExpenseFilters interface and listExpenses query builder (expense-access.ts), the parseExpenseListFilters validator (expense-validators.ts), the renderFilterBar UI component and wired GET /expenses handler (build-expenses.tsx), the two unit test suites, and the three new Playwright e2e specs.

## Schema (no changes)

Issue 11 requires no new schema changes. The existing expense, category, expenseTag, and tag tables provide everything needed. The expense.date column is a TEXT YYYY-MM-DD field used for all date comparisons. The expenseTag join table is the bridge for tag filters.

```bash
sed -n '133,160p' src/db/schema.ts
```

```output
 */
export const expense = sqliteTable(
  'expense',
  {
    id: text('id').primaryKey(),
    description: text('description').notNull(),
    amountCents: integer('amountCents').notNull(),
    categoryId: text('categoryId')
      .notNull()
      .references(() => category.id, { onDelete: 'restrict' }),
    date: text('date').notNull(),
    recurringId: text('recurringId').references(() => recurring.id, {
      onDelete: 'set null',
    }),
    occurrenceDate: text('occurrenceDate'),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('expense_recurring_occurrence_unique')
      .on(table.recurringId, table.occurrenceDate)
      .where(sql`${table.recurringId} IS NOT NULL`),
  ],
)

/**
 * Join table between expense and tag
 */
```

## ListExpenseFilters interface (expense-access.ts)

The ListExpenseFilters interface was extended from the required {from, to} pair to a fully optional object. Every field is optional: passing {} returns every expense; passing {from, to} replicates the old window behavior. The default 2-month window is now applied at the route layer (not here), so the DB helper is policy-free.

```bash
sed -n '32,40p' src/lib/db/expense-access.ts
```

```output
export interface ListExpenseFilters {
  from?: string
  to?: string
  description?: string
  categoryId?: string
  tagIds?: string[]
  tagMode?: 'or' | 'and'
}

```

## listExpensesActual — condition builder (expense-access.ts)

The query now builds a conditions array dynamically. Each filter field pushes a condition only if it is present and non-empty. The six conditions are then combined with and(). An empty conditions array produces whereClause = undefined, which Drizzle translates to no WHERE clause (returns all rows).

Key design decisions:
- description uses sql`lower(expense.description) LIKE lower('%' + term + '%')` for case-insensitive substring matching.
- Tag filters (tagIds) require subqueries because D1's SQLite dialect does not support correlated EXISTS in the same query as GROUP BY. The subquery runs first, materialises a list of matching expense IDs, and the main query filters by inArray(expense.id, matchingIds).
- tagMode='and' uses GROUP BY expenseId HAVING count(distinct tagId) = N to select only expenses that hold all N requested tags.
- tagMode='or' (default) uses a plain WHERE tagId IN (...) with a Set dedup on the returned expense IDs.
- All filters are combined with AND across fields: description AND from AND to AND categoryId AND tagIds.

```bash
sed -n '144,205p' src/lib/db/expense-access.ts
```

```output
const listExpensesActual = async (
  db: DrizzleClient,
  filters: ListExpenseFilters,
): Promise<Result<ExpenseRow[], Error>> => {
  try {
    const conditions: ReturnType<typeof eq>[] = []

    if (filters.from && filters.from.length > 0) {
      conditions.push(gte(expense.date, filters.from))
    }
    if (filters.to && filters.to.length > 0) {
      conditions.push(lte(expense.date, filters.to))
    }

    const descTrimmed = typeof filters.description === 'string' ? filters.description.trim() : ''
    if (descTrimmed.length > 0) {
      conditions.push(sql`lower(${expense.description}) like lower(${'%' + descTrimmed + '%'})`)
    }

    if (filters.categoryId && filters.categoryId.length > 0) {
      conditions.push(eq(expense.categoryId, filters.categoryId))
    }

    const activeTagIds =
      Array.isArray(filters.tagIds) && filters.tagIds.length > 0 ? filters.tagIds : null

    if (activeTagIds !== null) {
      if (filters.tagMode === 'and') {
        // AND: expense must have all of the listed tags.
        // Use a subquery that finds expenses lacking any of the required tags.
        const expensesWithAllTags = db
          .select({ expenseId: expenseTag.expenseId })
          .from(expenseTag)
          .where(inArray(expenseTag.tagId, activeTagIds))
          .groupBy(expenseTag.expenseId)
          .having(sql`count(distinct ${expenseTag.tagId}) = ${activeTagIds.length}`)
        const subqueryRows = await expensesWithAllTags
        if (subqueryRows.length === 0) {
          return Result.ok([])
        }
        const matchingIds = subqueryRows.map((r) => r.expenseId)
        conditions.push(inArray(expense.id, matchingIds))
      } else {
        // OR (default): expense must have at least one of the listed tags.
        const orSubquery = db
          .select({ expenseId: expenseTag.expenseId })
          .from(expenseTag)
          .where(inArray(expenseTag.tagId, activeTagIds))
        const orRows = await orSubquery
        if (orRows.length === 0) {
          return Result.ok([])
        }
        const matchingIds = [...new Set(orRows.map((r) => r.expenseId))]
        conditions.push(inArray(expense.id, matchingIds))
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db
      .select({
        id: expense.id,
```

## parseExpenseListFilters validator (expense-validators.ts)

The validator is the HTTP boundary for the filter bar. It accepts a RawExpenseListFilters object (all fields optional, tagId may be string | string[]) and returns {hasFilterParams, filters, fieldErrors}.

hasFilterParams is true when any of the six recognised keys appears in the raw object — even with an empty value. The route uses this to distinguish a fresh first load (no query string, apply default window) from an explicit filter submission (any key present, apply parsed filters including empty ones).

The fields are normalised as follows:
- description: trimmed; whitespace-only becomes undefined (no filter).
- from/to: each independently optional; validated as YYYY-MM-DD via isValidYmd(); invalid value → fieldErrors.date; missing or empty → undefined (open-ended range).
- categoryId: trimmed string or undefined.
- tagId: scalar or array, deduplicated, empty strings dropped.
- tagMode: defaults to 'or'; unknown values → fieldErrors.tags; tagMode='' treated as 'or' (browser sends empty string for unset radio).

```bash
sed -n '485,620p' src/lib/expense-validators.ts
```

```output
// ---------- Expense list filter parser (Issue 11) ----------

/**
 * Raw query-string values from the expense list filter bar.
 * All fields are optional; repeated `tagId` values are passed as an array.
 */
export type RawExpenseListFilters = {
  description?: string
  from?: string
  to?: string
  categoryId?: string
  tagId?: string | string[]
  tagMode?: string
}

/**
 * Normalized output from `parseExpenseListFilters`.
 */
export type ParsedExpenseListFilters = {
  description?: string
  from?: string
  to?: string
  categoryId?: string
  tagIds: string[]
  tagMode: 'or' | 'and'
}

/**
 * Result of parsing the expense list filter query string.
 * `hasFilterParams` is true when any filter query parameter was present in the
 * raw input, so the route layer can apply the default date window on first load
 * only when this is false.
 */
export type ExpenseListFilterResult = {
  hasFilterParams: boolean
  filters: ParsedExpenseListFilters
  fieldErrors: FieldErrors
}

/**
 * Parse and normalise the expense-list filter query string.
 *
 * - `description`: trimmed; empty/whitespace becomes "filter not applied"
 * - `from`/`to`: each independently optional; validated as `YYYY-MM-DD`
 * - `categoryId`: optional string; non-string values rejected
 * - `tagId`: repeated param collapsed into deduplicated array
 * - `tagMode`: defaults to `'or'`; only `'or'` and `'and'` accepted
 *
 * `hasFilterParams` is `true` when at least one filter key was present in
 * `raw` (even if its value is empty/invalid), so the route can distinguish a
 * fresh first load from an explicit filter submission.
 */
export const parseExpenseListFilters = (raw: RawExpenseListFilters): ExpenseListFilterResult => {
  const FILTER_KEYS: Array<keyof RawExpenseListFilters> = [
    'description',
    'from',
    'to',
    'categoryId',
    'tagId',
    'tagMode',
  ]
  const hasFilterParams = FILTER_KEYS.some((k) => raw[k] !== undefined)

  const fieldErrors: FieldErrors = {}

  const descriptionTrimmed =
    typeof raw.description === 'string' ? raw.description.trim() : undefined
  const description =
    descriptionTrimmed !== undefined && descriptionTrimmed.length > 0
      ? descriptionTrimmed
      : undefined

  let from: string | undefined
  if (typeof raw.from === 'string' && raw.from.trim().length > 0) {
    const trimmed = raw.from.trim()
    if (isValidYmd(trimmed)) {
      from = trimmed
    } else {
      fieldErrors.date = 'From date must be a valid date (YYYY-MM-DD).'
    }
  }

  let to: string | undefined
  if (typeof raw.to === 'string' && raw.to.trim().length > 0) {
    const trimmed = raw.to.trim()
    if (isValidYmd(trimmed)) {
      to = trimmed
    } else {
      fieldErrors.date = fieldErrors.date
        ? fieldErrors.date
        : 'To date must be a valid date (YYYY-MM-DD).'
    }
  }

  let categoryId: string | undefined
  if (typeof raw.categoryId === 'string' && raw.categoryId.trim().length > 0) {
    categoryId = raw.categoryId.trim()
  }

  const tagIdRaw = raw.tagId
  const rawTagIds: string[] = Array.isArray(tagIdRaw)
    ? tagIdRaw
    : typeof tagIdRaw === 'string'
      ? [tagIdRaw]
      : []
  const seenTagIds = new Set<string>()
  const tagIds: string[] = []
  for (const t of rawTagIds) {
    if (typeof t === 'string' && t.trim().length > 0 && !seenTagIds.has(t.trim())) {
      seenTagIds.add(t.trim())
      tagIds.push(t.trim())
    }
  }

  let tagMode: 'or' | 'and' = 'or'
  if (raw.tagMode === 'and') {
    tagMode = 'and'
  } else if (raw.tagMode !== undefined && raw.tagMode !== 'or' && raw.tagMode !== '') {
    fieldErrors.tags = 'Tag mode must be "or" or "and".'
  }

  return {
    hasFilterParams,
    filters: {
      description,
      from,
      to,
      categoryId,
      tagIds,
      tagMode,
    },
    fieldErrors,
  }
}

// ---------- Tag CSV (Issue 6) ----------
```

## renderFilterBar component (build-expenses.tsx)

renderFilterBar receives the full CategoryRow[] and TagRow[] lists (not the trimmed {name: string}[] payloads used by the entry form), plus the active ParsedExpenseListFilters and any fieldErrors. It renders a card with:
- description text input (data-testid='filter-description')
- from date input (data-testid='filter-from')
- to date input (data-testid='filter-to')
- category <select> with an 'All categories' option (data-testid='filter-category')
- tag section (hidden when no tags exist): checkboxes per tag (data-testid='filter-tag-{name}'), radio pair for any/all (data-testid='filter-tag-mode-or', 'filter-tag-mode-and')
- Filter submit button (data-testid='filter-submit')
- Clear filters link (data-testid='filter-clear') — rendered only when hasAnyFilter is true

The form uses method='get' so all filter values appear as query-string params on submit, making the filtered URL bookmarkable and shareable.

```bash
sed -n '59,220p' src/routes/expenses/build-expenses.tsx
```

```output
const renderFilterBar = (
  categories: CategoryRow[],
  tags: TagRow[],
  activeFilters: ParsedExpenseListFilters,
  filterErrors: FieldErrors,
) => {
  const activeCategoryId = activeFilters.categoryId ?? ''
  const activeTagMode = activeFilters.tagMode ?? 'or'
  const activeTagIds = new Set(activeFilters.tagIds ?? [])
  const hasAnyFilter =
    (activeFilters.description && activeFilters.description.length > 0) ||
    activeFilters.from ||
    activeFilters.to ||
    activeCategoryId.length > 0 ||
    activeTagIds.size > 0

  return (
    <form method='get' action={PATHS.EXPENSES} className='mb-6' data-testid='expense-filter-bar'>
      <div className='card bg-base-200 p-4'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <div className='form-control'>
            <label className='label' for='filter-description'>
              <span className='label-text'>Description</span>
            </label>
            <input
              id='filter-description'
              type='text'
              name='description'
              className='input input-bordered'
              placeholder='Search...'
              value={activeFilters.description ?? ''}
              data-testid='filter-description'
            />
          </div>

          <div className='form-control'>
            <label className='label' for='filter-from'>
              <span className='label-text'>From</span>
            </label>
            <input
              id='filter-from'
              type='date'
              name='from'
              className={`input input-bordered${filterErrors.date ? ' input-error' : ''}`}
              value={activeFilters.from ?? ''}
              data-testid='filter-from'
            />
          </div>

          <div className='form-control'>
            <label className='label' for='filter-to'>
              <span className='label-text'>To</span>
            </label>
            <input
              id='filter-to'
              type='date'
              name='to'
              className={`input input-bordered${filterErrors.date ? ' input-error' : ''}`}
              value={activeFilters.to ?? ''}
              data-testid='filter-to'
            />
            {filterErrors.date && (
              <label className='label'>
                <span className='label-text-alt text-error' data-testid='filter-date-error'>
                  {filterErrors.date}
                </span>
              </label>
            )}
          </div>

          <div className='form-control'>
            <label className='label' for='filter-category'>
              <span className='label-text'>Category</span>
            </label>
            <select
              id='filter-category'
              name='categoryId'
              className='select select-bordered'
              data-testid='filter-category'
            >
              <option value=''>All categories</option>
              {categories.map((cat) => (
                <option value={cat.id} selected={cat.id === activeCategoryId}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {tags.length > 0 && (
          <div className='mt-4'>
            <div className='label'>
              <span className='label-text font-semibold'>Tags</span>
              <span className='label-text-alt'>
                <label className='label cursor-pointer gap-2'>
                  <span>Any</span>
                  <input
                    type='radio'
                    name='tagMode'
                    value='or'
                    className='radio radio-sm'
                    checked={activeTagMode === 'or'}
                    data-testid='filter-tag-mode-or'
                  />
                  <input
                    type='radio'
                    name='tagMode'
                    value='and'
                    className='radio radio-sm'
                    checked={activeTagMode === 'and'}
                    data-testid='filter-tag-mode-and'
                  />
                  <span>All</span>
                </label>
              </span>
            </div>
            <div className='flex flex-wrap gap-2' data-testid='filter-tags'>
              {tags.map((t) => (
                <label className='label cursor-pointer gap-1'>
                  <input
                    type='checkbox'
                    name='tagId'
                    value={t.id}
                    className='checkbox checkbox-sm'
                    checked={activeTagIds.has(t.id)}
                    data-testid={`filter-tag-${t.name}`}
                  />
                  <span className='label-text'>{t.name}</span>
                </label>
              ))}
            </div>
            {filterErrors.tags && (
              <p className='text-error text-sm mt-1' data-testid='filter-tags-error'>
                {filterErrors.tags}
              </p>
            )}
          </div>
        )}

        <div className='mt-4 flex gap-2'>
          <button
            type='submit'
            className='btn btn-primary btn-sm'
            data-testid='filter-submit'
          >
            Filter
          </button>
          {hasAnyFilter && (
            <a
              href={PATHS.EXPENSES}
              className='btn btn-ghost btn-sm'
              data-testid='filter-clear'
            >
              Clear filters
            </a>
          )}
        </div>
      </div>
    </form>
  )
}
```

## GET /expenses handler — first-load vs filtered (build-expenses.tsx)

The handler reads query params via c.req.query() and c.req.queries('tagId') (for multi-value checkbox submission), then calls parseExpenseListFilters. The hasFilterParams flag decides what filters to apply:

- hasFilterParams=false (first load, no query string): activeFilters = defaultRangeEt() + {tagIds:[], tagMode:'or'} — the original 2-month window.
- hasFilterParams=true (explicit filter submission): activeFilters = the parsed filters object — which may have empty tagIds, undefined dates, etc.

This separation is crucial: without it a user clicking 'Filter' with an empty form would lose the 2-month window and see everything.

```bash
sed -n '307,390p' src/routes/expenses/build-expenses.tsx
```

```output
export const buildExpenses = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.EXPENSES,
    secureHeaders(ALLOW_SCRIPTS_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const db = createDbClient(c.env.PROJECT_DB)

      const rawQ = c.req.query()
      const rawTagId = c.req.queries('tagId')
      const rawFilters = {
        description: rawQ['description'],
        from: rawQ['from'],
        to: rawQ['to'],
        categoryId: rawQ['categoryId'],
        tagId: rawTagId !== undefined && rawTagId.length > 0 ? rawTagId : rawQ['tagId'],
        tagMode: rawQ['tagMode'],
      }
      const { hasFilterParams, filters, fieldErrors: filterErrors } = parseExpenseListFilters(rawFilters)

      const activeFilters = hasFilterParams
        ? filters
        : { ...defaultRangeEt(), tagIds: [], tagMode: 'or' as const }

      const expensesResult = await listExpenses(db, activeFilters)
      if (expensesResult.isErr) {
        return redirectWithError(
          c,
          PATHS.AUTH.SIGN_IN,
          'Failed to load expenses. Please try again.',
        )
      }
      const categoriesResult = await listCategories(db)
      if (categoriesResult.isErr) {
        return redirectWithError(
          c,
          PATHS.AUTH.SIGN_IN,
          'Failed to load expenses. Please try again.',
        )
      }
      const tagsResult = await listTags(db)
      if (tagsResult.isErr) {
        return redirectWithError(
          c,
          PATHS.AUTH.SIGN_IN,
          'Failed to load expenses. Please try again.',
        )
      }
      const payloads: ExpenseFormPayloads = {
        categories: categoriesResult.value.map((row) => ({ name: row.name })),
        tags: tagsResult.value.map((row) => ({ name: row.name })),
      }
      const today = todayEt()
      const flash = readAndClearFormState(c)
      const state: ExpenseFormState = flash
        ? {
            fieldErrors: flash.fieldErrors ?? {},
            values: {
              description: flash.values.description ?? '',
              amount: flash.values.amount ?? '',
              date: flash.values.date ?? today,
              category: flash.values.category ?? '',
              tags: flash.values.tags ?? '',
            },
          }
        : emptyState(today)
      return c.render(
        useLayout(
          c,
          renderExpenses(
            expensesResult.value,
            state,
            payloads,
            categoriesResult.value,
            tagsResult.value,
            activeFilters,
            filterErrors,
          ),
        ),
      )
    },
  )

  app.post(
```

## Unit tests

Two test suites were extended: expense-access.spec.ts (14 new cases in 'listExpenses filters') and expense-validators.spec.ts (19 new cases in 'parseExpenseListFilters'). Both run in bun's in-memory SQLite harness.

```bash
bun test tests/expense-access.spec.ts tests/expense-validators.spec.ts 2>&1 | grep -E '(pass|fail|Issue 11|Ran )' | tail -30
```

```output
(pass) category repository helpers > renameCategory updates the category name and timestamp [3.00ms]
(pass) category repository helpers > renameCategory detects case-insensitive collisions before merge [1000.00ms]
(pass) category repository helpers > mergeCategory repoints source expenses and removes the source category [3.00ms]
(pass) category repository helpers > deleteCategory fails with the exact referencing expense count when referenced [983.00ms]
(pass) category repository helpers > deleteCategory succeeds for an unreferenced category [1.00ms]
(pass) category repository helpers > deleteCategory blocks categories referenced by recurring templates [905.00ms]
(pass) tag repository helpers > createTag stores lowercase names and rejects case-insensitive duplicates [1005.00ms]
(pass) tag repository helpers > renameTag updates the tag name and timestamp [2.00ms]
(pass) tag repository helpers > renameTag detects case-insensitive collision before merge [1004.00ms]
(pass) tag repository helpers > mergeTag repoints all expenseTag rows from source to target and removes source tag [3.00ms]
(pass) tag repository helpers > mergeTag deduplicates expenseTag rows when an expense already has both source and target [2.00ms]
(pass) tag repository helpers > deleteTag fails with the exact referencing expense count when referenced [870.00ms]
(pass) tag repository helpers > deleteTag succeeds for an unreferenced tag [1.00ms]
(pass) listExpenses filters (Issue 11) > returns all expenses when no filters are set [2.00ms]
(pass) listExpenses filters (Issue 11) > filters by from date (open-to) [1.00ms]
(pass) listExpenses filters (Issue 11) > filters by to date (open-from) [1.00ms]
(pass) listExpenses filters (Issue 11) > filters by both from and to dates [1.00ms]
(pass) listExpenses filters (Issue 11) > returns all when both from and to are absent [1.00ms]
(pass) listExpenses filters (Issue 11) > filters description case-insensitively (substring match) [1.00ms]
(pass) listExpenses filters (Issue 11) > treats empty/whitespace-only description as no filter [1.00ms]
(pass) listExpenses filters (Issue 11) > filters by categoryId [2.00ms]
(pass) listExpenses filters (Issue 11) > tagMode or returns expenses with any of the listed tags [2.00ms]
(pass) listExpenses filters (Issue 11) > tagMode and returns only expenses with all listed tags [1.00ms]
(pass) listExpenses filters (Issue 11) > tagMode and is meaningfully different from or [2.00ms]
(pass) listExpenses filters (Issue 11) > combines filters with AND across fields [2.00ms]
(pass) listExpenses filters (Issue 11) > result ordering is date desc then case-insensitive description asc [1.00ms]
(pass) listExpenses filters (Issue 11) > tag names are returned alphabetically sorted per row [1.00ms]
 109 pass
 0 fail
Ran 109 tests across 2 files. [6.87s]
```

## E2E specs

Three new Playwright spec files cover all user-facing filter flows:
- 14-filter-description-dates.spec.ts (8 tests): filter bar rendering, first-load default window, description substring/case-insensitive, from-only, to-only, both dates, no-dates submit, sticky values after submit.
- 15-filter-category-tags.spec.ts (7 tests): category dropdown narrows results, all-categories returns all, tag checkboxes visible, tag OR, tag AND, single-tag OR, tag selection persists.
- 16-filter-combined-clear.spec.ts (7 tests): combined description+from+category, Clear absent on first load, Clear appears after filter, Clear resets to unfiltered, no-match empty state, Clear after no-match restores results, description+tag OR is AND between fields.

```bash
cat e2e-tests/expenses/14-filter-description-dates.spec.ts
```

```output
import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedExpenses } from '../support/db-helpers'

/**
 * Returns the current date in `America/New_York` as `YYYY-MM-DD`.
 * Matches the behaviour of `src/lib/et-date.ts` `todayEt`.
 */
const todayEt = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

/** Offset the given `YYYY-MM-DD` by a number of months. */
const ymdMonthsAgo = (today: string, months: number, day: number): string => {
  const [yStr, mStr] = today.split('-')
  const year = parseInt(yStr, 10)
  const month = parseInt(mStr, 10)
  let newMonth = month - months
  let newYear = year
  while (newMonth < 1) {
    newMonth += 12
    newYear -= 1
  }
  return `${newYear.toString().padStart(4, '0')}-${newMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

const signInAndGoToExpenses = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
  await page.goto(BASE_URLS.EXPENSES)
}

test.describe('Expense filter bar — description and date-range', () => {
  test(
    'filter bar is rendered on the expenses page',
    testWithDatabase(async ({ page }) => {
      await signInAndGoToExpenses(page)
      await expect(page.getByTestId('expense-filter-bar')).toBeVisible()
      await expect(page.getByTestId('filter-description')).toBeVisible()
      await expect(page.getByTestId('filter-from')).toBeVisible()
      await expect(page.getByTestId('filter-to')).toBeVisible()
      await expect(page.getByTestId('filter-submit')).toBeVisible()
    }),
  )

  test(
    'first load shows default 2-month window (no filter params)',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      const outsideWindow = ymdMonthsAgo(today, 4, 1)
      const insideWindow = ymdMonthsAgo(today, 1, 15)

      await seedExpenses([
        {
          date: insideWindow,
          description: 'Inside window expense',
          amountCents: 100,
          categoryName: 'Food',
        },
        {
          date: outsideWindow,
          description: 'Outside window expense',
          amountCents: 200,
          categoryName: 'Food',
        },
      ])

      await signInAndGoToExpenses(page)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).toContain('Inside window expense')
      expect(descriptions).not.toContain('Outside window expense')
    }),
  )

  test(
    'description filter: substring, case-insensitive',
    testWithDatabase(async ({ page }) => {
      const today = todayEt()
      await seedExpenses([
        {
          date: today,
          description: 'Grocery Store',
          amountCents: 100,
          categoryName: 'Food',
        },
        {
          date: today,
          description: 'GROCERY ONLINE',
          amountCents: 200,
          categoryName: 'Food',
        },
        {
          date: today,
          description: 'Gas Station',
          amountCents: 300,
          categoryName: 'Transport',
        },
      ])

      await signInAndGoToExpenses(page)

      await page.getByTestId('filter-description').fill('grocery')
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).toContain('Grocery Store')
      expect(descriptions).toContain('GROCERY ONLINE')
      expect(descriptions).not.toContain('Gas Station')
    }),
  )

  test(
    'from date filter excludes earlier expenses',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2024-03-15',
          description: 'March expense',
          amountCents: 100,
          categoryName: 'Food',
        },
        {
          date: '2024-01-10',
          description: 'January expense',
          amountCents: 200,
          categoryName: 'Food',
        },
      ])

      await signInAndGoToExpenses(page)

      await page.getByTestId('filter-from').fill('2024-03-01')
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).toContain('March expense')
      expect(descriptions).not.toContain('January expense')
    }),
  )

  test(
    'to date filter excludes later expenses',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2024-03-15',
          description: 'March expense',
          amountCents: 100,
          categoryName: 'Food',
        },
        {
          date: '2024-01-10',
          description: 'January expense',
          amountCents: 200,
          categoryName: 'Food',
        },
      ])

      await signInAndGoToExpenses(page)

      await page.getByTestId('filter-to').fill('2024-02-01')
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).not.toContain('March expense')
      expect(descriptions).toContain('January expense')
    }),
  )

  test(
    'open-from: only from set shows all expenses from that date onward',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2020-01-01',
          description: 'Old expense',
          amountCents: 100,
          categoryName: 'Food',
        },
        {
          date: '2025-12-31',
          description: 'Future expense',
          amountCents: 200,
          categoryName: 'Food',
        },
      ])

      await signInAndGoToExpenses(page)

      await page.getByTestId('filter-from').fill('2024-01-01')
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).not.toContain('Old expense')
      expect(descriptions).toContain('Future expense')
    }),
  )

  test(
    'open-to: only to set shows all expenses up to that date',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2020-01-01',
          description: 'Old expense',
          amountCents: 100,
          categoryName: 'Food',
        },
        {
          date: '2025-12-31',
          description: 'Future expense',
          amountCents: 200,
          categoryName: 'Food',
        },
      ])

      await signInAndGoToExpenses(page)

      await page.getByTestId('filter-to').fill('2024-01-01')
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).toContain('Old expense')
      expect(descriptions).not.toContain('Future expense')
    }),
  )

  test(
    'no-filters submit (both from and to empty) returns all expenses',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: '2020-01-01',
          description: 'Old expense',
          amountCents: 100,
          categoryName: 'Food',
        },
        {
          date: '2025-12-31',
          description: 'Future expense',
          amountCents: 200,
          categoryName: 'Food',
        },
      ])

      await signInAndGoToExpenses(page)

      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      const descriptions = await page.getByTestId('expense-row-description').allTextContents()
      expect(descriptions).toContain('Old expense')
      expect(descriptions).toContain('Future expense')
    }),
  )

  test(
    'filter values are reflected in the form inputs after submit',
    testWithDatabase(async ({ page }) => {
      await signInAndGoToExpenses(page)

      await page.getByTestId('filter-description').fill('Lunch')
      await page.getByTestId('filter-from').fill('2024-01-01')
      await page.getByTestId('filter-to').fill('2024-12-31')
      await page.getByTestId('filter-submit').click()
      await page.waitForURL(/\/expenses/)

      await expect(page.getByTestId('filter-description')).toHaveValue('Lunch')
      await expect(page.getByTestId('filter-from')).toHaveValue('2024-01-01')
      await expect(page.getByTestId('filter-to')).toHaveValue('2024-12-31')
    }),
  )
})
```

## TypeScript verification

npx tsc --noEmit reports only the pre-existing bun:test ambient type issues. No new errors were introduced by Issue 11.

```bash
npx tsc --noEmit 2>&1 | head -12 || true
```

```output
tests/db-access-retry.spec.ts(6,30): error TS2307: Cannot find module 'bun:test' or its corresponding type declarations.
tests/expense-access.spec.ts(21,30): error TS2307: Cannot find module 'bun:test' or its corresponding type declarations.
tests/expense-validators.spec.ts(6,30): error TS2307: Cannot find module 'bun:test' or its corresponding type declarations.
tests/send-email.spec.ts(6,30): error TS2307: Cannot find module 'bun:test' or its corresponding type declarations.
tests/send-email.spec.ts(38,48): error TS2345: Argument of type '{ SMTP_SERVER_PORT: string; SMTP_SERVER_HOST: string; SMTP_SERVER_USER: string; SMTP_SERVER_PASSWORD: string; }' is not assignable to parameter of type 'Bindings'.
  Type '{ SMTP_SERVER_PORT: string; SMTP_SERVER_HOST: string; SMTP_SERVER_USER: string; SMTP_SERVER_PASSWORD: string; }' is missing the following properties from type 'Bindings': PROJECT_DB, Session
tests/send-email.spec.ts(78,48): error TS2345: Argument of type '{ SMTP_SERVER_PORT: string; SMTP_SERVER_HOST: string; SMTP_SERVER_USER: string; SMTP_SERVER_PASSWORD: string; }' is not assignable to parameter of type 'Bindings'.
  Type '{ SMTP_SERVER_PORT: string; SMTP_SERVER_HOST: string; SMTP_SERVER_USER: string; SMTP_SERVER_PASSWORD: string; }' is missing the following properties from type 'Bindings': PROJECT_DB, Session
tests/sign-up-utils.spec.ts(6,30): error TS2307: Cannot find module 'bun:test' or its corresponding type declarations.
tests/time-access.spec.ts(6,42): error TS2307: Cannot find module 'bun:test' or its corresponding type declarations.
```
