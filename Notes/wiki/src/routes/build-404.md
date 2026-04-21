# build-404.tsx

**Source:** `src/routes/build-404.tsx`

## Purpose

Catch-all 404 handler registered via `app.notFound()` in `index.ts`.

## Export

### `build404(app): void`

Renders a simple JSX page with `data-testid='not-found-page'`:

- "Page Not Found" heading
- Message: "The page you are looking for does not exist."
- Home button (`/`) with `data-testid='go-home-action'`

Returns HTTP 200 (SPA convention) with the rendered page inside the layout.

## Cross-references

- [index.md](../index.md) — registered as `app.notFound()`
- [build-layout.md](build-layout.md) — layout wrapper

---

See [source-code.md](../../source-code.md) for the full catalog.
