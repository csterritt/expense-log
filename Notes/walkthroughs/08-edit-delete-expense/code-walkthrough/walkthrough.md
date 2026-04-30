# Issue 08 — Edit and delete expense code walkthrough

*2026-04-30T11:31:21Z by Showboat 0.6.1*
<!-- showboat-id: adc285c5-8bc5-4d1b-b703-52f91feefbf0 -->

## Overview

Issue 08 adds the ability to edit and delete an expense. The edit flow mirrors the create flow shipped in Issues 5 and 6: an all-existing submission saves directly, while any new category or tag routes through the consolidated *Confirm new items* page (now generalised to support `mode='edit'`). The delete flow is a single-step confirmation page that POSTs to a delete endpoint. Tag-link replacement is handled inside an atomic `db.batch` so partial failures are impossible. The schema's `ON DELETE CASCADE` on `expenseTag` cleans up link rows automatically when an expense is deleted.

## 1. New `expense-access` helpers

Issue 08 adds four new HTTP-agnostic DB helpers in `src/lib/db/expense-access.ts`. `getExpenseById` is used by every edit / delete handler to load the row and verify it exists; `updateExpenseWithTags` and `updateManyAndExpense` mirror their create counterparts but update an existing expense; `deleteExpense` removes the row (cascade handles the link table).

### `getExpenseById` — load the full row, including alphabetised tags.

```bash
sed -n '419,481p' src/lib/db/expense-access.ts
```

```output
export interface ExpenseDetailRow extends ExpenseRow {
  categoryId: string
  tagIds: string[]
}

/**
 * Look up a single expense by id, including its category name + id and the
 * full alphabetized tag list (names + ids). Returns `Result.ok(null)` when no
 * row matches.
 */
export const getExpenseById = (
  db: DrizzleClient,
  id: string,
): Promise<Result<ExpenseDetailRow | null, Error>> =>
  withRetry('getExpenseById', () => getExpenseByIdActual(db, id))

const getExpenseByIdActual = async (
  db: DrizzleClient,
  id: string,
): Promise<Result<ExpenseDetailRow | null, Error>> => {
  try {
    if (typeof id !== 'string' || id.length === 0) {
      return Result.ok(null)
    }
    const rows = await db
      .select({
        id: expense.id,
        date: expense.date,
        description: expense.description,
        amountCents: expense.amountCents,
        categoryId: expense.categoryId,
        categoryName: category.name,
      })
      .from(expense)
      .innerJoin(category, eq(category.id, expense.categoryId))
      .where(eq(expense.id, id))
      .limit(1)
    if (rows.length === 0) {
      return Result.ok(null)
    }
    const row = rows[0]
    const tagRows = await db
      .select({ id: tag.id, name: tag.name })
      .from(expenseTag)
      .innerJoin(tag, eq(tag.id, expenseTag.tagId))
      .where(eq(expenseTag.expenseId, id))
    const sorted = tagRows
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
    return Result.ok({
      id: row.id,
      date: row.date,
      description: row.description,
      amountCents: row.amountCents,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      tagIds: sorted.map((r) => r.id),
      tagNames: sorted.map((r) => r.name),
    })
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}
```

### `updateExpenseWithTags` — atomic update of the row plus full replacement of the tag-link set. Inside a single `db.batch`: update the expense row, delete every prior `expenseTag` row, then insert one row per de-duplicated tag id.

```bash
sed -n '498,550p' src/lib/db/expense-access.ts
```

```output
export const updateExpenseWithTags = (
  db: DrizzleClient,
  input: UpdateExpenseWithTagsInput,
): Promise<Result<{ id: string }, Error>> =>
  withRetry('updateExpenseWithTags', () => updateExpenseWithTagsActual(db, input))

const updateExpenseWithTagsActual = async (
  db: DrizzleClient,
  input: UpdateExpenseWithTagsInput,
): Promise<Result<{ id: string }, Error>> => {
  try {
    const found = await db
      .select({ id: expense.id })
      .from(expense)
      .where(eq(expense.id, input.id))
      .limit(1)
    if (found.length === 0) {
      return Result.err(new Error('Expense not found.'))
    }
    const catFound = await db
      .select({ id: category.id })
      .from(category)
      .where(eq(category.id, input.categoryId))
      .limit(1)
    if (catFound.length === 0) {
      return Result.err(new Error(`Category not found: ${input.categoryId}`))
    }

    const now = new Date()
    const uniqueTagIds = Array.from(new Set(input.tagIds))

    const statements: unknown[] = [
      db
        .update(expense)
        .set({
          description: input.description,
          amountCents: input.amountCents,
          categoryId: input.categoryId,
          date: input.date,
          updatedAt: now,
        })
        .where(eq(expense.id, input.id)),
      db.delete(expenseTag).where(eq(expenseTag.expenseId, input.id)),
    ]
    for (const tagId of uniqueTagIds) {
      statements.push(db.insert(expenseTag).values({ expenseId: input.id, tagId }))
    }
    await db.batch(statements as never)
    return Result.ok({ id: input.id })
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}
```

### `updateManyAndExpense` — same shape as `createManyAndExpense`, but the central statement updates an existing expense rather than inserting one. Exactly one of `newCategoryName` / `existingCategoryId` must be supplied. Unique-name collisions roll back the entire batch.

```bash
sed -n '571,677p' src/lib/db/expense-access.ts
```

```output
export const updateManyAndExpense = (
  db: DrizzleClient,
  input: UpdateManyAndExpenseInput,
): Promise<Result<{ id: string; categoryId: string; createdTagIds: string[] }, Error>> =>
  withRetry('updateManyAndExpense', () => updateManyAndExpenseActual(db, input))

const updateManyAndExpenseActual = async (
  db: DrizzleClient,
  input: UpdateManyAndExpenseInput,
): Promise<Result<{ id: string; categoryId: string; createdTagIds: string[] }, Error>> => {
  try {
    const hasNewCategory =
      typeof input.newCategoryName === 'string' && input.newCategoryName.trim().length > 0
    const hasExistingCategory =
      typeof input.existingCategoryId === 'string' && input.existingCategoryId.length > 0
    if (hasNewCategory && hasExistingCategory) {
      return Result.err(
        new Error('Provide exactly one of newCategoryName or existingCategoryId.'),
      )
    }
    if (!hasNewCategory && !hasExistingCategory) {
      return Result.err(
        new Error('Provide exactly one of newCategoryName or existingCategoryId.'),
      )
    }

    const found = await db
      .select({ id: expense.id })
      .from(expense)
      .where(eq(expense.id, input.id))
      .limit(1)
    if (found.length === 0) {
      return Result.err(new Error('Expense not found.'))
    }

    const now = new Date()
    let categoryId: string
    const statements: unknown[] = []

    if (hasNewCategory) {
      categoryId = crypto.randomUUID()
      const normalizedCat = (input.newCategoryName as string).trim().toLowerCase()
      statements.push(
        db.insert(category).values({
          id: categoryId,
          name: normalizedCat,
          createdAt: now,
          updatedAt: now,
        }),
      )
    } else {
      categoryId = input.existingCategoryId as string
    }

    const newTagIdByName = new Map<string, string>()
    for (const raw of input.newTagNames) {
      if (typeof raw !== 'string') {
        continue
      }
      const lowered = raw.trim().toLowerCase()
      if (lowered.length === 0) {
        continue
      }
      if (!newTagIdByName.has(lowered)) {
        newTagIdByName.set(lowered, crypto.randomUUID())
      }
    }
    const createdTagIds: string[] = []
    for (const [name, id] of newTagIdByName.entries()) {
      createdTagIds.push(id)
      statements.push(
        db.insert(tag).values({ id, name, createdAt: now, updatedAt: now }),
      )
    }

    statements.push(
      db
        .update(expense)
        .set({
          description: input.description,
          amountCents: input.amountCents,
          categoryId,
          date: input.date,
          updatedAt: now,
        })
        .where(eq(expense.id, input.id)),
    )
    statements.push(db.delete(expenseTag).where(eq(expenseTag.expenseId, input.id)))

    const allTagIds = Array.from(new Set([...input.existingTagIds, ...createdTagIds]))
    for (const tagId of allTagIds) {
      statements.push(db.insert(expenseTag).values({ expenseId: input.id, tagId }))
    }

    await db.batch(statements as never)

    return Result.ok({ id: input.id, categoryId, createdTagIds })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (/unique|constraint/i.test(message)) {
      return Result.err(
        new Error('One of the new names collides with an existing row. Please try again.'),
      )
    }
    return Result.err(e instanceof Error ? e : new Error(message))
  }
}
```

### `deleteExpense` — single delete; cascade cleans up `expenseTag` rows.

```bash
sed -n '684,708p' src/lib/db/expense-access.ts
```

```output
export const deleteExpense = (
  db: DrizzleClient,
  id: string,
): Promise<Result<void, Error>> =>
  withRetry('deleteExpense', () => deleteExpenseActual(db, id))

const deleteExpenseActual = async (
  db: DrizzleClient,
  id: string,
): Promise<Result<void, Error>> => {
  try {
    const found = await db
      .select({ id: expense.id })
      .from(expense)
      .where(eq(expense.id, id))
      .limit(1)
    if (found.length === 0) {
      return Result.err(new Error('Expense not found.'))
    }
    await db.delete(expense).where(eq(expense.id, id))
    return Result.ok(undefined as unknown as void)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}
```

## 2. Shared form renderer

The entry-form JSX and the *Confirm new items* JSX were extracted into `src/routes/expenses/expense-form.tsx` so the create flow and the new edit flow share one source of truth. The mode prop drives the submit-button label and testid, plus the testid prefix on the confirmation page.

```bash
sed -n '36,75p' src/routes/expenses/expense-form.tsx
```

```output
export type ExpenseFormMode = 'create' | 'edit'

export type RenderExpenseFormProps = {
  mode: ExpenseFormMode
  action: string
  state: ExpenseFormState
  payloads: ExpenseFormPayloads
}

const fieldError = (field: keyof FieldErrors, message?: string) => {
  if (!message) {
    return null
  }
  return (
    <p
      className='text-error text-sm mt-1'
      data-testid={`expense-form-${field}-error`}
    >
      {message}
    </p>
  )
}

const inputClass = (base: string, hasError: boolean) =>
  hasError ? `${base} input-error` : base

// Serialize a JSON payload safely for embedding inside a <script> tag.
// Escaping `<` (and `>` / `&` defensively) prevents a stray `</script>`
// in any data field from breaking out of the script element.
const safeJsonForScript = (data: unknown): string =>
  JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')

export const renderExpenseForm = (props: RenderExpenseFormProps) => {
  const { mode, action, state, payloads } = props
  const { fieldErrors, values } = state
  const submitLabel = mode === 'edit' ? 'Save changes' : 'Add expense'
  const submitTestId =
```

Confirmation page renderer (mode picks the testid prefix):

```bash
sed -n '186,250p' src/routes/expenses/expense-form.tsx
```

```output
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(payloads.tags) }}
      />
    </form>
  )
}

// ---------- Confirm-create-new-items page (shared between create + edit) ----------

export type ConfirmNewItemsProps = {
  mode: ExpenseFormMode
  // POST target for the confirm/cancel form.
  action: string
  // Normalized (lowercased, trimmed) new category name, or null when the
  // category already exists.
  newCategoryName: string | null
  // Final category name to display in the preview (existing match name or
  // the normalized new-category name).
  finalCategoryName: string
  // Normalized new-tag names (lowercased, trimmed, de-duplicated). Already
  // alphabetized by the caller.
  newTagNames: string[]
  // Final tag list to display in the preview (alphabetized).
  finalTagNames: string[]
  // Raw values from the entry / edit form (exact strings to round-trip on
  // Cancel).
  values: ExpenseFormValues
}

const formatAmountDisplay = (value: string | undefined): string =>
  (value ?? '').trim()

export const renderConfirmNewItems = (props: ConfirmNewItemsProps) => {
  const {
    mode,
    action,
    newCategoryName,
    finalCategoryName,
    newTagNames,
    finalTagNames,
    values,
  } = props
  const prefix = mode === 'edit' ? 'confirm-edit-new' : 'confirm-create-new'
  return (
    <div className='max-w-xl mx-auto' data-testid={`${prefix}-page`}>
      <h1 className='text-2xl font-bold mb-4'>Confirm new items</h1>
      <ul className='mb-4 list-disc list-inside' data-testid={`${prefix}-list`}>
        {newCategoryName !== null ? (
          <li data-testid={`${prefix}-category-line`}>
            Create category <strong>'{newCategoryName}'</strong>
          </li>
        ) : null}
        {newTagNames.map((name) => (
          <li data-testid={`${prefix}-tag-line`}>
            Create tag <strong>'{name}'</strong>
          </li>
        ))}
      </ul>
      <dl className='grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 mb-6'>
        <dt className='font-semibold'>Description</dt>
        <dd data-testid={`${prefix}-description`}>{values.description ?? ''}</dd>
        <dt className='font-semibold'>Amount</dt>
        <dd data-testid={`${prefix}-amount`}>{formatAmountDisplay(values.amount)}</dd>
        <dt className='font-semibold'>Date</dt>
        <dd data-testid={`${prefix}-date`}>{values.date ?? ''}</dd>
        <dt className='font-semibold'>Category</dt>
```

## 3. Plain-decimal money formatter

`formatCentsPlain` returns a comma-free decimal so the loaded `amountCents` round-trips through the edit form's text input untouched (where `parseAmount` then re-validates it on submit).

```bash
sed -n '35,47p' src/lib/money.ts
```

```output
/**
 * Format an integer amount in cents as a plain decimal string with no
 * grouping separators, suitable for round-tripping through the entry/edit
 * form's `amount` input (which `parseAmount` then re-validates).
 *
 * Examples: 0 -> "0.00", 100 -> "1.00", 123456 -> "1234.56".
 */
export const formatCentsPlain = (cents: number): string => {
  const whole = Math.trunc(cents / 100)
  const fraction = Math.abs(cents % 100)
  const fracStr = fraction.toString().padStart(2, '0')
  return `${whole}.${fracStr}`
}
```

## 4. The edit-route module

`src/routes/expenses/build-edit-expense.tsx` registers all five new routes. Every handler is gated by `signedInAccess`. The edit GET applies `ALLOW_SCRIPTS_SECURE_HEADERS` so the JS-on combobox + chip picker can mount; everything else uses `STANDARD_SECURE_HEADERS`.

### Route registrations

```bash
uvx showboat exec /dev/null bash 'true' >/dev/null 2>&1; grep -n 'app\.\(get\|post\)' src/routes/expenses/build-edit-expense.tsx
```

```output
244:  app.get(
292:  app.post(
413:  app.post(
518:  app.get(
554:  app.post(
```

### Edit GET — pre-populates the form from the loaded row

```bash
sed -n '243,290p' src/routes/expenses/build-edit-expense.tsx
```

```output
  // ---------- GET /expenses/:id/edit ----------
  app.get(
    '/expenses/:id/edit',
    secureHeaders(ALLOW_SCRIPTS_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = requireId(c)
      const db = createDbClient(c.env.PROJECT_DB)
      const expenseResult = await getExpenseById(db, id)
      if (expenseResult.isErr) {
        return redirectWithError(
          c,
          PATHS.EXPENSES,
          'Failed to load expense. Please try again.',
        )
      }
      if (expenseResult.value === null) {
        return redirectWithError(c, PATHS.EXPENSES, 'Expense not found.')
      }
      const loaded = expenseResult.value
      const categoriesResult = await listCategories(db)
      if (categoriesResult.isErr) {
        return redirectWithError(
          c,
          PATHS.EXPENSES,
          'Failed to load expense. Please try again.',
        )
      }
      const tagsResult = await listTags(db)
      if (tagsResult.isErr) {
        return redirectWithError(
          c,
          PATHS.EXPENSES,
          'Failed to load expense. Please try again.',
        )
      }
      const payloads: ExpenseFormPayloads = {
        categories: categoriesResult.value.map((row) => ({ name: row.name })),
        tags: tagsResult.value.map((row) => ({ name: row.name })),
      }
      const flash = readAndClearFormState(c)
      const state = buildEditState(loaded, flash)
      return c.render(
        useLayout(c, renderEditPage({ expenseId: id, state, payloads })),
      )
    },
  )

```

### Edit POST — all-existing path runs `updateExpenseWithTags` directly; any-new path renders `renderConfirmNewItems` with no DB writes.

```bash
sed -n '291,410p' src/routes/expenses/build-edit-expense.tsx
```

```output
  // ---------- POST /expenses/:id/edit ----------
  app.post(
    '/expenses/:id/edit',
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = requireId(c)
      const raw = await readRawBody(c)
      const rawValues: ExpenseFormValues = {
        description: raw.description,
        amount: raw.amount,
        date: raw.date,
        category: raw.category,
        tags: raw.tags,
      }

      const db = createDbClient(c.env.PROJECT_DB)
      const existing = await getExpenseById(db, id)
      if (existing.isErr) {
        return redirectWithError(
          c,
          PATHS.EXPENSES,
          'Failed to save expense. Please try again.',
        )
      }
      if (existing.value === null) {
        return redirectWithError(c, PATHS.EXPENSES, 'Expense not found.')
      }

      const validated = parseExpenseCreate({
        description: raw.description,
        amount: raw.amount,
        date: raw.date,
        category: raw.category,
      })
      const tagParse = parseTagCsv(raw.tags)
      if (validated.isErr || tagParse.isErr) {
        const errs: FieldErrors = validated.isErr ? { ...validated.error } : {}
        if (tagParse.isErr) {
          errs.tags = tagParse.error
        }
        return redirectWithFormErrors(c, editPath(id), errs, rawValues)
      }

      const lookup = await findCategoryByName(db, validated.value.category)
      if (lookup.isErr) {
        return redirectWithError(
          c,
          editPath(id),
          'Failed to save expense. Please try again.',
        )
      }
      const tagLookup = await findTagsByNames(db, tagParse.value)
      if (tagLookup.isErr) {
        return redirectWithError(
          c,
          editPath(id),
          'Failed to save expense. Please try again.',
        )
      }

      const diff = computeNewItemsDiff(lookup.value, tagLookup.value, tagParse.value)
      const anyNew = diff.newCategoryIsNew || diff.newTagNames.length > 0

      if (!anyNew) {
        const updateResult = await updateExpenseWithTags(db, {
          id,
          description: validated.value.description,
          amountCents: validated.value.amountCents,
          date: validated.value.date,
          categoryId: diff.existingCategoryRow!.id,
          tagIds: diff.existingTagIds,
        })
        if (updateResult.isErr) {
          return redirectWithError(
            c,
            editPath(id),
            'Failed to save expense. Please try again.',
          )
        }
        return redirectWithMessage(c, PATHS.EXPENSES, 'Expense updated.')
      }

      // Something is new — validate the new-category name when applicable.
      let normalizedNewCategory: string | null = null
      let finalCategoryName: string
      if (diff.newCategoryIsNew) {
        const nameCheck = parseNewCategoryName(validated.value.category)
        if (nameCheck.isErr) {
          return redirectWithFormErrors(
            c,
            editPath(id),
            { category: nameCheck.error },
            rawValues,
          )
        }
        normalizedNewCategory = nameCheck.value.toLowerCase()
        finalCategoryName = normalizedNewCategory
      } else {
        finalCategoryName = diff.existingCategoryRow!.name
      }

      const sortedNewTags = diff.newTagNames.slice().sort((a, b) => a.localeCompare(b))
      const finalTagNames = tagParse.value.slice().sort((a, b) => a.localeCompare(b))
      return c.render(
        useLayout(
          c,
          renderConfirmNewItems({
            mode: 'edit',
            action: confirmEditNewPath(id),
            newCategoryName: normalizedNewCategory,
            finalCategoryName,
            newTagNames: sortedNewTags,
            finalTagNames,
            values: rawValues,
          }),
        ),
      )
    },
  )
```

### Confirm-edit POST — Cancel preserves typed values; Confirm runs the atomic `updateManyAndExpense`.

```bash
sed -n '411,515p' src/routes/expenses/build-edit-expense.tsx
```

```output

  // ---------- POST /expenses/:id/confirm-edit-new ----------
  app.post(
    '/expenses/:id/confirm-edit-new',
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = requireId(c)
      const raw = await readRawBody(c)
      const rawValues: ExpenseFormValues = {
        description: raw.description,
        amount: raw.amount,
        date: raw.date,
        category: raw.category,
        tags: raw.tags,
      }

      if (raw.action === 'cancel') {
        return redirectWithFormErrors(c, editPath(id), {}, rawValues)
      }

      const validated = parseExpenseCreate({
        description: raw.description,
        amount: raw.amount,
        date: raw.date,
        category: raw.category,
      })
      const tagParse = parseTagCsv(raw.tags)
      if (validated.isErr || tagParse.isErr) {
        const errs: FieldErrors = validated.isErr ? { ...validated.error } : {}
        if (tagParse.isErr) {
          errs.tags = tagParse.error
        }
        return redirectWithFormErrors(c, editPath(id), errs, rawValues)
      }

      const db = createDbClient(c.env.PROJECT_DB)
      const existing = await getExpenseById(db, id)
      if (existing.isErr) {
        return redirectWithError(
          c,
          PATHS.EXPENSES,
          'Failed to save expense. Please try again.',
        )
      }
      if (existing.value === null) {
        return redirectWithError(c, PATHS.EXPENSES, 'Expense not found.')
      }

      const lookup = await findCategoryByName(db, validated.value.category)
      if (lookup.isErr) {
        return redirectWithError(
          c,
          editPath(id),
          'Failed to save expense. Please try again.',
        )
      }
      const tagLookup = await findTagsByNames(db, tagParse.value)
      if (tagLookup.isErr) {
        return redirectWithError(
          c,
          editPath(id),
          'Failed to save expense. Please try again.',
        )
      }
      const diff = computeNewItemsDiff(lookup.value, tagLookup.value, tagParse.value)

      let newCategoryName: string | null = null
      let existingCategoryId: string | null = null
      if (diff.existingCategoryRow !== null) {
        existingCategoryId = diff.existingCategoryRow.id
      } else {
        const nameCheck = parseNewCategoryName(validated.value.category)
        if (nameCheck.isErr) {
          return redirectWithFormErrors(
            c,
            editPath(id),
            { category: nameCheck.error },
            rawValues,
          )
        }
        newCategoryName = nameCheck.value
      }

      const updateResult = await updateManyAndExpense(db, {
        id,
        newCategoryName,
        existingCategoryId,
        newTagNames: diff.newTagNames,
        existingTagIds: diff.existingTagIds,
        date: validated.value.date,
        description: validated.value.description,
        amountCents: validated.value.amountCents,
      })
      if (updateResult.isErr) {
        const errs: FieldErrors =
          newCategoryName !== null
            ? { category: updateResult.error.message }
            : { tags: updateResult.error.message }
        return redirectWithFormErrors(c, editPath(id), errs, rawValues)
      }

      return redirectWithMessage(c, PATHS.EXPENSES, 'Expense updated.')
    },
  )
```

### Delete GET + POST — single-step confirmation, then `deleteExpense`.

```bash
sed -n '517,572p' src/routes/expenses/build-edit-expense.tsx
```

```output
  // ---------- GET /expenses/:id/delete ----------
  app.get(
    '/expenses/:id/delete',
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = requireId(c)
      const db = createDbClient(c.env.PROJECT_DB)
      const result = await getExpenseById(db, id)
      if (result.isErr) {
        return redirectWithError(
          c,
          PATHS.EXPENSES,
          'Failed to load expense. Please try again.',
        )
      }
      if (result.value === null) {
        return redirectWithError(c, PATHS.EXPENSES, 'Expense not found.')
      }
      const row = result.value
      return c.render(
        useLayout(
          c,
          renderDeleteConfirm({
            id: row.id,
            date: row.date,
            description: row.description,
            amountCents: row.amountCents,
            categoryName: row.categoryName,
            tagNames: row.tagNames,
          }),
        ),
      )
    },
  )

  // ---------- POST /expenses/:id/delete ----------
  app.post(
    '/expenses/:id/delete',
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const id = requireId(c)
      const db = createDbClient(c.env.PROJECT_DB)
      const result = await deleteExpense(db, id)
      if (result.isErr) {
        return redirectWithError(
          c,
          PATHS.EXPENSES,
          'Failed to delete expense. Please try again.',
        )
      }
      return redirectWithMessage(c, PATHS.EXPENSES, 'Expense deleted.')
    },
  )
}
```

## 5. Row-level Edit button on the list

Each list row in `build-expenses.tsx` carries an `<a data-testid='expense-row-edit'>` linking to `/expenses/:id/edit`. The header gains a matching empty `<th></th>` so the column count stays balanced.

```bash
sed -n '55,94p' src/routes/expenses/build-expenses.tsx
```

```output
const renderExpenseTable = (rows: ExpenseRow[]) => {
  return (
    <div className='overflow-x-auto'>
      <table className='table table-zebra w-full' data-testid='expenses-table'>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Tags</th>
            <th className='text-right'>Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr data-testid='expense-row' data-expense-id={row.id}>
              <td data-testid='expense-row-date'>{row.date}</td>
              <td data-testid='expense-row-description'>{row.description}</td>
              <td data-testid='expense-row-category'>{row.categoryName}</td>
              <td data-testid='expense-row-tags'>{row.tagNames.join(', ')}</td>
              <td className='text-right' data-testid='expense-row-amount'>
                {formatCents(row.amountCents)}
              </td>
              <td>
                <a
                  href={`/expenses/${row.id}/edit`}
                  className='btn btn-sm'
                  data-testid='expense-row-edit'
                >
                  Edit
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

## 6. Wiring into the Hono app

`buildEditExpense` is wired alongside `buildExpenses` in `src/index.ts`.

```bash
sed -n '15,18p' src/index.ts
```

```output
import { buildRoot } from './routes/build-root' // PRODUCTION:REMOVE
import { buildExpenses } from './routes/expenses/build-expenses'
import { buildEditExpense } from './routes/expenses/build-edit-expense'
import { buildCategories } from './routes/build-categories'
```

```bash
sed -n '174,180p' src/index.ts
```

```output
// Route declarations
buildRoot(app) // PRODUCTION:REMOVE
buildExpenses(app)
buildEditExpense(app)
buildCategories(app)
buildTags(app)
buildSummary(app)
```

## 7. End-to-end coverage

Three new Playwright specs cover every branch of the new flow. They run together in 40 s and pass cleanly with the rest of the expenses suite (36/36).

```bash
ls e2e-tests/expenses/0[91]*-*.spec.ts e2e-tests/expenses/11-*.spec.ts
```

```output
e2e-tests/expenses/01-list-rendering.spec.ts
e2e-tests/expenses/09-edit-expense.spec.ts
e2e-tests/expenses/11-delete-expense.spec.ts
```

### Test counts per file

```bash
grep -c "^  test(" e2e-tests/expenses/09-edit-expense.spec.ts e2e-tests/expenses/10-edit-with-new-items.spec.ts e2e-tests/expenses/11-delete-expense.spec.ts
```

```output
e2e-tests/expenses/09-edit-expense.spec.ts:4
e2e-tests/expenses/10-edit-with-new-items.spec.ts:3
e2e-tests/expenses/11-delete-expense.spec.ts:3
```
