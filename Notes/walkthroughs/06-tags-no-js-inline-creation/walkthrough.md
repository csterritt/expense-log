# Issue 06: Tags (no-JS CSV) + inline tag creation

*2026-04-27T00:24:16Z by Showboat 0.6.1*
<!-- showboat-id: 62a25298-91df-49b4-ae08-3a0b81c772a5 -->

This walkthrough demonstrates Issue 06: tags on expenses (no-JS CSV path) plus inline tag creation. Adds a comma-separated tags input to the entry form, wires up case-insensitive de-duplication and length validation in a new `parseTagCsv` validator, generalises the Issue 05 confirmation page to a 'Confirm new items' view that lists every new name (categories + tags) the submission would create, and atomically creates everything in a single `db.batch` on Confirm. Cancel preserves every typed value — including the raw tag CSV — byte-for-byte.

## 1. parseTagCsv — split, trim, lower-case, de-dup, length-check

The validator splits on comma, drops empty-after-trim entries, lower-cases survivors, and silently de-duplicates while preserving first-appearance order. Any kept entry exceeding tagNameMax surfaces a single user-facing error suitable for the 'tags' field block.

```bash
sed -n '258,290p' src/lib/expense-validators.ts
```

```output
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
  const raw = typeof input === 'string' ? input : ''
  const seen = new Set<string>()
  const result: string[] = []
  for (const piece of raw.split(',')) {
    const trimmed = piece.trim()
    if (trimmed.length === 0) {
      continue
    }
    if (trimmed.length > tagNameMax) {
      return Result.err(`Tag names must be at most ${tagNameMax} characters.`)
    }
    const lowered = trimmed.toLowerCase()
    if (seen.has(lowered)) {
      continue
    }
    seen.add(lowered)
    result.push(lowered)
  }
  return Result.ok(result)
}
```

Unit tests pin the contract: empty CSV → ok([]), simple two-tag, case-insensitive de-dup, per-entry trim, single over-max rejection, mixed-list over-max rejection, all-empty CSV → [], exactly-max-length pass.

```bash
cd tests && bun test expense-validators.spec.ts 2>&1 | tail -8
```

```output
(pass) parseExpenseCreate > parseTagCsv > returns ok([]) for an all-empty CSV
(pass) parseExpenseCreate > parseTagCsv > accepts exactly tagNameMax characters
(pass) parseExpenseCreate > multi-field failure > reports errors for every invalid field at once
(pass) parseExpenseCreate > multi-field failure > preserves valid fields passing while invalid ones fail

 36 pass
 0 fail
Ran 36 tests across 1 file. [55.00ms]
```

## 2. DB helpers — find tags + atomic combined create

`findTagsByNames` runs a single case-insensitive `IN (...)` lookup after lower-casing/trimming/de-duplicating the input. `createManyAndExpense` runs everything in a single `db.batch` so a unique-name collision rolls everything back.

```bash
sed -n '286,335p' src/lib/db/expense-access.ts
```

```output
export interface TagRow {
  id: string
  name: string
}

/**
 * Look up tags by name (case-insensitive). Empty / whitespace-only entries
 * are silently dropped; remaining names are trimmed, lower-cased, and
 * de-duplicated before issuing a single `IN (...)` query. An empty effective
 * list short-circuits to `Result.ok([])` without querying.
 *
 * @param db - Database instance
 * @param names - Tag names to look up (any case, leading/trailing whitespace
 *   allowed)
 */
export const findTagsByNames = (
  db: DrizzleClient,
  names: string[],
): Promise<Result<TagRow[], Error>> =>
  withRetry('findTagsByNames', () => findTagsByNamesActual(db, names))

const findTagsByNamesActual = async (
  db: DrizzleClient,
  names: string[],
): Promise<Result<TagRow[], Error>> => {
  try {
    const normalized = new Set<string>()
    for (const raw of names) {
      if (typeof raw !== 'string') {
        continue
      }
      const trimmed = raw.trim().toLowerCase()
      if (trimmed.length > 0) {
        normalized.add(trimmed)
      }
    }
    if (normalized.size === 0) {
      return Result.ok([])
    }
    const list = Array.from(normalized)
    const rows = await db
      .select({ id: tag.id, name: tag.name })
      .from(tag)
      .where(inArray(sql`lower(${tag.name})`, list))
    return Result.ok(rows)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

```

```bash
sed -n '440,510p' src/lib/db/expense-access.ts
```

```output

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

    // De-duplicate new tag names by lower-cased trim.
    const newTagNames = new Map<string, string>() // lowered -> id
    for (const raw of input.newTagNames) {
      if (typeof raw !== 'string') {
        continue
      }
      const lowered = raw.trim().toLowerCase()
      if (lowered.length === 0) {
        continue
      }
      if (!newTagNames.has(lowered)) {
        newTagNames.set(lowered, crypto.randomUUID())
      }
    }
    const createdTagIds: string[] = []
    for (const [name, id] of newTagNames.entries()) {
      createdTagIds.push(id)
      statements.push(
        db.insert(tag).values({ id, name, createdAt: now, updatedAt: now }),
      )
    }

    statements.push(
      db.insert(expense).values({
        id: expenseId,
        description: input.description,
        amountCents: input.amountCents,
        categoryId,
        date: input.date,
        createdAt: now,
        updatedAt: now,
      }),
    )

    // Combine existing + new tag ids, de-duplicated, and link each.
    const allTagIds = Array.from(new Set([...input.existingTagIds, ...createdTagIds]))
    for (const tagId of allTagIds) {
      statements.push(db.insert(expenseTag).values({ expenseId, tagId }))
    }

    await db.batch(statements as never)

    return Result.ok({ categoryId, expenseId, createdTagIds })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (/unique|constraint/i.test(message)) {
      return Result.err(
        new Error('One of the new names collides with an existing row. Please try again.'),
      )
    }
    return Result.err(e instanceof Error ? e : new Error(message))
  }
```

## 3. Routes — POST handlers

The entry-form POST runs both validators in one shot, looks up category + tags, computes the existing-vs-new diff, and routes to either `createExpenseWithTags` (all-existing direct path) or the generalised confirmation page (any-new path).

```bash
sed -n '372,476p' src/routes/expenses/build-expenses.tsx
```

```output
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
        return redirectWithFormErrors(c, PATHS.EXPENSES, errs, rawValues)
      }

      const db = createDbClient(c.env.PROJECT_DB)
      const lookup = await findCategoryByName(db, validated.value.category)
      if (lookup.isErr) {
        return redirectWithError(
          c,
          PATHS.EXPENSES,
          'Failed to save expense. Please try again.',
        )
      }

      const tagLookup = await findTagsByNames(db, tagParse.value)
      if (tagLookup.isErr) {
        return redirectWithError(
          c,
          PATHS.EXPENSES,
          'Failed to save expense. Please try again.',
        )
      }
      const existingTagByLower = new Map<string, { id: string; name: string }>()
      for (const row of tagLookup.value) {
        existingTagByLower.set(row.name.toLowerCase(), row)
      }
      const newTagNames: string[] = []
      const existingTagIds: string[] = []
      for (const lowered of tagParse.value) {
        const match = existingTagByLower.get(lowered)
        if (match) {
          existingTagIds.push(match.id)
        } else {
          newTagNames.push(lowered)
        }
      }

      const categoryIsNew = lookup.value === null
      const anyNew = categoryIsNew || newTagNames.length > 0

      if (!anyNew) {
        // Everything matches — create the expense (and link tags) directly.
        const createResult = await createExpenseWithTags(db, {
          description: validated.value.description,
          amountCents: validated.value.amountCents,
          date: validated.value.date,
          categoryId: lookup.value!.id,
          tagIds: existingTagIds,
        })
        if (createResult.isErr) {
          return redirectWithError(
            c,
            PATHS.EXPENSES,
            'Failed to save expense. Please try again.',
          )
        }
        return redirectWithMessage(c, PATHS.EXPENSES, 'Expense added.')
      }

      // Something is new — validate the new-category name when applicable.
      let normalizedNewCategory: string | null = null
      let finalCategoryName: string
      if (categoryIsNew) {
        const nameCheck = parseNewCategoryName(validated.value.category)
        if (nameCheck.isErr) {
          return redirectWithFormErrors(
            c,
            PATHS.EXPENSES,
            { category: nameCheck.error },
            rawValues,
          )
        }
        normalizedNewCategory = nameCheck.value.toLowerCase()
        finalCategoryName = normalizedNewCategory
      } else {
        finalCategoryName = lookup.value!.name
      }

      // Render the consolidated confirmation page. No DB writes yet.
      const sortedNewTags = newTagNames.slice().sort((a, b) => a.localeCompare(b))
      const finalTagNames = tagParse.value.slice().sort((a, b) => a.localeCompare(b))
      return c.render(
        useLayout(
          c,
          renderConfirmCreateNew({
            newCategoryName: normalizedNewCategory,
            finalCategoryName,
            newTagNames: sortedNewTags,
            finalTagNames,
            values: rawValues,
          }),
        ),
      )
    },
```

## 4. End-to-end — full flow under Playwright

The new spec covers every branch: mixed existing+new tags route through the confirmation page with case-insensitive de-duplication; brand-new category + new tags lists every new name first, takes the direct path on a follow-up; Cancel preserves the raw CSV; over-max tag names short-circuit with a tags field error; whitespace-only CSV creates the expense with no tags.

```bash
npx playwright test e2e-tests/expenses --reporter=line 2>&1 | tail -3
```

```output
[1A[2KDatabase cleared successfully

[1A[2K  21 passed (59.3s)
```
