# client.ts

**Source:** `src/db/client.ts`

## Purpose

Factory for creating the Drizzle ORM client used to query the Cloudflare D1 database.

## Export

### `createDbClient(db: D1Database): DrizzleClient`

Returns `drizzle(db, { schema })` where `schema` is imported from `./schema`.

The exported schema object is passed in so Drizzle knows about all table definitions for relational queries.

## Cross-references

- [schema.md](schema.md) — table definitions passed to Drizzle
- [local-types.md](../local-types.md) — `DrizzleClient` type

---

See [source-code.md](../../source-code.md) for the full catalog.
