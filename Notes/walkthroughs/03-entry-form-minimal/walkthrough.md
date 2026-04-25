# Issue 03 — Entry Form (Existing Categories Only, No Tags)

*2026-04-25T19:51:43Z by Showboat 0.6.1*
<!-- showboat-id: a0c064bd-d326-4c98-b2f1-f94277b1b944 -->

This walkthrough demonstrates Issue 03: adding the expense entry form at the top of /expenses. New `parseAmount` helper in `money`, `listCategories` and `createExpense` in `db/expense-access`, a `/test/database/seed-categories` route plus matching `seedCategories` e2e helper, the entry form + POST handler in `build-expenses.tsx`, and a Playwright spec covering every amount variant from the issue.

## 1. `money.parseAmount` — lenient positive-decimal parser

Two regexes do the heavy lifting: `/^\d*\.?\d+$/` for the no-comma case and `/^[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/` for US-style thousands grouping. Comma placement is validated *before* commas are stripped, so `1,23.45` and `12,3456` are rejected. After regex match, the fractional part length is checked separately to enforce ≤ 2 decimals, then `parseInt` produces integer cents. Returns `Result.ok(cents)` or `Result.err(message)` — never throws.

```bash
sed -n '34,84p' src/lib/money.ts
```

```output

// Matches a positive decimal with optional US-style thousands grouping. Either:
//   - No commas: digits with optional fractional part (e.g. `1234`, `.50`, `12.34`)
//   - With commas: leading 1-3 digit group, then `,ddd` groups, optional fractional part
const NO_COMMA_RE = /^\d*\.?\d+$/
const WITH_COMMA_RE = /^[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/

/**
 * Parse a user-entered positive money amount into integer cents.
 *
 * Accepts forms like `1234.56`, `1,234.56`, `1234`, `.50`, with surrounding
 * whitespace tolerated. Rejects empty input, zero, negatives, more than two
 * fractional digits, malformed comma placement, and non-numeric input.
 *
 * @param input - Raw user-entered amount
 * @returns `Result.ok(cents)` on success, `Result.err(message)` on failure
 */
export const parseAmount = (input: string): Result<number, string> => {
  if (typeof input !== 'string') {
    return Result.err('Amount must be a string')
  }
  const trimmed = input.trim()
  if (trimmed === '') {
    return Result.err('Amount is required')
  }
  if (trimmed.startsWith('-')) {
    return Result.err('Amount must be positive')
  }
  const hasComma = trimmed.includes(',')
  const matches = hasComma ? WITH_COMMA_RE.test(trimmed) : NO_COMMA_RE.test(trimmed)
  if (!matches) {
    return Result.err('Amount is not a valid number')
  }
  const stripped = hasComma ? trimmed.replace(/,/g, '') : trimmed
  const dotIdx = stripped.indexOf('.')
  const wholePart = dotIdx === -1 ? stripped : stripped.slice(0, dotIdx)
  const fracPart = dotIdx === -1 ? '' : stripped.slice(dotIdx + 1)
  if (fracPart.length > 2) {
    return Result.err('Amount may have at most two decimal places')
  }
  const wholeDigits = wholePart === '' ? '0' : wholePart
  const fracDigits = fracPart.padEnd(2, '0')
  const cents = parseInt(wholeDigits, 10) * 100 + parseInt(fracDigits || '0', 10)
  if (!Number.isFinite(cents)) {
    return Result.err('Amount is not a valid number')
  }
  if (cents <= 0) {
    return Result.err('Amount must be greater than zero')
  }
  return Result.ok(cents)
}
```

Unit coverage exercises every requirement from the issue:

```bash
bun test tests/money.spec.ts 2>&1 | tail -25
```

```output
tests/money.spec.ts:
(pass) formatCents > formats 0 as 0.00 [1.00ms]
(pass) formatCents > formats 1 as 0.01
(pass) formatCents > formats 99 as 0.99
(pass) formatCents > formats 100 as 1.00
(pass) formatCents > formats 12345 as 123.45
(pass) formatCents > formats 123456 as 1,234.56 [1.00ms]
(pass) formatCents > formats 100000000 as 1,000,000.00
(pass) parseAmount > parses 1234.56 as 123456 cents
(pass) parseAmount > parses 1,234.56 as 123456 cents
(pass) parseAmount > parses 1234 as 123400 cents
(pass) parseAmount > parses .50 as 50 cents
(pass) parseAmount > parses 0.5 as 50 cents (one decimal place is fine)
(pass) parseAmount > tolerates leading and trailing whitespace
(pass) parseAmount > parses 1,000,000.00 as 100000000 cents
(pass) parseAmount > rejects malformed comma placement [1.00ms]
(pass) parseAmount > rejects zero
(pass) parseAmount > rejects negatives
(pass) parseAmount > rejects more than two decimal places
(pass) parseAmount > rejects non-numeric input
(pass) parseAmount > rejects empty string

 20 pass
 0 fail
Ran 20 tests across 1 file. [94.00ms]
```

## 2. `db/expense-access` — `listCategories` and `createExpense`

Both new functions follow the same `withRetry` + `Result` pattern `listExpenses` already established. `listCategories` orders rows by `lower(name) asc` to match the case-insensitive tiebreak the rest of the app uses. `createExpense` first verifies the `categoryId` exists, then inserts a UUID-keyed row; tag handling stays out of this slice.

```bash
sed -n '30,107p' src/lib/db/expense-access.ts
```

```output
export interface CategoryRow {
  id: string
  name: string
}

export interface CreateExpenseInput {
  date: string
  description: string
  categoryId: string
  amountCents: number
}

/**
 * List all categories sorted by case-insensitive `name ASC`.
 * @param db - Database instance
 * @returns Promise<Result<CategoryRow[], Error>>
 */
export const listCategories = (db: DrizzleClient): Promise<Result<CategoryRow[], Error>> =>
  withRetry('listCategories', () => listCategoriesActual(db))

const listCategoriesActual = async (
  db: DrizzleClient,
): Promise<Result<CategoryRow[], Error>> => {
  try {
    const rows = await db
      .select({ id: category.id, name: category.name })
      .from(category)
      .orderBy(asc(sql`lower(${category.name})`))
    return Result.ok(rows)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

/**
 * Create a new expense row after verifying its `categoryId` exists.
 *
 * Inputs are assumed already validated (date as `YYYY-MM-DD`, non-empty
 * description, positive integer cents). No tag handling in this slice.
 * @param db - Database instance
 * @param input - New-expense fields
 * @returns Promise<Result<{ id: string }, Error>> — the new expense id on success
 */
export const createExpense = (
  db: DrizzleClient,
  input: CreateExpenseInput,
): Promise<Result<{ id: string }, Error>> =>
  withRetry('createExpense', () => createExpenseActual(db, input))

const createExpenseActual = async (
  db: DrizzleClient,
  input: CreateExpenseInput,
): Promise<Result<{ id: string }, Error>> => {
  try {
    const found = await db
      .select({ id: category.id })
      .from(category)
      .where(eq(category.id, input.categoryId))
    if (found.length === 0) {
      return Result.err(new Error(`Category not found: ${input.categoryId}`))
    }

    const id = crypto.randomUUID()
    const now = new Date()
    await db.insert(expense).values({
      id,
      description: input.description,
      amountCents: input.amountCents,
      categoryId: input.categoryId,
      date: input.date,
      createdAt: now,
      updatedAt: now,
    })
    return Result.ok({ id })
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}
```

## 3. Test-only seed-categories route + e2e helper

`POST /test/database/seed-categories` accepts `[{ name }]` and de-dups case-insensitively against existing rows. The companion `seedCategories(rows)` helper in `e2e-tests/support/db-helpers.ts` matches the existing `seedExpenses` style. Both are gated by the same `PRODUCTION:REMOVE` convention as the other test routes.

```bash
sed -n '404,460p' src/routes/test/database.ts
```

```output
/**
 * Seed the database with categories for testing the entry form
 * POST /test/database/seed-categories
 */
// PRODUCTION:REMOVE
interface SeedCategoryInput {
  name: string
}

testDatabaseRouter.post('/seed-categories', secureHeaders(STANDARD_SECURE_HEADERS), async (c) => {
  try {
    const db = createDbClient(c.env.PROJECT_DB)

    const body = (await c.req.json()) as SeedCategoryInput[]
    if (!Array.isArray(body)) {
      return c.json({ success: false, error: 'Body must be a JSON array' }, 400)
    }

    const now = new Date()
    const existing = await runDb(() => db.select().from(category))
    const existingByLower = new Map<string, string>()
    for (const row of existing) {
      existingByLower.set(row.name.toLowerCase(), row.id)
    }

    let created = 0
    for (const row of body) {
      if (typeof row.name !== 'string' || row.name.trim() === '') {
        continue
      }
      const key = row.name.toLowerCase()
      if (existingByLower.has(key)) {
        continue
      }
      const id = crypto.randomUUID()
      await runDb(() =>
        db.insert(category).values({ id, name: row.name, createdAt: now, updatedAt: now }),
      )
      existingByLower.set(key, id)
      created += 1
    }

    return c.json({ success: true, created })
  } catch (error) {
    console.error('Failed to seed categories:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to seed categories',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

export { testDatabaseRouter }
```

## 4. Entry form + POST handler in `build-expenses.tsx`

GET runs `listExpenses` and `listCategories` in parallel, renders the entry form (always — even on the empty state) above the list, and uses `todayEt()` for the date input default. POST parses the form, validates via a local `validateExpenseForm` helper that composes `parseAmount`, `isValidYmd`, and a description length check, then PRGs through `redirectWithError` / `redirectWithMessage`. The flash message renders through the existing `useLayout` banner.

```bash
sed -n '161,259p' src/routes/expenses/build-expenses.tsx
```

```output
interface ValidatedExpenseInput {
  date: string
  description: string
  categoryId: string
  amountCents: number
}

const validateExpenseForm = (
  raw: Record<string, string>,
): { ok: true; value: ValidatedExpenseInput } | { ok: false; error: string } => {
  const description = (raw.description ?? '').trim()
  if (description === '') {
    return { ok: false, error: 'Description is required.' }
  }
  if (description.length > descriptionMax) {
    return { ok: false, error: `Description must be at most ${descriptionMax} characters.` }
  }

  const date = (raw.date ?? '').trim()
  if (!isValidYmd(date)) {
    return { ok: false, error: 'Date must be a valid YYYY-MM-DD value.' }
  }

  const categoryId = (raw.categoryId ?? '').trim()
  if (categoryId === '') {
    return { ok: false, error: 'Category is required.' }
  }

  const amountResult = parseAmount(raw.amount ?? '')
  if (amountResult.isErr) {
    return { ok: false, error: amountResult.error }
  }

  return {
    ok: true,
    value: { date, description, categoryId, amountCents: amountResult.value },
  }
}

export const buildExpenses = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.EXPENSES,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const range = defaultRangeEt()
      const db = createDbClient(c.env.PROJECT_DB)
      const [expensesResult, categoriesResult] = await Promise.all([
        listExpenses(db, range),
        listCategories(db),
      ])
      if (expensesResult.isErr || categoriesResult.isErr) {
        return redirectWithError(
          c,
          PATHS.AUTH.SIGN_IN,
          'Failed to load expenses. Please try again.',
        )
      }
      return c.render(
        useLayout(
          c,
          renderExpenses(expensesResult.value, categoriesResult.value, todayEt()),
        ),
      )
    },
  )

  app.post(
    PATHS.EXPENSES,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const form = await c.req.parseBody()
      const raw: Record<string, string> = {
        description: typeof form.description === 'string' ? form.description : '',
        amount: typeof form.amount === 'string' ? form.amount : '',
        date: typeof form.date === 'string' ? form.date : '',
        categoryId: typeof form.categoryId === 'string' ? form.categoryId : '',
      }

      const validated = validateExpenseForm(raw)
      if (!validated.ok) {
        return redirectWithError(c, PATHS.EXPENSES, validated.error)
      }

      const db = createDbClient(c.env.PROJECT_DB)
      const createResult = await createExpense(db, validated.value)
      if (createResult.isErr) {
        return redirectWithError(
          c,
          PATHS.EXPENSES,
          'Failed to save expense. Please try again.',
        )
      }

      return redirectWithMessage(c, PATHS.EXPENSES, 'Expense added.')
    },
  )
}
```

## 5. Playwright e2e — every amount variant from the issue

The new `02-entry-form.spec.ts` signs in, seeds a `Food` category, and walks the entry form through three scenarios: form-render defaults (today defaulted in ET, category select populated), every amount variant from the issue (`1234.56`, `1,234.56`, `1234`, `.50`) with reverse-alpha descriptions so each new row sorts to the top of the case-insensitive description tiebreak, and server-side rejection of `0` and `abc`.

```bash
npx playwright test e2e-tests/expenses/02-entry-form.spec.ts 2>&1 | tail -10
```

```output
Database cleared successfully
  ✓  2 e2e-tests/expenses/02-entry-form.spec.ts:59:3 › Expense entry form › accepts each amount variant, posts, redirects, and renders formatted rows (2.7s)
Database cleared successfully
Database seeded successfully: 2 users, 2 accounts, 5 codes
Database sessions cleared successfully
Categories seeded successfully: 1 created
Database cleared successfully
  ✓  3 e2e-tests/expenses/02-entry-form.spec.ts:99:3 › Expense entry form › rejects zero and non-numeric amounts with no new row created (2.2s)

  3 passed (8.9s)
```

## 6. Acceptance criteria from the issue

- ✅ Date input is pre-populated with today (ET) and the category select lists existing categories — covered by the first e2e.\n- ✅ Valid submission creates the row, redirects back to /expenses, and the form is cleared on the next render — covered by the second e2e.\n- ✅ Amount input `1,234.56` stores 123456 cents — `parseAmount` unit test plus the second e2e (`1,234.56` row renders as `1,234.56`).\n- ✅ Amount inputs `0`, `-1`, `1.234`, `abc` are rejected — `parseAmount` unit tests cover all four; the third e2e exercises the full server-side rejection path for `0` and `abc`.
