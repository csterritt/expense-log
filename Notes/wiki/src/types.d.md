# types.d.ts

**Source:** `src/types.d.ts`

## Purpose

Ambient type declarations and Hono module augmentation.

## Types

### `Bindings` interface

Declares the `PROJECT_DB: D1Database` binding.

### Hono `ContextVariableMap` augmentation

Augments `hono`'s `ContextVariableMap` with:
- `db` — `DrizzleD1Database<typeof schema>`
- `user` — `AuthUser | null`
- `session` — `AuthSession | null`
- `authSession` — `AuthSessionResponse | null`
- `signInEmail` — optional string

### Imports

- `DrizzleD1Database` from `drizzle-orm/d1`
- Schema from `./db/schema`
- `AuthSession`, `AuthSessionResponse`, `AuthUser` from `./local-types`

---

See [source-code.md](../source-code.md) for the full catalog.
