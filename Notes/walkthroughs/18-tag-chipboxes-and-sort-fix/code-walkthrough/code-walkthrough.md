# Issue 18: Tag Chip-Checkbox UI Everywhere + Chronological Sort — Code Walkthrough

*2026-06-13T21:29:49Z by Showboat 0.6.1*
<!-- showboat-id: d91d497d-ba16-49b7-98f2-952124a0c0a8 -->

This walkthrough covers the Issue 18 implementation: the shared tag chip-checkbox component, the server-authoritative tag-input validator, chronological time-period sort on Summary, hardened confirmation handlers with race-tolerant reuse, and the progressive-enhancement client JS. The implementation spans ~15 source files and touches every mutation form (entry, edit, recurring create, recurring edit) plus both filter pages (list filter, summary filter).

## 1. Shared Tag Chip-Checkbox Component

The core of Issue 18 is the `TagChipCheckboxes` component at `src/components/tag-chip-checkboxes.tsx`. It renders native server-rendered checkboxes styled as DaisyUI badge chips, sorted alphabetically (case-insensitive). The component serves both mutation forms (with `allowNewTags=true`) and filter forms (with `allowNewTags=false`).

```bash
echo '=== Component exports ===' && head -12 src/components/tag-chip-checkboxes.tsx | tail -5 && echo '' && echo '=== Empty-tag-list behavior (mutation form) ===' && sed -n '33,51p' src/components/tag-chip-checkboxes.tsx && echo '' && echo '=== Chip rendering loop ===' && sed -n '56,76p' src/components/tag-chip-checkboxes.tsx
```

```output
=== Component exports ===
 */

export const CHIP_CLASS_BASE = 'badge badge-outline cursor-pointer'
export const CHIP_CLASS_SELECTED = 'badge badge-primary cursor-pointer'


=== Empty-tag-list behavior (mutation form) ===
  if (sorted.length === 0) {
    if (!allowNewTags) {
      return <></>
    }
    return (
      <div className='flex flex-col gap-2'>
        <p className='text-sm text-base-content/60'>No tags yet.</p>
        <input
          type='text'
          name='newTags'
          className='input input-bordered w-full'
          placeholder='New tag names (comma or space separated)'
          value={newTagsValue}
          aria-label='New tag names'
          data-testid='new-tags-input'
        />
      </div>
    )
  }

=== Chip rendering loop ===
        {sorted.map((tag) => {
          const isSelected = selectedTagIds.has(tag.id)
          return (
            <label
              key={tag.id}
              className={`label cursor-pointer gap-1 ${isSelected ? CHIP_CLASS_SELECTED : CHIP_CLASS_BASE}`}
              data-testid={`tag-chip-${tag.name}`}
            >
              <input
                type='checkbox'
                name='tagId'
                value={tag.id}
                checked={isSelected}
                className='checkbox checkbox-sm'
                aria-label={tag.name}
              />
              <span className='label-text'>{tag.name}</span>
            </label>
          )
        })}
      </div>
```

## 2. Client-Side Progressive Enhancement

The companion JS file at `public/js/tag-chip-checkboxes.js` provides two enhancements: (a) reflecting `:checked` state via a class hook, and (b) optimistically rendering typed `newTags` tokens as chip previews. Both `CHIP_CLASS_BASE` and `CHIP_CLASS_SELECTED` are duplicated as named constants in both files — a parity test ensures they stay in sync.

```bash
echo '=== Security contract in JS ===' && sed -n '29,37p' public/js/tag-chip-checkboxes.js && echo '' && echo '=== Optimistic chip rendering (textContent only) ===' && sed -n '97,107p' public/js/tag-chip-checkboxes.js
```

```output
=== Security contract in JS ===
  /**
   * Safe setAttribute: only allows class, aria-label, and data-* attributes.
   * User-controlled values must never be used as attribute names.
   */
  const safeSetAttribute = (el, name, value) => {
    if (name === 'class' || name === 'aria-label' || name.startsWith('data-')) {
      el.setAttribute(name, value)
    }
  }

=== Optimistic chip rendering (textContent only) ===
  const renderOptimisticChips = (previewContainer, tokens) => {
    previewContainer.textContent = ''
    for (const token of tokens) {
      const chip = document.createElement('span')
      safeSetAttribute(chip, 'class', `${CHIP_CLASS_SELECTED} opacity-70`)
      safeSetAttribute(chip, 'aria-label', token)
      safeSetAttribute(chip, 'data-testid', 'new-tag-preview-chip')
      chip.textContent = token
      previewContainer.appendChild(chip)
    }
  }
```

## 3. Server-Authoritative Tag-Input Validator

The `parseTagInputs` function in `src/lib/expense-validators.ts` replaces the old CSV-based tag input. It applies a strict pipeline: ULID syntactic check → raw-count cap → newTags length/token caps → token regex validation → existing-tag collision normalization. This ensures no invalid IDs reach the database and no DB lookup is needed for syntactically-invalid inputs.

```bash
echo '=== Module-level constants ===' && sed -n '608,614p' src/lib/expense-validators.ts && echo '' && echo '=== ULID validation ===' && sed -n '650,662p' src/lib/expense-validators.ts && echo '' && echo '=== parseTagInputs signature ===' && sed -n '670,671p' src/lib/expense-validators.ts
```

```output
=== Module-level constants ===
export const TAG_ID_RAW_CAP = 64
export const NEW_TAGS_RAW_LENGTH_CAP = 500
export const NEW_TAGS_TOKEN_COUNT_CAP = 32

const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/
const NEW_TAG_TOKEN_REGEX = /^[a-z0-9_-]{1,20}$/


=== ULID validation ===
const isValidUlid = (value: string): boolean => ULID_REGEX.test(value)

const filterSyntacticUlids = (rawIds: string[]): string[] => {
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of rawIds) {
    if (isValidUlid(id) && !seen.has(id)) {
      seen.add(id)
      result.push(id)
    }
  }
  return result
}

=== parseTagInputs signature ===
export const parseTagInputs = (raw: RawTagInputs, existingTags: ExistingTag[]): ParsedTagInputs => {
  const fieldErrors: FieldErrors = {}
```

## 4. Dimension-Aware Sort Allow-List

The `parseSummaryQuery` validator was updated with a dimension-aware sort allow-list. Invalid sort columns (e.g. `sort=tag` when `dimension=category`) are silently ignored rather than producing errors, so the page always renders with defaults.

```bash
echo '=== Dimension-aware sort columns ===' && sed -n '1085,1092p' src/lib/expense-validators.ts && echo '' && echo '=== Sort validation in parseSummaryQuery ===' && sed -n '1181,1207p' src/lib/expense-validators.ts
```

```output
=== Dimension-aware sort columns ===
const VALID_SORT_COLUMNS_ALWAYS = ['timePeriod', 'count', 'total'] as const

const DIMENSION_EXTRA_SORT_COLUMNS: Record<string, readonly string[]> = {
  time: [],
  category: ['category'],
  tag: ['tag'],
  'category-tag': ['category', 'tag'],
}

=== Sort validation in parseSummaryQuery ===
  const validSortColumnsForDimension: readonly string[] = [
    ...VALID_SORT_COLUMNS_ALWAYS,
    ...(DIMENSION_EXTRA_SORT_COLUMNS[dimension] ?? []),
  ]

  const sortRaw = raw.sort
  const rawSortParams: string[] = Array.isArray(sortRaw)
    ? sortRaw
    : typeof sortRaw === 'string'
      ? [sortRaw]
      : []
  const sort: SummarySortEntry[] = []
  for (const param of rawSortParams) {
    const colonIdx = param.lastIndexOf(':')
    if (colonIdx < 1) {
      continue
    }
    const column = param.slice(0, colonIdx).trim()
    const direction = param.slice(colonIdx + 1).trim()
    if (!validSortColumnsForDimension.includes(column)) {
      continue
    }
    if (direction !== 'asc' && direction !== 'desc') {
      continue
    }
    sort.push({ column, direction })
  }
```

## 5. Chronological Sort in Summary Access

The `summarize` function in `src/lib/db/summary-access.ts` carries an internal `timePeriodKey` alongside each row's rendered label. Month rows use `year * 100 + monthIndex`, quarter rows use `year * 10 + quarterIndex`, and year rows use the year itself. The rendered label is never compared for sorting — only the internal key is used via the `chronoCmp` helper.

```bash
echo '=== timePeriodOf helper ===' && sed -n '58,71p' src/lib/db/summary-access.ts && echo '' && echo '=== chronoCmp tie-break ===' && sed -n '108,109p' src/lib/db/summary-access.ts && echo '' && echo '=== Default sort with chronoCmp ===' && sed -n '247,254p' src/lib/db/summary-access.ts && echo '' && echo '=== et-date chronological keys ===' && sed -n '109,142p' src/lib/et-date.ts
```

```output
=== timePeriodOf helper ===
/** Internal chronological sort key paired with the rendered label. */
type TimePeriodResult = { key: number; label: string }

/** Return the `{ key, label }` pair for `ymd` under the given granularity. */
const timePeriodOf = (ymd: string, granularity: SummaryGranularity): TimePeriodResult => {
  if (granularity === 'year') {
    const y = parseInt(yearKeyEt(ymd), 10)
    return { key: y, label: String(y) }
  }
  if (granularity === 'quarter') {
    return { key: quarterChronKeyEt(ymd), label: quarterLabelEt(ymd) }
  }
  return { key: monthChronKeyEt(ymd), label: monthLabelEt(ymd) }
}

=== chronoCmp tie-break ===
/** Ascending chronological tie-break on the internal key. */
const chronoCmp = (a: MutableRow, b: MutableRow): number => a.timePeriodKey - b.timePeriodKey

=== Default sort with chronoCmp ===
    } else {
      mutableRows.sort((a, b) => {
        const catCmp = (a.categoryName ?? '').localeCompare(b.categoryName ?? '')
        if (catCmp !== 0) return catCmp
        const tagCmp = (a.tagName ?? '').localeCompare(b.tagName ?? '')
        if (tagCmp !== 0) return tagCmp
        return chronoCmp(a, b)
      })

=== et-date chronological keys ===
export const monthChronKeyEt = (ymd: string): number => {
  const month = parsedMonth(ymd)
  const year = parseInt(ymd.slice(0, 4), 10)
  return year * 100 + (month - 1)
}

/**
 * Returns the calendar-quarter label `Mmm-Mmm` for a `YYYY-MM-DD` ET-anchored
 * date string (one of `'Jan-Mar'`, `'Apr-Jun'`, `'Jul-Sep'`, `'Oct-Dec'`).
 */
export const quarterKeyEt = (ymd: string): string => {
  const month = parsedMonth(ymd)
  return QUARTER_LABELS[Math.ceil(month / 3) - 1]
}

/**
 * Returns the `Mmm-Mmm YYYY` quarter label for a `YYYY-MM-DD` ET-anchored
 * date string (e.g. `'Jan-Mar 2026'`).
 */
export const quarterLabelEt = (ymd: string): string => {
  const month = parsedMonth(ymd)
  const year = ymd.slice(0, 4)
  return `${QUARTER_LABELS[Math.ceil(month / 3) - 1]} ${year}`
}

/**
 * Returns the numeric chronological key `year * 10 + quarterIndex` (0-based)
 * for a `YYYY-MM-DD` date, used to sort quarter rows across year boundaries.
 */
export const quarterChronKeyEt = (ymd: string): number => {
  const month = parsedMonth(ymd)
  const year = parseInt(ymd.slice(0, 4), 10)
  return year * 10 + (Math.ceil(month / 3) - 1)
}
```

## 6. Race-Tolerant Confirmation Handlers

All three confirmation handlers (expense create, recurring create, recurring edit) use the shared `resolveConfirmTagsAndCategory` pipeline from `src/lib/db/confirm-helpers.ts`. This pipeline fetches the full tag list, parses inputs via `parseTagInputs`, looks up the category, and validates new-category names — all before any DB writes. The actual create-or-reuse operations use `createOrReuseTag` and `createOrReuseCategory`, which silently handle unique-constraint races.

```bash
echo '=== Race-tolerant createOrReuseTag ===' && sed -n '54,96p' src/lib/db/confirm-helpers.ts && echo '' && echo '=== resolveConfirmTagsAndCategory pipeline ===' && sed -n '194,253p' src/lib/db/confirm-helpers.ts
```

```output
=== Race-tolerant createOrReuseTag ===
const createOrReuseTagActual = async (
  db: DrizzleClient,
  rawName: string,
): Promise<Result<TagRow, Error>> => {
  try {
    const name = rawName.trim().toLowerCase()
    if (name.length === 0) {
      return Result.err(new Error('Tag name is required.'))
    }

    const existing = await db
      .select({ id: tag.id, name: tag.name })
      .from(tag)
      .where(sql`lower(${tag.name}) = ${name}`)
      .limit(1)

    if (existing.length > 0) {
      return Result.ok({ id: existing[0]!.id, name: existing[0]!.name })
    }

    const id = ulid()
    const now = new Date()
    try {
      await db.insert(tag).values({ id, name, createdAt: now, updatedAt: now })
      return Result.ok({ id, name })
    } catch (insertErr) {
      const msg = insertErr instanceof Error ? insertErr.message : String(insertErr)
      if (/unique|constraint/i.test(msg)) {
        const race = await db
          .select({ id: tag.id, name: tag.name })
          .from(tag)
          .where(sql`lower(${tag.name}) = ${name}`)
          .limit(1)
        if (race.length > 0) {
          return Result.ok({ id: race[0]!.id, name: race[0]!.name })
        }
      }
      return Result.err(insertErr instanceof Error ? insertErr : new Error(msg))
    }
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}

=== resolveConfirmTagsAndCategory pipeline ===
export const resolveConfirmTagsAndCategory = async (
  db: DrizzleClient,
  tagIds: string[],
  newTagsRaw: string,
  categoryName: string,
): Promise<ResolvedConfirmItems> => {
  const allTagsResult = await listTags(db)
  if (allTagsResult.isErr) {
    return { ok: false, kind: 'tag-list-error' }
  }

  const tagInputParse = parseTagInputs(
    { tagId: tagIds, newTags: newTagsRaw },
    allTagsResult.value,
  )
  if (Object.keys(tagInputParse.fieldErrors).length > 0) {
    return {
      ok: false,
      kind: 'tag-input-error',
      fieldErrors: tagInputParse.fieldErrors,
      rawNewTagsPreserved: tagInputParse.rawNewTagsPreserved,
    }
  }

  const existingTagIds = tagInputParse.tagIds
  const newTagNames = tagInputParse.newTags
  const rawNewTagsPreserved = tagInputParse.rawNewTagsPreserved

  const lookup = await findCategoryByName(db, categoryName)
  if (lookup.isErr) {
    return { ok: false, kind: 'category-lookup-error' }
  }

  if (lookup.value !== null) {
    return {
      ok: true,
      existingTagIds,
      newTagNames,
      rawNewTagsPreserved,
      existingCategoryId: lookup.value.id,
      newCategoryName: null,
      existingCategoryName: lookup.value.name,
    }
  }

  const nameCheck = parseNewCategoryName(categoryName)
  if (nameCheck.isErr) {
    return { ok: false, kind: 'new-category-name-error', message: nameCheck.error }
  }

  return {
    ok: true,
    existingTagIds,
    newTagNames,
    rawNewTagsPreserved,
    existingCategoryId: null,
    newCategoryName: nameCheck.value,
    existingCategoryName: null,
  }
}
```

## 7. Form Wiring Summary

Every mutation form now uses the shared `TagChipCheckboxes` component with `allowNewTags=true`:

- **Entry form** (`expense-form.tsx`): replaces CSV `tags` text input, loads `tag-chip-checkboxes.js`
- **Edit form** (`build-edit-expense.tsx`): pre-existing tag attachments render as selected chips
- **Recurring create** (`build-create-recurring.tsx`): same pattern as entry
- **Recurring edit** (`build-edit-recurring.tsx`): pre-existing attachments render selected, toggled-off chips detach

Filter forms use `allowNewTags=false`:
- **List filter** (`expense-list-renderer.tsx`): tag chips with AND/OR mode radio
- **Summary filter** (`build-summary.tsx`): tag chips with AND semantics note

All POST handlers consume `parseTagInputs` for server-authoritative tag validation, and all confirmation handlers use the shared `resolveConfirmTagsAndCategory` pipeline.

## 8. Summary of Key Design Decisions

1. **Server-authoritative tag validation**: ULID syntactic check + raw-count cap happen before any DB lookup. Invalid IDs never reach listTagsByIds.
2. **Collision normalization**: new-tag tokens matching existing tag names are folded into the tagIds set — no duplicate creation.
3. **Progressive enhancement**: native checkboxes work with JS disabled; the JS module adds optimistic previews and class-reflection only.
4. **Chronological sort**: internal numeric keys (year * 100 + monthIndex) ensure correct cross-year ordering without label comparison.
5. **Race-tolerant confirmation**: createOrReuseTag/createOrReuseCategory handle concurrent-writer races at the DB constraint level.
6. **Dimension-aware sort**: invalid sort columns are silently ignored, not errored — the page always renders.
