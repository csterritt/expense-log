# src/routes/build-404.tsx

Route builder for the 404 (Not Found) page.

## Functions

### build404(app): void

Registers `app.notFound` handler that renders a 404 card with "Page Not Found" message and a "Return Home" link. Uses `useLayout` wrapper.

## Dependencies

- `../constants` — `PATHS`
- `./build-layout` — `useLayout`
- `../local-types` — `Bindings`
