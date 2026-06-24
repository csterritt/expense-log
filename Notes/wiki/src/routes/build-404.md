# build-404.tsx

**Source:** `src/routes/build-404.tsx`

## Purpose

Catch-all 404 handler registered via `app.notFound()` in `index.ts`.

## Export

### `build404(app): void`

Renders a JSX page with `data-testid='404-page-banner'`:

- "404" in large error text
- "Page Not Found" heading
- Message: "That page does not exist." (`data-testid='404-message'`)
- Home button (`/`) with `data-testid='home-action'`

Registered via `app.notFound()`, which returns HTTP 404 by default. The rendered page is wrapped inside the layout.

## Cross-references

- [index.md](../index.md) — registered as `app.notFound()`
- [build-layout.md](build-layout.md) — layout wrapper

---

See [source-code.md](../../source-code.md) for the full catalog.
