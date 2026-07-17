# src/db/client.ts

Drizzle ORM client factory for Cloudflare D1.

## Functions

### createDbClient(db: D1Database): DrizzleClient

Creates a Drizzle ORM client instance wrapping the D1 database from Cloudflare env. Passes the full schema for relational query support.

## Dependencies

- `drizzle-orm/d1` — D1-compatible Drizzle driver
- `./schema` — all table definitions
