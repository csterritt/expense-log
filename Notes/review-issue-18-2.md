## Logic Correctness and Edge Cases

- **Default date-range wording conflict**
  - The PRD has an internal about default time ranges. The Ideas.md file has been updated to be consistent, with the text "Default range is current calendar month plus two preceding calendar months, inclusive, from the first day of the month two months before today through today in ET." Please update the PRD where appropriate.

- **Tag-name character set should be explicit**
  - The spec says “letters, digits, hyphens and underscores only.”
  - The Ideas.md file has been updated to specify ASCII-only letters. Please update the PRD where appropriate.

- **Existing invalid/legacy tag names**
  - Acceptance criterion 85 uses a tag name containing `<script>`, but the validation rules should reject such new names.
  - This is still a useful safe-rendering test if it represents legacy DB data, direct DB mutation, or a previous bug. The spec should clarify that escaping applies even if existing stored data violates current validation rules.

- **Dimension-specific sort validation**
  - The issue says validate sort column against an allow-list, but the valid columns depend on selected summary dimension.
  - Example: `sort=tag` should probably fall back when dimension is `Category` or `Time only`.
  - Add: “Sort columns are valid only if present in the current result table, plus `count`, `total`, and `timePeriod`.”

- **Preserving selected filters after dropping unknown `tagId`**
  - For list and Summary filters, unknown `tagId` values are silently dropped.
  - The spec should say that rendering simply omits those stale selections.

- **Repeated `newTags` separators**
  - Splitting on commas and whitespace is good, but examples would help:
    - `foo,bar`
    - `foo bar`
    - `foo, bar`
    - `foo,,bar`
  - The spec already says drop empty tokens; this is logically sound.

- **Recurring edit form coverage**
  - The issue properly includes recurring create/edit forms, but recurring templates also have confirmation flows. It should explicitly include recurring confirmation routes in the “How to verify” and acceptance criteria, not just “recurring equivalents” in prose.

## Security and Data Validation

- **Raw query/body size caps**
  - `newTags` has explicit caps, but repeated `tagId` values do not.
  - A malicious user could submit thousands of `tagId` parameters. The spec should add a cap for submitted `tagId` count before DB lookup, e.g. “reject mutation submissions above N tag IDs; silently truncate/drop or ignore excessive filter tag IDs.”
  - This matters for performance and abuse resistance.

- **`tagId` format validation**
  - The issue says validate that each id exists.
  - It should also specify syntactic validation before DB access, e.g. expected ULID format or existing project ID format.
  - Invalid-format IDs should not cause database errors or expensive lookups.

- **Confirmation hidden fields**
  - The confirmation flow likely preserves user data through hidden inputs.
  - The spec says safe rendering for hidden inputs, which is good, but it should also say the confirm handler must fully revalidate everything and not trust hidden fields from the prior step.

- **Race handling should include category too**
  - Issue 18 focuses on tag races, but the confirmation page also handles new categories.
  - If this issue touches shared confirmation logic, the spec should state that existing category race/collision handling must remain intact.

## Error Handling and Logging

- **Partial failure in confirmation**
  - The issue says other unique-constraint failures surface a recoverable message and preserve values.
  - It should explicitly require atomicity: no partial expense/template/category/tag creation if confirmation fails mid-transaction. The PRD mentions atomic creation, but Issue 18 should restate it in the confirmation-time race section.

- **Unexpected DB failures during filter rendering**
  - The spec covers malformed user input but not ordinary DB/query failures.
  - It may be enough to rely on existing app behavior, but if this is an overall spec, add a short line: unexpected read failures render the app’s standard error response and log without sensitive query/form data.

## Spec Shape / Scope

- **Acceptance criteria are excellent but long**
  - The criteria are comprehensive and testable.
  - Consider grouping them under headings:
    - Tag UI
    - Mutation validation
    - Confirmation/race behavior
    - Summary sorting
    - Security/progressive enhancement
  - This will make later task-writing easier.

# Recommended Spec Additions

- **Clarify date default**
  - “Default range is current calendar month plus two preceding calendar months, inclusive, from the first day of the month two months before today through today in ET.”

- **Clarify tag syntax**
  - “Normalized tag names must match `^[a-z0-9_-]{1,20}$` after trimming/lowercasing.”

- **Add request abuse caps**
  - Cap repeated `tagId` count for mutation and filter requests.
  - Validate `tagId` format before existence lookup.

- **Clarify untagged summary behavior**
  - “When grouping by Tag or Category + Tag, untagged expenses contribute no rows unless an explicit untagged bucket is later added.”

- **Clarify dimension-aware sorting**
  - Invalid sort columns include columns not present for the selected dimension.

- **Restate confirmation atomicity**
  - Confirmation creates/reuses category, tags, and expense/template in one transaction; failures do not partially persist.

- **Mention confirm revalidation**
  - Confirmation hidden inputs are fully revalidated; the initial validation step is not trusted.
