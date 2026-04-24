## Issue 15: Scheduled cron wiring + Pushover failure reporting

**Type**: HITL
**Blocked by**: Issue 14

### Parent PRD

`Notes/PRD-expense-log.md`

### What to build

Wire the recurring materialization into a real Cloudflare Workers scheduled trigger:

- Create `src/scheduled.ts` exporting a `scheduled(event, env, ctx)` handler that builds the DB client, calls `expense-repo.materializeRecurring(todayEt())`, logs the result via the existing `hono/logger` sink, and — if `PO_APP_ID` / `PO_USER_ID` are bound — sends a Pushover notification via `src/lib/po-notify.ts` on any caught failure (per-template aggregated errors from Issue 14 count as failures).
- Wire the `scheduled` export alongside the existing `fetch` export in `src/index.ts`.
- Add `triggers.crons` to `wrangler.jsonc` with `0 5 * * *` UTC (05:00 UTC year-round; no DST adjustment per the PRD).

This slice is HITL because it touches production wrangler configuration and the deployed worker's default export surface.

See PRD sub-sections _Cron trigger_, _Failure reporting_, and _Idempotency_, user stories 69 (production side), 71.

### How to verify

- **Manual**:
  1. Locally, run `wrangler dev` with the scheduled trigger invocation (`curl http://localhost:8787/__scheduled` or equivalent); confirm the handler runs and logs the generated/failed counts.
  2. Force a failure (e.g. temporarily throw inside `materializeRecurring`) with `PO_APP_ID`/`PO_USER_ID` set to test values; confirm a Pushover notification is sent and the error is logged.
  3. Run the scheduled handler twice in quick succession; confirm no duplicates (Issue 14's unique index still guards).
  4. Verify `wrangler.jsonc` `triggers.crons` entry is `0 5 * * *`.
- **Automated**: Playwright e2e continues to rely on `POST /test/run-cron` from Issue 14 (same underlying function). Add a unit test of `src/scheduled.ts` with a mocked env asserting (a) it invokes `materializeRecurring` with `todayEt()` and (b) it sends Pushover when Pushover env is set and the result contains failures.

### Acceptance criteria

- [ ] Given the scheduled trigger fires, when the handler runs, then `materializeRecurring(todayEt())` is invoked and its result is logged.
- [ ] Given a materialization failure and `PO_APP_ID` / `PO_USER_ID` are bound, when the handler runs, then a Pushover notification is sent.
- [ ] Given `wrangler.jsonc`, when inspected, then `triggers.crons` includes `0 5 * * *`.
- [ ] Given two scheduled invocations on the same day, when both complete, then no duplicate `expense` rows exist.

### User stories addressed

- User story 69: cron never double-inserts (production path)
- User story 71: Pushover notification + log on cron failure

---
