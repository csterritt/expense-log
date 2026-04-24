# build-root.tsx

**Source:** `src/routes/build-root.tsx`

## Purpose

Root page (`/`) — the public landing page for the application.

## Export

### `buildRoot(app): void`

Route: `GET /`

Renders:

- Welcome card with title "Welcome!"
- Subtitle: "Expense Log"
- "Protected Content" button linking to `/expenses` — `data-testid='visit-expenses-action'`
- Wrapper element `data-testid='startup-page-banner'`

## Cross-references

- [build-layout.md](build-layout.md) — layout wrapper

---

See [source-code.md](../../source-code.md) for the full catalog.
