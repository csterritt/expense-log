# Issue 09 Category Management Page Code Walkthrough

*2026-05-04T14:26:13Z by Showboat 0.6.1*
<!-- showboat-id: edee3c1f-8810-413c-b471-dcfd46477ca5 -->

This walkthrough documents the Issue 09 category management implementation. It covers the database schema and migration, HTTP-agnostic validators, repository helpers, `/categories` route, unit tests, Playwright tests, and wiki updates.

```bash
git diff --name-only -- src/db/schema.ts drizzle/0003_misty_prodigy.sql src/lib/expense-validators.ts src/lib/db/expense-access.ts src/lib/form-state.ts src/routes/build-categories.tsx tests/expense-validators.spec.ts tests/expense-access.spec.ts e2e-tests/expenses/12-category-management.spec.ts Notes/wiki | sort
```

```output
Notes/wiki/e2e-tests.md
Notes/wiki/index.md
Notes/wiki/log.md
Notes/wiki/source-code.md
Notes/wiki/src/db/schema.md
Notes/wiki/src/lib/db/expense-access.md
Notes/wiki/src/lib/expense-validators.md
Notes/wiki/src/lib/form-state.md
Notes/wiki/src/routes/build-categories.md
Notes/wiki/tests/expense-validators.spec.md
Notes/wiki/unit-tests.md
src/db/schema.ts
src/lib/db/expense-access.ts
src/lib/expense-validators.ts
src/lib/form-state.ts
src/routes/build-categories.tsx
tests/expense-access.spec.ts
tests/expense-validators.spec.ts
```

## Schema and migration

Issue 09 starts by enforcing case-insensitive uniqueness for category names at the database layer. The schema defines a unique index over `lower(category.name)`, and the generated migration replaces the old case-sensitive category-name unique index with the new lowercase-normalized index.

```bash
sed -n '80,105p' src/db/schema.ts && printf '\n--- migration ---\n' && sed -n '1,80p' drizzle/0003_misty_prodigy.sql
```

```output
  email: text('email'),
})

export const interestedEmail = sqliteTable('interestedEmail', {
  email: text('email').primaryKey().unique(),
})

/**
 * Category table schema definition
 */
export const category = sqliteTable(
  'category',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
  },
  (table) => [uniqueIndex('category_name_lower_unique').on(sql`lower(${table.name})`)],
)

/**
 * Tag table schema definition
 */
export const tag = sqliteTable('tag', {
  id: text('id').primaryKey(),

--- migration ---
DROP INDEX `category_name_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `category_name_lower_unique` ON `category` (lower("name"));
```

## Validators

The category-management validators are HTTP-agnostic. They trim input, enforce required IDs and maximum category-name length, normalize category names to lowercase for management operations, and return field-level errors compatible with the existing form-state cookie flow.

```bash
sed -n '250,380p' src/lib/expense-validators.ts
```

```output
    return Result.err(errors)
  }

  return Result.ok({ description, amountCents, date, category })
}

// ---------- New-category name (Issue 5) ----------

/**
 * Valibot schema for a new (typed-by-the-user) category name. Trimmed input
 * must be non-empty and `<= categoryNameMax` characters.
 */
export const NewCategoryNameSchema = pipe(
  string('Category name is required.'),
  custom<string>((v) => typeof v === 'string' && v.trim().length > 0, 'Category name is required.'),
  custom<string>(
    (v) => typeof v === 'string' && v.trim().length <= categoryNameMax,
    `Category name must be at most ${categoryNameMax} characters.`,
  ),
)

/**
 * Validate a typed new-category name. On success returns the trimmed input
 * (case-preserving — final lowercasing is performed by the DB helper before
 * insert). On failure returns a single user-facing error string suitable to
 * place under the entry-form `category` field.
 */
export const parseNewCategoryName = (input: string): Result<string, string> => {
  const value = typeof input === 'string' ? input.trim() : ''
  const message = firstIssueMessage(NewCategoryNameSchema, value)
  if (message) {
    return Result.err(message)
  }
  return Result.ok(value)
}

export const CategoryManagementNameSchema = NewCategoryNameSchema

const parseCategoryManagementName = (input: unknown): Result<string, string> => {
  const value = typeof input === 'string' ? input.trim() : ''
  const message = firstIssueMessage(CategoryManagementNameSchema, value)
  if (message) {
    return Result.err(message)
  }
  return Result.ok(value.toLowerCase())
}

const parseRequiredId = (input: unknown, message: string): Result<string, string> => {
  const value = typeof input === 'string' ? input.trim() : ''
  if (value.length === 0) {
    return Result.err(message)
  }
  return Result.ok(value)
}

export const parseCategoryCreate = (
  raw: RawCategoryCreate,
): Result<ParsedCategoryCreate, FieldErrors> => {
  const name = parseCategoryManagementName(raw.name)
  if (name.isErr) {
    return Result.err({ name: name.error })
  }
  return Result.ok({ name: name.value })
}

export const parseCategoryRename = (
  raw: RawCategoryRename,
): Result<ParsedCategoryRename, FieldErrors> => {
  const errors: FieldErrors = {}
  const id = parseRequiredId(raw.id, 'Category is required.')
  if (id.isErr) {
    errors.id = id.error
  }
  const name = parseCategoryManagementName(raw.name)
  if (name.isErr) {
    errors.name = name.error
  }
  if (Object.keys(errors).length > 0) {
    return Result.err(errors)
  }
  if (id.isErr || name.isErr) {
    return Result.err(errors)
  }
  return Result.ok({ id: id.value, name: name.value })
}

export const parseCategoryMergeConfirm = (
  raw: RawCategoryMergeConfirm,
): Result<ParsedCategoryMergeConfirm, FieldErrors> => {
  const errors: FieldErrors = {}
  const sourceId = parseRequiredId(raw.sourceId, 'Source category is required.')
  if (sourceId.isErr) {
    errors.sourceId = sourceId.error
  }
  const targetId = parseRequiredId(raw.targetId, 'Target category is required.')
  if (targetId.isErr) {
    errors.targetId = targetId.error
  }
  if (sourceId.isOk && targetId.isOk && sourceId.value === targetId.value) {
    errors.targetId = 'Choose two different categories.'
  }
  if (Object.keys(errors).length > 0) {
    return Result.err(errors)
  }
  if (sourceId.isErr || targetId.isErr) {
    return Result.err(errors)
  }
  return Result.ok({ sourceId: sourceId.value, targetId: targetId.value })
}

export const parseCategoryDelete = (
  raw: RawCategoryDelete,
): Result<ParsedCategoryDelete, FieldErrors> => {
  const id = parseRequiredId(raw.id, 'Category is required.')
  if (id.isErr) {
    return Result.err({ id: id.error })
  }
  return Result.ok({ id: id.value })
}

// ---------- Tag CSV (Issue 6) ----------

/**
 * Parse a comma-separated tag list. Splits on `,`, trims each entry, drops
 * empty-after-trim entries, lower-cases the survivors, and de-duplicates
 * silently (preserving first-appearance order). Enforces `length <=
 * tagNameMax` on every kept name. Returns the normalized list (possibly
 * empty) on success, or a single user-facing error string suitable to place
 * under the entry-form `tags` field on failure.
 */
export const parseTagCsv = (input: string): Result<string[], string> => {
```

## Repository helpers

The repository layer centralizes category mutations behind `Result` values and `withRetry`. Creation and rename normalize names, merge uses a D1 batch shape to atomically repoint references before deleting the source category, and delete blocks categories referenced by expenses or recurring templates.

```bash
sed -n '215,410p' src/lib/db/expense-access.ts
```

```output
    const trimmed = typeof name === 'string' ? name.trim() : ''
    if (trimmed.length === 0) {
      return Result.ok(null)
    }
    const rows = await db
      .select({ id: category.id, name: category.name })
      .from(category)
      .where(sql`lower(${category.name}) = lower(${trimmed})`)
      .limit(1)
    if (rows.length === 0) {
      return Result.ok(null)
    }
    return Result.ok(rows[0])
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const createCategory = (
  db: DrizzleClient,
  name: string,
): Promise<Result<CategoryRow, Error>> =>
  withRetry('createCategory', () => createCategoryActual(db, name))

const createCategoryActual = async (
  db: DrizzleClient,
  name: string,
): Promise<Result<CategoryRow, Error>> => {
  try {
    const normalizedName = name.trim().toLowerCase()
    if (normalizedName.length === 0) {
      return Result.err(new Error('Category name is required.'))
    }
    const existing = await findCategoryByNameActual(db, normalizedName)
    if (existing.isErr) {
      return Result.err(existing.error)
    }
    if (existing.value !== null) {
      return Result.err(new Error(`A category named "${normalizedName}" already exists.`))
    }
    const id = crypto.randomUUID()
    const now = new Date()
    await db.insert(category).values({ id, name: normalizedName, createdAt: now, updatedAt: now })
    return Result.ok({ id, name: normalizedName })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (/unique|constraint/i.test(message)) {
      return Result.err(
        new Error(`A category named "${name.trim().toLowerCase()}" already exists.`),
      )
    }
    return Result.err(e instanceof Error ? e : new Error(message))
  }
}

export const renameCategory = (
  db: DrizzleClient,
  input: RenameCategoryInput,
): Promise<Result<CategoryRow, Error>> =>
  withRetry('renameCategory', () => renameCategoryActual(db, input))

const renameCategoryActual = async (
  db: DrizzleClient,
  input: RenameCategoryInput,
): Promise<Result<CategoryRow, Error>> => {
  try {
    const normalizedName = input.name.trim().toLowerCase()
    if (normalizedName.length === 0) {
      return Result.err(new Error('Category name is required.'))
    }
    const rows = await db
      .select({ id: category.id, name: category.name })
      .from(category)
      .where(eq(category.id, input.id))
      .limit(1)
    if (rows.length === 0) {
      return Result.err(new Error('Category not found.'))
    }
    const duplicate = await db
      .select({ id: category.id, name: category.name })
      .from(category)
      .where(
        and(sql`lower(${category.name}) = lower(${normalizedName})`, ne(category.id, input.id)),
      )
      .limit(1)
    if (duplicate.length > 0) {
      return Result.err(new Error(`A category named "${normalizedName}" already exists.`))
    }
    const now = new Date()
    await db
      .update(category)
      .set({ name: normalizedName, updatedAt: now })
      .where(eq(category.id, input.id))
    return Result.ok({ id: input.id, name: normalizedName })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (/unique|constraint/i.test(message)) {
      return Result.err(
        new Error(`A category named "${input.name.trim().toLowerCase()}" already exists.`),
      )
    }
    return Result.err(e instanceof Error ? e : new Error(message))
  }
}

const countExpensesForCategory = async (db: DrizzleClient, categoryId: string): Promise<number> => {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(expense)
    .where(eq(expense.categoryId, categoryId))
  return Number(rows[0]?.count ?? 0)
}

export const countCategoryExpenses = (
  db: DrizzleClient,
  categoryId: string,
): Promise<Result<number, Error>> =>
  withRetry('countCategoryExpenses', () => countCategoryExpensesActual(db, categoryId))

const countCategoryExpensesActual = async (
  db: DrizzleClient,
  categoryId: string,
): Promise<Result<number, Error>> => {
  try {
    return Result.ok(await countExpensesForCategory(db, categoryId))
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

const countRecurringForCategory = async (
  db: DrizzleClient,
  categoryId: string,
): Promise<number> => {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(recurring)
    .where(eq(recurring.categoryId, categoryId))
  return Number(rows[0]?.count ?? 0)
}

export const mergeCategory = (
  db: DrizzleClient,
  input: MergeCategoryInput,
): Promise<Result<{ reassignedExpenseCount: number }, Error>> =>
  withRetry('mergeCategory', () => mergeCategoryActual(db, input))

const mergeCategoryActual = async (
  db: DrizzleClient,
  input: MergeCategoryInput,
): Promise<Result<{ reassignedExpenseCount: number }, Error>> => {
  try {
    if (input.sourceId === input.targetId) {
      return Result.err(new Error('Choose two different categories.'))
    }
    const rows = await db
      .select({ id: category.id })
      .from(category)
      .where(inArray(category.id, [input.sourceId, input.targetId]))
    const ids = new Set(rows.map((row) => row.id))
    if (!ids.has(input.sourceId)) {
      return Result.err(new Error('Source category not found.'))
    }
    if (!ids.has(input.targetId)) {
      return Result.err(new Error('Target category not found.'))
    }
    const reassignedExpenseCount = await countExpensesForCategory(db, input.sourceId)
    const now = new Date()
    await db.batch([
      db
        .update(expense)
        .set({ categoryId: input.targetId, updatedAt: now })
        .where(eq(expense.categoryId, input.sourceId)),
      db
        .update(recurring)
        .set({ categoryId: input.targetId, updatedAt: now })
        .where(eq(recurring.categoryId, input.sourceId)),
      db.delete(category).where(eq(category.id, input.sourceId)),
    ] as never)
    return Result.ok({ reassignedExpenseCount })
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

export const deleteCategory = (db: DrizzleClient, id: string): Promise<Result<void, Error>> =>
  withRetry('deleteCategory', () => deleteCategoryActual(db, id))

const deleteCategoryActual = async (
  db: DrizzleClient,
  id: string,
): Promise<Result<void, Error>> => {
  try {
    const found = await db
      .select({ id: category.id })
      .from(category)
```

## Route and UI

The `/categories` route renders the management page and wires POST handlers for create, rename, merge confirmation, and delete. The implementation follows the existing redirect/form-state patterns and uses `data-testid` attributes for E2E coverage.

```bash
sed -n '45,185p' src/routes/build-categories.tsx && printf '\n--- handlers ---\n' && sed -n '250,385p' src/routes/build-categories.tsx
```

```output
type CategoryFormState = {
  fieldErrors: FieldErrors
  values: ExpenseFormValues
}

const emptyState = (): CategoryFormState => ({ fieldErrors: {}, values: {} })

const categoryRenamePath = (id: string): string => `/categories/${id}/rename`
const categoryDeletePath = (id: string): string => `/categories/${id}/delete`

const readRawBody = async (c: Context<{ Bindings: Bindings }>) => {
  const form = await c.req.parseBody()
  return {
    name: typeof form.name === 'string' ? form.name : '',
    id: typeof form.id === 'string' ? form.id : '',
    sourceId: typeof form.sourceId === 'string' ? form.sourceId : '',
    targetId: typeof form.targetId === 'string' ? form.targetId : '',
    action: typeof form.action === 'string' ? form.action : '',
  }
}

const renderFieldError = (id: string, message: string | undefined) => {
  if (!message) {
    return null
  }
  return (
    <p id={id} className='text-error text-sm mt-1' data-testid={id}>
      {message}
    </p>
  )
}

const renderCategories = (rows: CategoryRow[], state: CategoryFormState) => {
  const createName = state.values.id ? '' : (state.values.name ?? '')
  const createError = state.values.id ? undefined : state.fieldErrors.name
  return (
    <div data-testid='categories-page' className='space-y-6'>
      <div className='flex items-center justify-between gap-4'>
        <h1 className='text-2xl font-bold'>Categories</h1>
        <a href={PATHS.EXPENSES} className='btn btn-ghost' data-testid='back-to-expenses-action'>
          Back to expenses
        </a>
      </div>

      <section className='card bg-base-100 shadow'>
        <div className='card-body'>
          <h2 className='card-title'>Create category</h2>
          <form method='post' action={PATHS.CATEGORIES} className='flex flex-col gap-3' noValidate>
            <label className='flex flex-col gap-1'>
              <span className='label-text'>Name</span>
              <input
                name='name'
                type='text'
                className={`input input-bordered ${createError ? 'input-error' : ''}`}
                value={createName}
                required
                maxLength={categoryInputMax}
                aria-describedby={createError ? 'category-create-name-error' : undefined}
                data-testid='category-create-name'
              />
              {renderFieldError('category-create-name-error', createError)}
            </label>
            <div>
              <button
                type='submit'
                className='btn btn-primary'
                data-testid='create-category-action'
              >
                Create category
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className='card bg-base-100 shadow'>
        <div className='card-body'>
          <h2 className='card-title'>Manage categories</h2>
          {rows.length === 0 ? (
            <p className='text-gray-600' data-testid='categories-empty-state'>
              No categories yet
            </p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='table table-zebra w-full' data-testid='categories-table'>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Rename</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const renameError =
                      state.values.id === row.id ? state.fieldErrors.name : undefined
                    const renameValue =
                      state.values.id === row.id ? (state.values.name ?? '') : row.name
                    return (
                      <tr data-testid='category-row' data-category-id={row.id}>
                        <td data-testid='category-row-name'>{row.name}</td>
                        <td>
                          <form
                            method='post'
                            action={categoryRenamePath(row.id)}
                            className='flex flex-col gap-2 md:flex-row md:items-start'
                            noValidate
                          >
                            <label className='flex flex-col gap-1'>
                              <span className='sr-only'>Rename {row.name}</span>
                              <input
                                name='name'
                                type='text'
                                className={`input input-bordered input-sm ${
                                  renameError ? 'input-error' : ''
                                }`}
                                value={renameValue}
                                required
                                maxLength={categoryInputMax}
                                aria-describedby={
                                  renameError ? `category-${row.id}-rename-error` : undefined
                                }
                                data-testid='category-rename-name'
                              />
                              {renderFieldError(`category-${row.id}-rename-error`, renameError)}
                            </label>
                            <button
                              type='submit'
                              className='btn btn-sm'
                              data-testid='rename-category-action'
                            >
                              Rename
                            </button>
                          </form>
                        </td>
                        <td className='text-right'>
                          <form method='post' action={categoryDeletePath(row.id)} noValidate>
                            <button
                              type='submit'
                              className='btn btn-sm btn-error btn-outline'
                              data-testid='delete-category-action'

--- handlers ---
  app.get(
    PATHS.CATEGORIES,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const db = createDbClient(c.env.PROJECT_DB)
      const result = await listCategories(db)
      if (result.isErr) {
        return redirectWithError(c, PATHS.EXPENSES, 'Failed to load categories. Please try again.')
      }
      const flash = readAndClearFormState(c)
      const state: CategoryFormState = flash
        ? { fieldErrors: flash.fieldErrors ?? {}, values: flash.values ?? {} }
        : emptyState()
      return c.render(useLayout(c, renderCategories(result.value, state)))
    },
  )

  app.post(
    PATHS.CATEGORIES,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const raw = await readRawBody(c)
      const validated = parseCategoryCreate({ name: raw.name })
      if (validated.isErr) {
        return redirectWithFormErrors(c, PATHS.CATEGORIES, validated.error, { name: raw.name })
      }
      const db = createDbClient(c.env.PROJECT_DB)
      const result = await createCategory(db, validated.value.name)
      if (result.isErr) {
        return redirectWithFormErrors(
          c,
          PATHS.CATEGORIES,
          { name: result.error.message },
          { name: raw.name },
        )
      }
      return redirectWithMessage(c, PATHS.CATEGORIES, 'Category created.')
    },
  )

  app.post(
    '/categories/:id/rename',
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = c.req.param('id') ?? ''
      const raw = await readRawBody(c)
      const values: ExpenseFormValues = { id, name: raw.name }
      const validated = parseCategoryRename({ id, name: raw.name })
      if (validated.isErr) {
        return redirectWithFormErrors(c, PATHS.CATEGORIES, validated.error, values)
      }
      const db = createDbClient(c.env.PROJECT_DB)
      const categoriesResult = await listCategories(db)
      if (categoriesResult.isErr) {
        return redirectWithError(
          c,
          PATHS.CATEGORIES,
          'Failed to rename category. Please try again.',
        )
      }
      const source = categoriesResult.value.find((row) => row.id === validated.value.id)
      if (!source) {
        return redirectWithError(c, PATHS.CATEGORIES, 'Category not found.')
      }
      const targetLookup = await findCategoryByName(db, validated.value.name)
      if (targetLookup.isErr) {
        return redirectWithError(
          c,
          PATHS.CATEGORIES,
          'Failed to rename category. Please try again.',
        )
      }
      if (targetLookup.value !== null && targetLookup.value.id !== validated.value.id) {
        const expenseCount = await countCategoryExpenses(db, validated.value.id)
        if (expenseCount.isErr) {
          return redirectWithError(
            c,
            PATHS.CATEGORIES,
            'Failed to rename category. Please try again.',
          )
        }
        return c.render(
          useLayout(
            c,
            renderMergeConfirm({
              source,
              target: targetLookup.value,
              expenseCount: expenseCount.value,
            }),
          ),
        )
      }
      const result = await renameCategory(db, validated.value)
      if (result.isErr) {
        return redirectWithFormErrors(c, PATHS.CATEGORIES, { name: result.error.message }, values)
      }
      return redirectWithMessage(c, PATHS.CATEGORIES, 'Category renamed.')
    },
  )

  app.post(
    CATEGORY_MERGE_CONFIRM_PATH,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const raw = await readRawBody(c)
      if (raw.action === 'cancel') {
        return redirectWithMessage(c, PATHS.CATEGORIES, 'Category merge canceled.')
      }
      const validated = parseCategoryMergeConfirm({
        sourceId: raw.sourceId,
        targetId: raw.targetId,
      })
      if (validated.isErr) {
        return redirectWithError(c, PATHS.CATEGORIES, 'Invalid merge request.')
      }
      const db = createDbClient(c.env.PROJECT_DB)
      const categoriesResult = await listCategories(db)
      if (categoriesResult.isErr) {
        return redirectWithError(
          c,
          PATHS.CATEGORIES,
          'Failed to merge categories. Please try again.',
        )
      }
      const source = categoriesResult.value.find((row) => row.id === validated.value.sourceId)
      const target = categoriesResult.value.find((row) => row.id === validated.value.targetId)
      if (!source || !target) {
        return redirectWithError(c, PATHS.CATEGORIES, 'Category not found.')
      }
      const result = await mergeCategory(db, validated.value)
      if (result.isErr) {
        return redirectWithError(c, PATHS.CATEGORIES, result.error.message)
```

## Tests

Issue 09 adds unit coverage for validators and repository helpers, plus Playwright coverage for no-JavaScript category management flows: create, duplicate validation, sticky validation, simple rename, merge confirm/cancel, and delete blocked/success behavior.

```bash
sed -n '275,370p' tests/expense-validators.spec.ts && printf '\n--- repository helper tests ---\n' && sed -n '65,240p' tests/expense-access.spec.ts && printf '\n--- playwright category management tests ---\n' && sed -n '1,190p' e2e-tests/expenses/12-category-management.spec.ts
```

```output
describe('category management validators', () => {
  describe('parseCategoryCreate', () => {
    it('trims and lowercases valid names', () => {
      const r = parseCategoryCreate({ name: '  Groceries  ' })
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.deepStrictEqual(r.value, { name: 'groceries' })
      }
    })

    it('rejects empty names with a field error', () => {
      const r = parseCategoryCreate({ name: '   ' })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.name)
      }
    })

    it('rejects categoryNameMax + 1 characters', () => {
      const r = parseCategoryCreate({ name: 'a'.repeat(categoryNameMax + 1) })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.name)
      }
    })
  })

  describe('parseCategoryRename', () => {
    it('returns id and normalized name', () => {
      const r = parseCategoryRename({ id: 'cat-1', name: '  Utilities  ' })
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.deepStrictEqual(r.value, { id: 'cat-1', name: 'utilities' })
      }
    })

    it('reports both id and name errors', () => {
      const r = parseCategoryRename({ id: '', name: '' })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.id)
        assert.ok(r.error.name)
      }
    })
  })

  describe('parseCategoryMergeConfirm', () => {
    it('returns source and target ids', () => {
      const r = parseCategoryMergeConfirm({ sourceId: 'source', targetId: 'target' })
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.deepStrictEqual(r.value, { sourceId: 'source', targetId: 'target' })
      }
    })

    it('rejects matching source and target ids', () => {
      const r = parseCategoryMergeConfirm({ sourceId: 'same', targetId: 'same' })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.targetId)
      }
    })

    it('reports missing source and target ids', () => {
      const r = parseCategoryMergeConfirm({ sourceId: '', targetId: '' })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.sourceId)
        assert.ok(r.error.targetId)
      }
    })
  })

  describe('parseCategoryDelete', () => {
    it('returns trimmed id', () => {
      const r = parseCategoryDelete({ id: '  cat-1  ' })
      assert.strictEqual(r.isOk, true)
      if (r.isOk) {
        assert.deepStrictEqual(r.value, { id: 'cat-1' })
      }
    })

    it('rejects missing id', () => {
      const r = parseCategoryDelete({ id: '' })
      assert.strictEqual(r.isErr, true)
      if (r.isErr) {
        assert.ok(r.error.id)
      }
    })
  })
})

--- repository helper tests ---
      const runBatch = sqlite.transaction(() => queries.map((query) => query.run()))
      return runBatch()
    },
  }) as unknown as TestDb
}

const seedCategory = async (db: TestDb, id: string, name: string): Promise<void> => {
  const now = new Date()
  await db.insert(category).values({ id, name, createdAt: now, updatedAt: now })
}

const seedExpense = async (db: TestDb, id: string, categoryId: string): Promise<void> => {
  const now = new Date()
  await db.insert(expense).values({
    id,
    description: id,
    amountCents: 100,
    categoryId,
    date: '2024-01-01',
    createdAt: now,
    updatedAt: now,
  })
}

const expenseCategoryIds = async (db: TestDb): Promise<string[]> => {
  const rows = await db.select({ categoryId: expense.categoryId }).from(expense)
  return rows.map((row) => row.categoryId).sort()
}

describe('expense-access DB helpers', () => {
  it('DB-level assertions are covered by Playwright e2e specs', () => {
    // intentionally empty — see header comment above
  })
})

describe('category repository helpers', () => {
  it('createCategory stores lowercase names and rejects case-insensitive duplicates', async () => {
    const db = await createTestDb()
    const created = await createCategory(db, '  Food  ')
    assert.strictEqual(created.isOk, true)
    if (created.isOk) {
      assert.strictEqual(created.value.name, 'food')
    }

    const duplicate = await createCategory(db, 'FOOD')
    assert.strictEqual(duplicate.isErr, true)
    if (duplicate.isErr) {
      assert.match(duplicate.error.message, /already exists/)
    }

    const found = await findCategoryByName(db, 'food')
    assert.strictEqual(found.isOk, true)
    if (found.isOk) {
      assert.strictEqual(found.value?.name, 'food')
    }
  })

  it('renameCategory updates the category name and timestamp', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    const before = await db
      .select({ updatedAt: category.updatedAt })
      .from(category)
      .where(eq(category.id, 'cat-1'))
      .limit(1)

    const result = await renameCategory(db, { id: 'cat-1', name: '  Utilities  ' })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.deepStrictEqual(result.value, { id: 'cat-1', name: 'utilities' })
    }

    const after = await db
      .select({ name: category.name, updatedAt: category.updatedAt })
      .from(category)
      .where(eq(category.id, 'cat-1'))
      .limit(1)
    assert.strictEqual(after[0]?.name, 'utilities')
    assert.ok(Number(after[0]?.updatedAt) >= Number(before[0]?.updatedAt))
  })

  it('renameCategory detects case-insensitive collisions before merge', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedCategory(db, 'cat-2', 'groceries')

    const duplicate = await db
      .select({ id: category.id })
      .from(category)
      .where(and(sql`lower(${category.name}) = lower(${'GROCERIES'})`, ne(category.id, 'cat-1')))
      .limit(1)
    assert.strictEqual(duplicate[0]?.id, 'cat-2')

    const result = await renameCategory(db, { id: 'cat-1', name: 'GROCERIES' })
    assert.strictEqual(result.isErr, true)
    if (result.isErr) {
      assert.match(result.error.message, /already exists/)
    }
  })

  it('mergeCategory repoints source expenses and removes the source category', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'source', 'food')
    await seedCategory(db, 'target', 'groceries')
    await seedCategory(db, 'other', 'utilities')
    await seedExpense(db, 'expense-1', 'source')
    await seedExpense(db, 'expense-2', 'source')
    await seedExpense(db, 'expense-3', 'other')

    const result = await mergeCategory(db, { sourceId: 'source', targetId: 'target' })
    assert.strictEqual(result.isOk, true)
    if (result.isOk) {
      assert.deepStrictEqual(result.value, { reassignedExpenseCount: 2 })
    }

    assert.deepStrictEqual(await expenseCategoryIds(db), ['other', 'target', 'target'])
    const categories = await db.select({ id: category.id }).from(category)
    assert.deepStrictEqual(categories.map((row) => row.id).sort(), ['other', 'target'])
  })

  it('deleteCategory fails with the exact referencing expense count when referenced', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedExpense(db, 'expense-1', 'cat-1')
    await seedExpense(db, 'expense-2', 'cat-1')

    const result = await deleteCategory(db, 'cat-1')
    assert.strictEqual(result.isErr, true)
    if (result.isErr) {
      assert.match(result.error.message, /2 expenses reference/)
    }

    const categories = await db.select({ id: category.id }).from(category)
    assert.deepStrictEqual(
      categories.map((row) => row.id),
      ['cat-1'],
    )
  })

  it('deleteCategory succeeds for an unreferenced category', async () => {
    const db = await createTestDb()
    await seedCategory(db, 'cat-1', 'food')
    await seedCategory(db, 'cat-2', 'utilities')
    await seedExpense(db, 'expense-1', 'cat-2')

    const result = await deleteCategory(db, 'cat-1')
    assert.strictEqual(result.isOk, true)

    const categories = await db.select({ id: category.id }).from(category)
    assert.deepStrictEqual(
      categories.map((row) => row.id),
      ['cat-2'],
    )
    assert.deepStrictEqual(await expenseCategoryIds(db), ['cat-2'])
  })

  it('deleteCategory blocks categories referenced by recurring templates', async () => {
    const db = await createTestDb()
    const now = new Date()
    await seedCategory(db, 'cat-1', 'food')
    await db.insert(recurring).values({
      id: 'recurring-1',
      description: 'Rent',
      amountCents: 100,
      categoryId: 'cat-1',
      recurrence: 'monthly',
      anchorDate: '2024-01-01',
      createdAt: now,
      updatedAt: now,
    })

    const result = await deleteCategory(db, 'cat-1')
    assert.strictEqual(result.isErr, true)
    if (result.isErr) {
      assert.match(result.error.message, /Recurring expenses reference/)
    }

--- playwright category management tests ---
import { expect, test } from '@playwright/test'

import { BASE_URLS, TEST_USERS } from '../support/test-data'
import { submitSignInForm } from '../support/form-helpers'
import { testWithDatabase } from '../support/test-helpers'
import { seedCategories, seedExpenses } from '../support/db-helpers'

const categoriesUrl = 'http://localhost:3000/categories'
const categoryNameMax = 22

const todayEt = (): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

const signInAndGoToCategories = async (page: any) => {
  await page.goto(BASE_URLS.SIGN_IN)
  await submitSignInForm(page, TEST_USERS.KNOWN_USER)
  await page.goto(categoriesUrl)
}

const categoryRows = (page: any) => page.getByTestId('category-row')
const categoryNames = (page: any) => page.getByTestId('category-row-name')
const rowByName = (page: any, name: string) => categoryRows(page).filter({ hasText: name })

test.describe('Category management', () => {
  test.use({ javaScriptEnabled: false })

  test(
    'creates lowercase categories and shows duplicate validation without adding a row',
    testWithDatabase(async ({ page }) => {
      await signInAndGoToCategories(page)

      await page.getByTestId('category-create-name').fill('Food')
      await page.getByTestId('create-category-action').click()

      await page.waitForURL(categoriesUrl)
      await expect(categoryNames(page)).toHaveText(['food'])

      await page.getByTestId('category-create-name').fill('FOOD')
      await page.getByTestId('create-category-action').click()

      await page.waitForURL(categoriesUrl)
      await expect(page.getByTestId('category-create-name-error')).toContainText('already exists')
      await expect(categoryRows(page)).toHaveCount(1)
      await expect(categoryNames(page)).toHaveText(['food'])
    }),
  )

  test(
    'shows create validation while preserving over-limit input',
    testWithDatabase(async ({ page }) => {
      await signInAndGoToCategories(page)
      const tooLong = 'g'.repeat(categoryNameMax + 1)

      await page.getByTestId('category-create-name').fill(tooLong)
      await page.getByTestId('create-category-action').click()

      await page.waitForURL(categoriesUrl)
      await expect(page.getByTestId('category-create-name-error')).toBeVisible()
      await expect(page.getByTestId('category-create-name')).toHaveValue(tooLong)
      await expect(categoryRows(page)).toHaveCount(0)
    }),
  )

  test(
    'renames a category to a lowercase normalized name',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'food' }])
      await signInAndGoToCategories(page)

      const row = rowByName(page, 'food')
      await row.getByTestId('category-rename-name').fill('Groceries')
      await row.getByTestId('rename-category-action').click()

      await page.waitForURL(categoriesUrl)
      await expect(rowByName(page, 'groceries')).toHaveCount(1)
      await expect(rowByName(page, 'food')).toHaveCount(0)
    }),
  )

  test(
    'confirms rename collision merge and repoints source expenses',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'Source expense',
          amountCents: 100,
          categoryName: 'food',
          tagNames: [],
        },
        {
          date: todayEt(),
          description: 'Target expense',
          amountCents: 200,
          categoryName: 'groceries',
          tagNames: [],
        },
      ])
      await signInAndGoToCategories(page)

      const sourceRow = rowByName(page, 'food')
      await sourceRow.getByTestId('category-rename-name').fill('GROCERIES')
      await sourceRow.getByTestId('rename-category-action').click()

      await expect(page.getByTestId('category-merge-confirm-page')).toBeVisible()
      await expect(page.getByTestId('merge-source-name')).toHaveText('food')
      await expect(page.getByTestId('merge-target-name')).toHaveText('groceries')
      await expect(page.getByTestId('merge-expense-count')).toContainText('All 1 expenses')

      await page.getByTestId('confirm-merge-category-action').click()
      await page.waitForURL(categoriesUrl)
      await expect(rowByName(page, 'food')).toHaveCount(0)
      await expect(rowByName(page, 'groceries')).toHaveCount(1)

      await page.goto(BASE_URLS.EXPENSES)
      await expect(page.getByTestId('expense-row')).toHaveCount(2)
      await expect(page.getByTestId('expense-row-category')).toHaveText(['groceries', 'groceries'])
    }),
  )

  test(
    'canceling rename collision merge leaves categories unchanged',
    testWithDatabase(async ({ page }) => {
      await seedCategories([{ name: 'food' }, { name: 'groceries' }])
      await signInAndGoToCategories(page)

      const sourceRow = rowByName(page, 'food')
      await sourceRow.getByTestId('category-rename-name').fill('groceries')
      await sourceRow.getByTestId('rename-category-action').click()

      await expect(page.getByTestId('category-merge-confirm-page')).toBeVisible()
      await page.getByTestId('cancel-merge-category-action').click()

      await page.waitForURL(categoriesUrl)
      await expect(rowByName(page, 'food')).toHaveCount(1)
      await expect(rowByName(page, 'groceries')).toHaveCount(1)
    }),
  )

  test(
    'blocks deleting referenced categories with a count and deletes unreferenced categories',
    testWithDatabase(async ({ page }) => {
      await seedExpenses([
        {
          date: todayEt(),
          description: 'One',
          amountCents: 100,
          categoryName: 'food',
          tagNames: [],
        },
        {
          date: todayEt(),
          description: 'Two',
          amountCents: 200,
          categoryName: 'food',
          tagNames: [],
        },
      ])
      await seedCategories([{ name: 'utilities' }])
      await signInAndGoToCategories(page)

      await rowByName(page, 'food').getByTestId('delete-category-action').click()
      await page.waitForURL(categoriesUrl)
      await expect(page.getByRole('alert')).toContainText('2 expenses reference')
      await expect(rowByName(page, 'food')).toHaveCount(1)

      await rowByName(page, 'utilities').getByTestId('delete-category-action').click()
      await page.waitForURL(categoriesUrl)
      await expect(rowByName(page, 'utilities')).toHaveCount(0)
      await expect(rowByName(page, 'food')).toHaveCount(1)
    }),
  )
})
```

## Verification and file inventory

The focused unit checks cover the new validators and repository helpers. The expense Playwright suite was run after starting `npm run dev-open-sign-up`; all 42 expense E2E tests passed after updating the date-window fixture in `01-list-rendering.spec.ts`.

```bash
printf '%s\n' src/db/schema.ts drizzle/0003_misty_prodigy.sql drizzle/meta/0003_snapshot.json src/lib/expense-validators.ts src/lib/db/expense-access.ts src/lib/form-state.ts src/routes/build-categories.tsx tests/expense-validators.spec.ts tests/expense-access.spec.ts e2e-tests/expenses/12-category-management.spec.ts Notes/wiki/src/db/schema.md Notes/wiki/src/lib/expense-validators.md Notes/wiki/src/lib/db/expense-access.md Notes/wiki/src/lib/form-state.md Notes/wiki/src/routes/build-categories.md Notes/wiki/tests/expense-validators.spec.md Notes/wiki/tests/expense-access.spec.md Notes/wiki/e2e-tests/expenses/12-category-management.spec.md Notes/wiki/unit-tests.md Notes/wiki/e2e-tests.md Notes/wiki/source-code.md Notes/wiki/index.md Notes/wiki/log.md | xargs -r ls -1
```

```output
Notes/wiki/e2e-tests.md
Notes/wiki/e2e-tests/expenses/12-category-management.spec.md
Notes/wiki/index.md
Notes/wiki/log.md
Notes/wiki/source-code.md
Notes/wiki/src/db/schema.md
Notes/wiki/src/lib/db/expense-access.md
Notes/wiki/src/lib/expense-validators.md
Notes/wiki/src/lib/form-state.md
Notes/wiki/src/routes/build-categories.md
Notes/wiki/tests/expense-access.spec.md
Notes/wiki/tests/expense-validators.spec.md
Notes/wiki/unit-tests.md
drizzle/0003_misty_prodigy.sql
drizzle/meta/0003_snapshot.json
e2e-tests/expenses/12-category-management.spec.ts
src/db/schema.ts
src/lib/db/expense-access.ts
src/lib/expense-validators.ts
src/lib/form-state.ts
src/routes/build-categories.tsx
tests/expense-access.spec.ts
tests/expense-validators.spec.ts
```

```bash
npx oxfmt --check src/db/schema.ts src/lib/expense-validators.ts src/lib/db/expense-access.ts src/lib/form-state.ts src/routes/build-categories.tsx tests/expense-validators.spec.ts tests/expense-access.spec.ts e2e-tests/expenses/01-list-rendering.spec.ts e2e-tests/expenses/12-category-management.spec.ts && npm test -- expense-validators.spec.ts expense-access.spec.ts
```

```output
Checking formatting...

All matched files use the correct format.
Finished in 45ms on 9 files using 4 threads.

> test
> cd tests && bun test expense-validators.spec.ts expense-access.spec.ts

bun test v1.3.13 (bf2e2cec)

expense-access.spec.ts:
(pass) expense-access DB helpers > DB-level assertions are covered by Playwright e2e specs
createCategory final error: 248 |     const existing = await findCategoryByNameActual(db, normalizedName)
249 |     if (existing.isErr) {
250 |       return Result.err(existing.error)
251 |     }
252 |     if (existing.value !== null) {
253 |       return Result.err(new Error(`A category named "${normalizedName}" already exists.`))
                                  ^
error: A category named "food" already exists.
      at <anonymous> (/home/chris/expense-log/src/lib/db/expense-access.ts:253:29)
      at async <anonymous> (/home/chris/expense-log/src/lib/db-helpers.ts:15:28)

(pass) category repository helpers > createCategory stores lowercase names and rejects case-insensitive duplicates [1097.01ms]
(pass) category repository helpers > renameCategory updates the category name and timestamp [4.00ms]
renameCategory final error: 296 |       .where(
297 |         and(sql`lower(${category.name}) = lower(${normalizedName})`, ne(category.id, input.id)),
298 |       )
299 |       .limit(1)
300 |     if (duplicate.length > 0) {
301 |       return Result.err(new Error(`A category named "${normalizedName}" already exists.`))
                                  ^
error: A category named "groceries" already exists.
      at <anonymous> (/home/chris/expense-log/src/lib/db/expense-access.ts:301:29)
      at async <anonymous> (/home/chris/expense-log/src/lib/db-helpers.ts:15:28)

(pass) category repository helpers > renameCategory detects case-insensitive collisions before merge [1043.01ms]
(pass) category repository helpers > mergeCategory repoints source expenses and removes the source category [8.00ms]
deleteCategory final error: 414 |       return Result.err(new Error('Category not found.'))
415 |     }
416 |     const expenseCount = await countExpensesForCategory(db, id)
417 |     if (expenseCount > 0) {
418 |       return Result.err(
419 |         new Error(
                  ^
error: 2 expenses reference this category.
      at <anonymous> (/home/chris/expense-log/src/lib/db/expense-access.ts:419:13)
      at async <anonymous> (/home/chris/expense-log/src/lib/db-helpers.ts:15:28)

(pass) category repository helpers > deleteCategory fails with the exact referencing expense count when referenced [689.01ms]
(pass) category repository helpers > deleteCategory succeeds for an unreferenced category [3.00ms]
deleteCategory final error: 423 |         ),
424 |       )
425 |     }
426 |     const recurringCount = await countRecurringForCategory(db, id)
427 |     if (recurringCount > 0) {
428 |       return Result.err(new Error('Recurring expenses reference this category.'))
                                  ^
error: Recurring expenses reference this category.
      at <anonymous> (/home/chris/expense-log/src/lib/db/expense-access.ts:428:29)
      at async <anonymous> (/home/chris/expense-log/src/lib/db-helpers.ts:15:28)

(pass) category repository helpers > deleteCategory blocks categories referenced by recurring templates [1027.01ms]

expense-validators.spec.ts:
(pass) parseExpenseCreate > description > accepts a single char [3.00ms]
(pass) parseExpenseCreate > description > accepts exactly descriptionMax characters
(pass) parseExpenseCreate > description > rejects empty
(pass) parseExpenseCreate > description > rejects whitespace-only
(pass) parseExpenseCreate > description > rejects descriptionMax + 1 characters
(pass) parseExpenseCreate > amount > parses 1234.56 as 123456 cents
(pass) parseExpenseCreate > amount > rejects empty
(pass) parseExpenseCreate > amount > rejects zero
(pass) parseExpenseCreate > amount > rejects negatives [1.00ms]
(pass) parseExpenseCreate > amount > rejects more than two decimal places
(pass) parseExpenseCreate > amount > rejects non-numeric
(pass) parseExpenseCreate > date > accepts leap day 2024-02-29
(pass) parseExpenseCreate > date > rejects empty
(pass) parseExpenseCreate > date > rejects 2025-13-40
(pass) parseExpenseCreate > date > rejects 2024-04-31
(pass) parseExpenseCreate > date > rejects malformed shape
(pass) parseExpenseCreate > category > accepts a non-empty name
(pass) parseExpenseCreate > category > rejects empty
(pass) parseExpenseCreate > category > rejects whitespace-only
(pass) parseExpenseCreate > parseNewCategoryName > accepts a single character
(pass) parseExpenseCreate > parseNewCategoryName > accepts exactly categoryNameMax characters
(pass) parseExpenseCreate > parseNewCategoryName > rejects categoryNameMax + 1 characters
(pass) parseExpenseCreate > parseNewCategoryName > rejects empty input
(pass) parseExpenseCreate > parseNewCategoryName > rejects whitespace-only input
(pass) parseExpenseCreate > parseNewCategoryName > trims surrounding whitespace and returns the trimmed value
(pass) parseExpenseCreate > parseNewCategoryName > preserves case in the trimmed value
(pass) parseExpenseCreate > parseTagCsv > returns ok([]) for empty string
(pass) parseExpenseCreate > parseTagCsv > parses a simple two-tag CSV
(pass) parseExpenseCreate > parseTagCsv > case-insensitively de-duplicates
(pass) parseExpenseCreate > parseTagCsv > trims whitespace per entry
(pass) parseExpenseCreate > parseTagCsv > rejects a single tagNameMax + 1 char name
(pass) parseExpenseCreate > parseTagCsv > rejects when any tag in a longer list exceeds the limit
(pass) parseExpenseCreate > parseTagCsv > returns ok([]) for an all-empty CSV
(pass) parseExpenseCreate > parseTagCsv > accepts exactly tagNameMax characters
(pass) parseExpenseCreate > multi-field failure > reports errors for every invalid field at once [1.00ms]
(pass) parseExpenseCreate > multi-field failure > preserves valid fields passing while invalid ones fail
(pass) category management validators > parseCategoryCreate > trims and lowercases valid names
(pass) category management validators > parseCategoryCreate > rejects empty names with a field error
(pass) category management validators > parseCategoryCreate > rejects categoryNameMax + 1 characters
(pass) category management validators > parseCategoryRename > returns id and normalized name
(pass) category management validators > parseCategoryRename > reports both id and name errors
(pass) category management validators > parseCategoryMergeConfirm > returns source and target ids
(pass) category management validators > parseCategoryMergeConfirm > rejects matching source and target ids
(pass) category management validators > parseCategoryMergeConfirm > reports missing source and target ids
(pass) category management validators > parseCategoryDelete > returns trimmed id
(pass) category management validators > parseCategoryDelete > rejects missing id

 54 pass
 0 fail
Ran 54 tests across 2 files. [3.98s]
```
