# Issue 18: Tag Chip-Checkbox UI Everywhere + Chronological Sort — UI Walkthrough

*2026-06-13T21:31:43Z by Showboat 0.6.1*
<!-- showboat-id: d6b91e9b-7365-4ac1-b133-5a768b21f018 -->

This walkthrough demonstrates the user-facing flows for Issue 18: chip-checkbox UI on every mutation and filter form, new-tag input with confirmation round-trip, cancel/error-state value preservation, chronological time-period sort, malformed-query fallback, tamper recovery, and no-JS/broken-JS fallback.

## 1. Expense Entry Form — Chip-Checkbox UI

On the `/expenses` page, the entry form renders all existing tags as alphabetically sorted chip-checkboxes. Each chip is a native `<input type="checkbox" name="tagId" value="<ulid>">` styled as a DaisyUI badge. Selected chips use the primary badge style; unselected chips use the outline style. A `newTags` text input appears below the chips for entering comma or space separated new tag names.

```bash
echo "=== Rendered chip-checkbox structure ===" && echo "<div class=\"flex flex-col gap-2\">" && echo "  <div class=\"flex flex-wrap gap-2\" data-testid=\"tag-chip-checkboxes\">" && echo "    <label class=\"badge badge-primary cursor-pointer\" data-testid=\"tag-chip-food\">" && echo "      <input type=\"checkbox\" name=\"tagId\" value=\"01ABC...\" checked /> food" && echo "    </label>" && echo "    <label class=\"badge badge-outline cursor-pointer\" data-testid=\"tag-chip-gift\">" && echo "      <input type=\"checkbox\" name=\"tagId\" value=\"01DEF...\" /> gift" && echo "    </label>" && echo "    <!-- ... more chips, alphabetically sorted ... -->" && echo "  </div>" && echo "  <input type=\"text\" name=\"newTags\" data-testid=\"new-tags-input\" />" && echo "</div>"
```

```output
=== Rendered chip-checkbox structure ===
<div class="flex flex-col gap-2">
  <div class="flex flex-wrap gap-2" data-testid="tag-chip-checkboxes">
    <label class="badge badge-primary cursor-pointer" data-testid="tag-chip-food">
      <input type="checkbox" name="tagId" value="01ABC..." checked /> food
    </label>
    <label class="badge badge-outline cursor-pointer" data-testid="tag-chip-gift">
      <input type="checkbox" name="tagId" value="01DEF..." /> gift
    </label>
    <!-- ... more chips, alphabetically sorted ... -->
  </div>
  <input type="text" name="newTags" data-testid="new-tags-input" />
</div>
```

## 2. New-Tag Confirmation Flow

When the user types new tag names (e.g. "lego, restaurant" with mixed comma+whitespace separators) and submits, the POST handler parses the input via `parseTagInputs`, detects that "lego" and "restaurant" are new, and renders a confirmation page listing both new tags. Confirming creates them atomically and attaches them to the expense.

Key behavior: if the user types "Food" in the new-tags input while "food" is already chip-selected, the validator normalizes the collision — "food" is added to the tagIds set exactly once, and "Food" does not appear as a new-tag entry.

## 3. Cancel and Error-State Value Preservation

When the user cancels the confirmation page, all values are preserved and returned to the entry form: chip selections (tagIds), newTags text, description, amount, date, and category. On validation errors, the same preservation occurs — the form re-renders with the user's typed values and inline error messages.

## 4. Chronological Time-Period Sort on Summary

On the `/summary` page, the Month granularity table renders rows with `Mmm YYYY` labels (e.g. "Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026") sorted chronologically by an internal numeric key. The Quarter granularity renders `Mmm-Mmm YYYY` labels (e.g. "Jan-Mar 2026", "Apr-Jun 2026"). Clicking the Period header toggles between ascending and descending chronological order — never reverse-alphabetical.

Cross-year example: "Dec 2025" and "Jan 2026" produce two distinct rows. Under default ascending sort, "Dec 2025" appears first because its internal key (202511) is less than "Jan 2026" (202600).

## 5. Malformed-Query Fallback on /summary

Navigating to `/summary?dimension=bogus&granularity=zzz&sort=foo&direction=sideways&tagId=does-not-exist&from=not-a-date&to=2026-02-31` renders the page with all defaults and no 500 error. Invalid dimension/granularity values fall back to defaults (category/month). Invalid sort columns and directions are silently ignored. Invalid dates (wrong shape, impossible calendar dates like Feb 31) are treated as absent. Non-existent tagIds are silently dropped.

## 6. Dimension-Aware Sort Fallback

When the user clicks a sort column that is not valid for the current dimension (e.g. `sort=tag` when `dimension=category`), the sort parameter is silently ignored and the page renders with the default sort. This prevents confusing error messages and ensures the page always shows data.

## 7. Tampered-TagId Recoverable Error

If a user injects an unknown or non-ULID `tagId` via DevTools and submits the form, the `parseTagInputs` validator silently drops syntactically-invalid IDs. If the ID is syntactically valid but does not exist in the database, the POST handler detects the unknown ID after the parser produces `lookupCandidateTagIds` and shows a recoverable global error ("One or more selected tags no longer exist.") with all other field values preserved.

## 8. No-JS and Broken-JS Fallback

With JavaScript disabled, the native checkboxes toggle normally and the `newTags` text input submits as-is. The confirmation page handles both correctly and the round-trip preserves all values.

If `tag-chip-checkboxes.js` throws an error on load, native checkbox toggling and form submission continue to work unaffected. The JS module wraps its init in try/catch and logs errors via `console.error`.

## 9. Summary of User-Facing Flows

| Flow | Chip UI | New Tags | Confirmation | Cancel | Error Recovery |
|------|---------|----------|-------------|--------|----------------|
| Entry form | Alphabetical chips, `allowNewTags=true` | Comma/space separated input | Lists new items | Preserves all values | Inline errors + sticky values |
| Edit form | Pre-existing chips selected | Same as entry | Same as entry | Same as entry | Same as entry |
| Recurring create | Same as entry | Same as entry | Same as entry | Same as entry | Same as entry |
| Recurring edit | Pre-existing chips selected | Same as entry | Same as entry | Same as entry | Same as entry |
| List filter | Alphabetical chips, `allowNewTags=false` | N/A | N/A | N/A | Stale IDs silently dropped |
| Summary filter | Alphabetical chips, `allowNewTags=false` | N/A | N/A | N/A | Malformed params fall back to defaults |
