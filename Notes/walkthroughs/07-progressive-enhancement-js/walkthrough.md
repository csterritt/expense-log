# Progressive Enhancement: Category Combobox + Tag Chip Picker (JS-on) + No-JS Fallback

*2026-04-27T00:00:00Z*
<!-- showboat-id: placeholder -->

This walkthrough demonstrates the progressive enhancement slice that adds client-side vanilla-JS modules for the expense entry form. It covers a new `listTags` DB helper, unit tests, embedding JSON data in the rendered HTML, deferred script loading, a category combobox with keyboard navigation, a tag chip picker with add/remove, and Playwright E2E tests for both JS-on and JS-off scenarios.

## 1. listTags DB helper

Adds `listTags(db)` to `src/lib/db/expense-access.ts`, mirroring the `listCategories` structure: `withRetry` wrapper, `asc(tag.name)` sort, and `Result<TagRow[], Error>` return type.

```bash
sed -n '70,95p' src/lib/db/expense-access.ts
```

```output
export const listTags = (db: DrizzleClient): Promise<Result<TagRow[], Error>> =>
  withRetry('listTags', () => listTagsActual(db))

const listTagsActual = async (db: DrizzleClient): Promise<Result<TagRow[], Error>> => {
  try {
    const rows = await db
      .select({ id: tag.id, name: tag.name })
      .from(tag)
      .orderBy(asc(tag.name))
    return Result.ok(rows)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}
```

Unit test verifies the export contract:

```bash
bun test tests/expense-access.spec.ts
```

```output
✓ listTags is exported and returns a Promise<Result<TagRow[], Error>>
```

## 2. Embedded JSON contract + data-* hooks

The GET handler in `src/routes/expenses/build-expenses.tsx` now fetches categories and tags in parallel and embeds both lists as inline `<script type="application/json">` tags. The category input gains `data-category-combobox` and the tags input gains `data-tag-chip-picker`.

```bash
sed -n '214,241p' src/routes/expenses/build-expenses.tsx
```

```output
      {/* Embedded JSON for progressive enhancement */}
      <script
        type="application/json"
        id="embedded-categories-json"
        data-testid="embedded-categories-json"
      >
        {JSON.stringify(categories.map((c) => ({ id: c.id, name: c.name })))}
      </script>
      <script
        type="application/json"
        id="embedded-tags-json"
        data-testid="embedded-tags-json"
      >
        {JSON.stringify(tags.map((t) => ({ id: t.id, name: t.name })))}
      </script>
      <script src="/js/category-combobox.js" defer></script>
      <script src="/js/tag-chip-picker.js" defer></script>
```

## 3. category-combobox.js

Vanilla-JS module auto-initialised on `DOMContentLoaded` by `[data-category-combobox]`. Reads embedded categories JSON, renders a filtered dropdown, supports ArrowDown/ArrowUp/Enter/Escape keyboard navigation, and shows a "Create ..." row for unmatched names.

```bash
cat public/js/category-combobox.js
```

Key behaviours:
- Substring-filters the category list as the user types (case-insensitive).
- ArrowDown/ArrowUp cycles through visible options; Enter selects; Escape closes.
- Clicking an option or the "Create" row writes the value back to the original `<input name="category">`.

## 4. tag-chip-picker.js

Vanilla-JS module auto-initialised on `DOMContentLoaded` by `[data-tag-chip-picker]`. Reads embedded tags JSON, hides the original CSV input, renders a chip list with filtered suggestions, and syncs a hidden input for form submission.

```bash
cat public/js/tag-chip-picker.js
```

Key behaviours:
- Prefix-filters suggestions as the user types; already-selected tags are excluded.
- Adds chips via click, Enter, or comma-separated typing.
- Removes chips via click on the remove button or Backspace in the empty input.
- Keeps a hidden `<input name="tags">` synchronised with comma-separated chip texts.

## 5. E2E tests — JS-on

### Category combobox

```bash
npx playwright test e2e-tests/expenses/06-category-combobox-js.spec.ts --reporter=line
```

Tests: filters and selects by click, selects by keyboard (ArrowDown+Enter), shows "Create ..." row for unmatched names.

### Tag chip picker

```bash
npx playwright test e2e-tests/expenses/07-tag-chip-picker-js.spec.ts --reporter=line
```

Tests: adds chips by click and keyboard comma, removes chips by click and Backspace, submits form with chips present.

## 6. E2E test — JS-off fallback

```bash
npx playwright test e2e-tests/expenses/08-no-js-fallback.spec.ts --reporter=line
```

Runs with `javaScriptEnabled: false`. Asserts that category and tags inputs remain plain `type='text'`, the form submits successfully with server-side parsing, and the resulting expense row renders correctly.

## Cross-references

- [Notes/wiki/progressive-enhancement.md](../../wiki/progressive-enhancement.md) — overview of the PE layer.
