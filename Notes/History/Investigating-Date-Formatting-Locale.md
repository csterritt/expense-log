# Cascade Chat Conversation

  Note: _This is purely the output of the chat conversation and does not contain any raw data, codebase snippets, etc. used to generate the output._

### User Input

Why are all dates created with `new Intl.DateTimeFormat('en-CA',`? How did `en-CA` get picked as the Locale?

*Grep searched codebase*

### Planner Response

# Why `en-CA`?

The `en-CA` locale is used as a trick to get **ISO-style `YYYY-MM-DD`** date output without manually assembling parts.

`@/Users/chris/hacks/expenses/expense-log/src/lib/et-date.ts:12-29`

```@/Users/chris/hacks/expenses/expense-log/src/lib/et-date.ts:12-29
const ET_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
...
export const todayEt = (reference?: Date): string => {
  const d = reference ?? new Date()
  // en-CA yields YYYY-MM-DD
  return ET_FORMATTER.format(d)
}
```

## The reasoning

- **`en-CA` (English‑Canada)** is one of the few common locales whose default short date format happens to be `YYYY-MM-DD` (Canada officially uses ISO 8601 for numeric dates).
- Other obvious choices don't work the same way:
  - `en-US` → `MM/DD/YYYY`
  - `en-GB` → `DD/MM/YYYY`
  - `sv-SE` (Swedish) also yields `YYYY-MM-DD` and is sometimes used for the same trick.
- Combined with `timeZone: 'America/New_York'`, this gives you "today's date in Eastern Time, formatted as ISO `YYYY-MM-DD`" in a single `format()` call — no `padStart`, no manual string concatenation, no `toISOString()` (which would give UTC, not ET).

## How it got picked here

Looking at the comment on line 27 (`// en-CA yields YYYY-MM-DD`) and the function name `todayEt`, this is the well‑known JavaScript idiom for "ISO date in a specific timezone." It's the standard recipe you'll find in Stack Overflow answers and MDN examples for that problem. The same formatter is duplicated (intentionally, to mirror server behavior) in:

- `@/Users/chris/hacks/expenses/expense-log/src/lib/et-date.ts:12`
- `@/Users/chris/hacks/expenses/expense-log/e2e-tests/expenses/01-list-rendering.spec.ts:13`
- `@/Users/chris/hacks/expenses/expense-log/e2e-tests/expenses/02-entry-form.spec.ts:13`

So: it's not picked for linguistic reasons — it's picked because Canada's locale formatting rules give you ISO 8601 date output for free.