# src/routes/build-root.tsx

Route builder for the root path (`/`).

## Functions

### buildRoot(app): void

Registers `GET /` with secure headers. Renders a welcome card with a "Your Expenses" link to `PATHS.EXPENSES`.

## Dependencies

- `hono/secure-headers` — `secureHeaders`
- `../constants` — `PATHS`, `STANDARD_SECURE_HEADERS`
- `./build-layout` — `useLayout`
- `../local-types` — `Bindings`
