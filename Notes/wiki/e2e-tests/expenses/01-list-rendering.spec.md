# 01-list-rendering.spec.ts

**Source:** `e2e-tests/expenses/01-list-rendering.spec.ts`

## Purpose

End-to-end coverage for Issue 02: signs in `KNOWN_USER`, seeds expenses spanning the default ET window plus one outside it, and asserts that the rendered table on `/expenses` matches the expected ordering, formatting, and filtering.

## Setup

- Computes `todayEt` locally with `Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })` to mirror the server's `defaultRangeEt`.
- Uses [`seedExpenses`](../support/db-helpers.md) to insert:
  - Two same-day rows in the current month (`'beta lunch'` and `'Alpha breakfast'`) to exercise the case-insensitive description tiebreak.
  - One row one month back (`'Gas'`).
  - One row two months back (`'Electric bill'`).
  - One row four months back (`'Historical purchase'`) — outside the window.

## Assertions

- `expenses-table` is visible.
- Exactly four `expense-row` elements render (the four in-window rows).
- Description order: `Alpha breakfast`, `beta lunch`, `Gas`, `Electric bill` (date desc, then case-insensitive description asc).
- Date column contains the exact ET dates seeded.
- Amount column shows `1.00`, `1,234.56`, `45.67`, `9,876.00` in row order.
- Tag cells contain the seeded names where present (`work`, `client`, `road-trip`).
- The out-of-window description never appears anywhere on the page.
