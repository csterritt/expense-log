# Issue 07 — Progressive-enhancement JS code walkthrough

*2026-04-28T13:56:52Z by Showboat 0.6.1*
<!-- showboat-id: c9d6a320-d4a2-488c-ab51-cc94f481e5f5 -->

## Overview

Issue 07 layers a vanilla-JS category combobox and a tag chip picker on top of the no-JS server flow shipped in Issues 5 and 6. The server's request/response contract is unchanged: the category input still POSTs a single name, the tags input still POSTs a comma-separated CSV, and any brand-new name still routes through the consolidated 'confirm-create-new' page. The new modules are progressive enhancement only — with JS off the page is functionally identical to Issue 6.

## 1. JSON embed in the entry-form GET

The GET handler at `src/routes/expenses/build-expenses.tsx` now calls `listCategories` and `listTags` alongside `listExpenses` and renders two `<script type='application/json'>` blocks inside the form, with stable testids `categories-data` and `tags-data`. JSON is escaped with `<` → `\\u003c` (and `>` / `&` defensively) so a stray `</script>` inside a data field cannot break out of the script element.

```bash
sed -n '76,92p' src/routes/expenses/build-expenses.tsx
```

```output
// Serialize a JSON payload safely for embedding inside a <script> tag.
// Escaping `<` (and `>` / `&` defensively) prevents a stray `</script>`
// in any data field from breaking out of the script element.
const safeJsonForScript = (data: unknown): string =>
  JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')

type EntryPayloads = {
  categories: { name: string }[]
  tags: { name: string }[]
}

const renderEntryForm = (state: EntryFormState, payloads: EntryPayloads) => {
  const { fieldErrors, values } = state
  return (
```

```bash
sed -n '193,206p' src/routes/expenses/build-expenses.tsx
```

```output
      <script
        type='application/json'
        data-testid='categories-data'
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(payloads.categories) }}
      />
      <script
        type='application/json'
        data-testid='tags-data'
        dangerouslySetInnerHTML={{ __html: safeJsonForScript(payloads.tags) }}
      />
    </form>
  )
}

```

## 2. Activation hooks and script tags

The category input gains `data-category-combobox`; the tags input gains `data-tag-chip-picker`. At the end of the rendered tree the page emits `<script src='/js/category-combobox.js' defer>` and `<script src='/js/tag-chip-picker.js' defer>`. `renderer.tsx` is untouched, so other pages pay zero cost.

```bash
sed -n '153,182p' src/routes/expenses/build-expenses.tsx
```

```output
        <input
          id='expense-form-category'
          name='category'
          type='text'
          required
          maxLength={categoryNameMax + 50}
          className={inputClass('input input-bordered', !!fieldErrors.category)}
          data-testid='expense-form-category'
          data-category-combobox
          value={values.category ?? ''}
          placeholder='Type a category'
        />
        {fieldError('category', fieldErrors.category)}
      </div>
      <div className='flex flex-col md:col-span-5'>
        <label className='label' htmlFor='expense-form-tags'>
          <span className='label-text'>Tags (comma-separated)</span>
        </label>
        <input
          id='expense-form-tags'
          name='tags'
          type='text'
          maxLength={tagsCsvMax}
          className={inputClass('input input-bordered w-full', !!fieldErrors.tags)}
          data-testid='expense-form-tags'
          data-tag-chip-picker
          value={values.tags ?? ''}
          placeholder='e.g. food, groceries'
        />
        {fieldError('tags', fieldErrors.tags)}
```

```bash
sed -n '247,257p' src/routes/expenses/build-expenses.tsx
```

```output
      {rows.length === 0 ? (
        <p className='text-gray-600' data-testid='expenses-empty-state'>
          No expenses yet
        </p>
      ) : (
        renderExpenseTable(rows)
      )}
      <script src='/js/category-combobox.js' defer></script>
      <script src='/js/tag-chip-picker.js' defer></script>
    </div>
  )
```

## 3. listTags helper

A new `listTags` helper in `src/lib/db/expense-access.ts` mirrors `listCategories` exactly: a public `withRetry`-wrapped entry point delegating to a private actual function that runs a `SELECT id, name FROM tag ORDER BY lower(name) ASC`.

```bash
sed -n '336,356p' src/lib/db/expense-access.ts
```

```output
/**
 * List all tags sorted by case-insensitive `name ASC`.
 * @param db - Database instance
 * @returns Promise<Result<TagRow[], Error>>
 */
export const listTags = (db: DrizzleClient): Promise<Result<TagRow[], Error>> =>
  withRetry('listTags', () => listTagsActual(db))

const listTagsActual = async (
  db: DrizzleClient,
): Promise<Result<TagRow[], Error>> => {
  try {
    const rows = await db
      .select({ id: tag.id, name: tag.name })
      .from(tag)
      .orderBy(asc(sql`lower(${tag.name})`))
    return Result.ok(rows)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}
```

## 4. category-combobox.js — init and data load

The IIFE module finds every `[data-category-combobox]` input on `DOMContentLoaded`, reads the sibling `categories-data` JSON via `document.querySelector`, and attaches a controller (kept on a module-private `WeakMap`) per input. Safe to run with zero matching elements.

```bash
sed -n '15,45p' public/js/category-combobox.js
```

```output
;(() => {
  'use strict'

  const controllers = new WeakMap()
  let nextId = 0

  const slugify = (s) =>
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'x'

  const readCategories = () => {
    const node = document.querySelector('script[data-testid="categories-data"]')
    if (!node) {
      return []
    }
    try {
      const parsed = JSON.parse(node.textContent || '[]')
      if (!Array.isArray(parsed)) {
        return []
      }
      return parsed
        .map((row) => (row && typeof row.name === 'string' ? { name: row.name } : null))
        .filter((row) => row !== null)
    } catch (_e) {
      return []
    }
  }

  const filterMatches = (categories, typed) => {
```

```bash
sed -n '275,300p' public/js/category-combobox.js
```

```output
      getCategories: () => categories.slice(),
      open,
      close,
    }
  }

  const init = () => {
    const inputs = document.querySelectorAll('[data-category-combobox]')
    if (inputs.length === 0) {
      return
    }
    const categories = readCategories()
    for (const input of inputs) {
      if (controllers.has(input)) {
        continue
      }
      controllers.set(input, createController(input, categories))
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
```

## 5. category-combobox.js — render, filter, select, keyboard

`render()` uses `filterMatches` (case-insensitive substring) and shows a `Create '<typed>'` row when the typed value does not exact-match any category (also case-insensitive). `commitValue` writes the chosen / typed name verbatim into the underlying input so the form POST is byte-identical to the no-JS path. Keyboard handling: ArrowUp / ArrowDown wrap, Enter / Tab commit the active option, Escape closes.

```bash
sed -n '46,68p' public/js/category-combobox.js
```

```output
    const needle = typed.trim().toLowerCase()
    if (needle.length === 0) {
      return categories.slice()
    }
    return categories.filter((row) => row.name.toLowerCase().includes(needle))
  }

  const hasExactMatch = (categories, typed) => {
    const needle = typed.trim().toLowerCase()
    if (needle.length === 0) {
      return true
    }
    for (const row of categories) {
      if (row.name.toLowerCase() === needle) {
        return true
      }
    }
    return false
  }

  const createController = (input, categories) => {
    const id = `category-combobox-${nextId++}`
    const listId = `${id}-listbox`
```

```bash
sed -n '212,261p' public/js/category-combobox.js
```

```output
    input.addEventListener('input', () => {
      open()
    })

    input.addEventListener('blur', () => {
      // small timeout so click on option (mousedown handles preventDefault)
      setTimeout(() => {
        close()
      }, 0)
    })

    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowDown') {
        if (dropdown.hidden) {
          open()
        }
        ev.preventDefault()
        setActive(activeIndex + 1)
        return
      }
      if (ev.key === 'ArrowUp') {
        if (dropdown.hidden) {
          open()
        }
        ev.preventDefault()
        setActive(activeIndex - 1)
        return
      }
      if (ev.key === 'Escape') {
        if (!dropdown.hidden) {
          ev.preventDefault()
          close()
        }
        return
      }
      if (ev.key === 'Enter') {
        if (!dropdown.hidden && activeIndex >= 0 && currentRows[activeIndex]) {
          ev.preventDefault()
          commitValue(currentRows[activeIndex].name)
          close()
        }
        return
      }
      if (ev.key === 'Tab') {
        if (!dropdown.hidden && activeIndex >= 0 && currentRows[activeIndex]) {
          commitValue(currentRows[activeIndex].name)
        }
        close()
        return
      }
```

## 6. tag-chip-picker.js — chip surface and hidden-input sync

The module re-implements `parseTagCsv` locally (no shared client/server code), parses the input's existing `value` into an initial chip array, converts the original input to `type='hidden'`, and mounts a wrapper DOM around it: a chip surface, a separate search input, and an empty suggestions listbox. The hidden input's `value` is rewritten as a normalized CSV after every change so the form POST matches what the no-JS path would submit, byte-for-byte.

```bash
sed -n '29,49p' public/js/tag-chip-picker.js
```

```output
  // appearance. Kept in sync with src/lib/expense-validators.ts on purpose.
  const parseTagCsv = (input) => {
    const raw = typeof input === 'string' ? input : ''
    const seen = new Set()
    const result = []
    for (const piece of raw.split(',')) {
      const trimmed = piece.trim()
      if (trimmed.length === 0) {
        continue
      }
      const lowered = trimmed.toLowerCase()
      if (seen.has(lowered)) {
        continue
      }
      seen.add(lowered)
      result.push(lowered)
    }
    return result
  }

  const serializeChips = (chips) => chips.join(',')
```

```bash
sed -n '70,131p' public/js/tag-chip-picker.js
```

```output
    const id = `tag-chip-picker-${nextId++}`
    const listId = `${id}-listbox`

    // Initial chips parsed from current value.
    let chips = parseTagCsv(originalInput.value || '')

    // Build wrapper DOM around the original input.
    const wrapper = document.createElement('div')
    wrapper.className = 'flex flex-col gap-2 w-full'
    originalInput.parentNode.insertBefore(wrapper, originalInput)

    const surface = document.createElement('div')
    surface.setAttribute('data-testid', 'tag-chip-picker-surface')
    surface.className =
      'flex flex-wrap gap-1 items-center min-h-10 p-2 rounded-box border border-base-300 bg-base-100'

    const chipsContainer = document.createElement('div')
    chipsContainer.className = 'flex flex-wrap gap-1 items-center'
    surface.appendChild(chipsContainer)

    const searchWrap = document.createElement('div')
    searchWrap.className = 'relative w-full'

    const search = document.createElement('input')
    search.type = 'text'
    search.setAttribute('data-testid', 'tag-chip-picker-input')
    search.setAttribute('role', 'combobox')
    search.setAttribute('aria-autocomplete', 'list')
    search.setAttribute('aria-expanded', 'false')
    search.setAttribute('aria-controls', listId)
    search.setAttribute('aria-owns', listId)
    search.setAttribute('autocomplete', 'off')
    search.placeholder = 'Type to add a tag'
    search.className = 'input input-bordered w-full'
    searchWrap.appendChild(search)

    const suggestions = document.createElement('ul')
    suggestions.id = listId
    suggestions.setAttribute('role', 'listbox')
    suggestions.setAttribute('data-testid', 'tag-chip-picker-list')
    suggestions.hidden = true
    suggestions.className =
      'menu menu-sm bg-base-100 rounded-box shadow border border-base-300 z-50 absolute w-full max-h-60 overflow-auto p-1'
    searchWrap.appendChild(suggestions)

    wrapper.appendChild(surface)
    wrapper.appendChild(searchWrap)

    // Convert original input to hidden and move it inside the wrapper so
    // the form still picks it up.
    originalInput.type = 'hidden'
    originalInput.removeAttribute('placeholder')
    originalInput.value = serializeChips(chips)
    wrapper.appendChild(originalInput)

    let activeIndex = -1
    let currentRows = []

    const setExpanded = (open) => {
      search.setAttribute('aria-expanded', open ? 'true' : 'false')
      suggestions.hidden = !open
    }
```

## 7. tag-chip-picker.js — chips, suggestions, add, remove, keyboard

Chip rendering builds each chip via `textContent` only (never `innerHTML`), so tag names are safe against injection. Suggestions filter the embedded tag list by case-insensitive substring and exclude already-selected chips; a `Create '<typed>'` row appears for unrecognized values. Chips are added on Enter, Comma, or click; removed via the chip's × button or Backspace at empty-search.

```bash
sed -n '133,165p' public/js/tag-chip-picker.js
```

```output
    const syncHidden = () => {
      originalInput.value = serializeChips(chips)
    }

    const renderChips = () => {
      chipsContainer.textContent = ''
      for (const name of chips) {
        const chip = document.createElement('span')
        chip.setAttribute('data-testid', `tag-chip-${slugify(name)}`)
        chip.className = 'badge badge-primary gap-1 py-3'
        const label = document.createElement('span')
        label.textContent = name
        chip.appendChild(label)
        const remove = document.createElement('button')
        remove.type = 'button'
        remove.setAttribute('data-testid', `tag-chip-${slugify(name)}-remove`)
        remove.setAttribute('aria-label', `Remove ${name}`)
        remove.className = 'btn btn-xs btn-ghost btn-circle'
        remove.textContent = '×'
        remove.addEventListener('click', () => {
          removeChip(name)
        })
        chip.appendChild(remove)
        chipsContainer.appendChild(chip)
      }
    }

    const clearActive = () => {
      activeIndex = -1
      search.removeAttribute('aria-activedescendant')
      const prev = suggestions.querySelectorAll('[data-active="true"]')
      for (const el of prev) {
        el.setAttribute('data-active', 'false')
```

```bash
sed -n '252,295p' public/js/tag-chip-picker.js
```

```output
      }

      activeIndex = -1
      search.removeAttribute('aria-activedescendant')
    }

    const addChip = (rawName) => {
      const lowered = String(rawName || '').trim().toLowerCase()
      if (lowered.length === 0) {
        return
      }
      if (chips.includes(lowered)) {
        return
      }
      chips.push(lowered)
      syncHidden()
      renderChips()
      search.value = ''
      renderSuggestions()
      setExpanded(true)
      search.focus()
    }

    const removeChip = (name) => {
      const idx = chips.indexOf(name)
      if (idx === -1) {
        return
      }
      chips.splice(idx, 1)
      syncHidden()
      renderChips()
      renderSuggestions()
    }

    const open = () => {
      renderSuggestions()
      setExpanded(true)
    }

    const close = () => {
      setExpanded(false)
      clearActive()
    }

```

```bash
sed -n '305,361p' public/js/tag-chip-picker.js
```

```output
      setTimeout(() => {
        close()
      }, 0)
    })

    search.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowDown') {
        if (suggestions.hidden) {
          open()
        }
        ev.preventDefault()
        setActive(activeIndex + 1)
        return
      }
      if (ev.key === 'ArrowUp') {
        if (suggestions.hidden) {
          open()
        }
        ev.preventDefault()
        setActive(activeIndex - 1)
        return
      }
      if (ev.key === 'Escape') {
        if (!suggestions.hidden) {
          ev.preventDefault()
          close()
        }
        return
      }
      if (ev.key === 'Enter' || ev.key === ',') {
        ev.preventDefault()
        if (!suggestions.hidden && activeIndex >= 0 && currentRows[activeIndex]) {
          addChip(currentRows[activeIndex].name)
          return
        }
        const typed = search.value.trim()
        if (typed.length > 0) {
          addChip(typed)
        }
        return
      }
      if (ev.key === 'Backspace') {
        if (search.value.length === 0 && chips.length > 0) {
          ev.preventDefault()
          removeChip(chips[chips.length - 1])
        }
        return
      }
    })

    document.addEventListener('mousedown', (ev) => {
      if (!wrapper.contains(ev.target)) {
        close()
      }
    })

    // Initial paint.
```

## 8. JS-on vs JS-off equivalence

The progressive-enhancement guarantee is straightforward: with JS off neither module mounts; the category and tags inputs remain plain `<input type='text'>` controls; the form posts the exact same fields. The Issue 5 / 6 server flow handles the submission unchanged. The `08-no-js-fallback.spec.ts` Playwright spec proves this end-to-end by running the same flows in a context built with `browser.newContext({ javaScriptEnabled: false })`.

```bash
sed -n '15,55p' e2e-tests/expenses/08-no-js-fallback.spec.ts
```

```output
test.describe('JS-disabled fallback (Issue 5/6 server flow untouched)', () => {
  test('all-existing values submit directly; new values route through confirmation', async ({
    browser,
  }) => {
    // The default `testWithDatabase` helper only exposes `page`, but here
    // we need `browser` to build a JS-disabled context. Manage the DB
    // lifecycle inline instead.
    await clearDatabase()
    await seedDatabase()
    await clearSessions()
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()

    try {
      await seedExpenses([
          {
            date: todayEt(),
            description: 'seed',
            amountCents: 100,
            categoryName: 'food',
            tagNames: ['groceries'],
          },
        ])

        await page.goto(BASE_URLS.SIGN_IN)
        await submitSignInForm(page, TEST_USERS.KNOWN_USER)
        await page.goto(BASE_URLS.EXPENSES)

        // No combobox dropdown / chip surface should mount when JS is off.
        await page.getByTestId('expense-form-category').focus()
        await expect(page.getByTestId('category-combobox-dropdown')).toHaveCount(0)
        await expect(page.getByTestId('tag-chip-picker-surface')).toHaveCount(0)

        // The category and tags inputs should remain plain text inputs.
        await expect(page.getByTestId('expense-form-category')).toHaveAttribute('type', 'text')
        await expect(page.getByTestId('expense-form-tags')).toHaveAttribute('type', 'text')

        // All-existing submission goes straight to /expenses with no
        // confirmation page.
        await page.getByTestId('expense-form-description').fill('Plain submit')
        await page.getByTestId('expense-form-amount').fill('3.50')
```

## Files touched

- WRITE: `src/lib/db/expense-access.ts` (new `listTags` helper).
- WRITE: `src/routes/expenses/build-expenses.tsx` (JSON embeds, data-attribute hooks, deferred script tags).
- WRITE: `public/js/category-combobox.js` (new module).
- WRITE: `public/js/tag-chip-picker.js` (new module).
- TEST:  `tests/expense-access.spec.ts` (header-only — DB-level tests deferred to e2e per Issue 05 / 06 pattern).
- TEST:  `e2e-tests/expenses/06-category-combobox-js.spec.ts` (JS-on combobox flow).
- TEST:  `e2e-tests/expenses/07-tag-chip-picker-js.spec.ts` (JS-on chip-picker flow).
- TEST:  `e2e-tests/expenses/08-no-js-fallback.spec.ts` (JS-off fallback smoke).
- DOC:   `Notes/wiki/public-js/index.md` (new), `Notes/wiki/index.md`, `Notes/wiki/source-code.md`, `Notes/wiki/log.md` updates.
