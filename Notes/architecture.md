# Architecture Guide (~2200 tokens)

This document outlines the architectural patterns, conventions, and rules used throughout this Hono + Cloudflare Workers + D1 + Drizzle application.

## Filename Conventions

### Routes Directory (`src/routes/`)

| Pattern              | Purpose                                           | Example                                   |
| -------------------- | ------------------------------------------------- | ----------------------------------------- |
| `build-[name].tsx`   | GET route handlers that render JSX pages          | `build-root.tsx`, `build-sign-in.tsx`     |
| `handle-[action].ts` | POST route handlers that process form submissions | `handle-sign-up.ts`, `handle-sign-out.ts` |
| `[feature]/`         | Feature-organized subdirectories                  | `auth/`, `profile/`, `test/`              |

### Library Directory (`src/lib/`)

- Descriptive kebab-case filenames
- Group related functionality by feature (e.g., `sign-up-utils.ts`, `cookie-support.ts`)
- One export per file (named export)

### Components Directory (`src/components/`)

- Kebab-case filenames with `.tsx` extension
- Reusable UI components only

## Routing Architecture

### Route Registration

All routes are explicitly registered in `src/index.ts`:

```typescript
// Route builders attach GET routes
buildRoot(app)
buildSignIn(app)
buildPrivate(app)

// Route handlers attach POST routes
handleSignUp(app)
handleSignOut(app)
```

### Route Builder Pattern

GET routes use a builder function that accepts the Hono app instance:

```typescript
export const buildPageName = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(PATHS.ROUTE_PATH, secureHeaders(STANDARD_SECURE_HEADERS), (c) => {
    return c.render(useLayout(c, renderPageContent()))
  })
}
```

### Handler Pattern

POST routes use a handler function:

```typescript
export const handleAction = (app: Hono<{ Bindings: Bindings }>): void => {
  app.post(
    PATHS.ROUTE_PATH,
    secureHeaders(STANDARD_SECURE_HEADERS),
    async (c) => {
      // Process form submission
    }
  )
}
```

### Route Security

Every route must apply `secureHeaders(STANDARD_SECURE_HEADERS)` middleware.

## Path Management

All paths are centralized in `src/constants.ts`:

```typescript
export const PATHS = {
  ROOT: '/' as const,
  PRIVATE: '/private' as const,
  AUTH: {
    SIGN_IN: '/auth/sign-in' as const,
    SIGN_UP: '/auth/sign-up' as const,
    // ...
  },
}
```

## Database Access Patterns

### Schema Definition (`src/db/schema.ts`)

- Drizzle ORM with SQLite tables
- Table names use singular form (e.g., `user`, `session`)
- Export both the table definition and inferred types:

```typescript
export const user = sqliteTable('user', { ... })
export type User = typeof user.$inferSelect
export type NewUser = typeof user.$inferInsert
```

### Database Access Layer (`src/lib/db-access.ts`)

- All database queries go through `db-access.ts`
- Uses `Result<T, Error>` type from `true-myth` for error handling
- Wraps operations with retry logic using `async-retry`
- Pattern: public function with retry wrapper calling actual implementation

```typescript
export const getUserByEmail = (
  db: DrizzleClient,
  email: string
): Promise<Result<User[], Error>> =>
  withRetry('getUserByEmail', () => getUserByEmailActual(db, email))

const getUserByEmailActual = (
  db: DrizzleClient,
  email: string
): Promise<Result<User[], Error>> =>
  toResult(() => db.select().from(user).where(eq(user.email, email)))
```

## Code Style Rules

### Functional Programming

- Use arrow functions exclusively
- No classes
- Prefer early returns over nested conditionals

### Exports

- One named export per file
- No default exports
- Export name matches filename (PascalCase for components, camelCase for utilities)

### Naming Conventions

| Item                | Convention | Example                             |
| ------------------- | ---------- | ----------------------------------- |
| Files/directories   | kebab-case | `build-sign-up.tsx`, `db-access.ts` |
| Functions/variables | camelCase  | `handleSignUp`, `buildRoot`         |
| Components          | PascalCase | `GatedSignUpForm`                   |
| Constants           | UPPERCASE  | `PATHS`, `HTML_STATUS`              |
| Types/Interfaces    | PascalCase | `Bindings`, `UserWithAccountData`   |

### Constants Organization

All constants live in `src/constants.ts`:

- `PATHS` - All route paths
- `COOKIES` - Cookie names and options
- `HTML_STATUS` - HTTP status codes
- `VALIDATION` - Validation patterns and messages
- `MESSAGES` - User-facing messages
- `DURATIONS` - Time constants

Each category uses `as const` assertion for type safety.

## Testing Infrastructure

### Test Route Guarding

Test-only routes are guarded by `isTestRouteEnabled()`:

```typescript
if (isTestRouteEnabledFlag) {
  handleSetClock(app) // PRODUCTION:REMOVE
  app.route('/test/database', testDatabaseRouter) // PRODUCTION:REMOVE
}
```

Lines marked with `// PRODUCTION:REMOVE` are stripped during production builds.

## Type Definitions

### Local Types (`src/local-types.ts`)

Contains Hono-specific types:

- `Bindings` - Environment variables and D1 database binding
- `Variables` - Context variables (e.g., `db`)
- `DrizzleClient` - Database client type

### Declaration File (`src/types.d.ts`)

Global type declarations for:

- JSX types
- Cloudflare Workers types
- Third-party module augmentations

## Middleware

### Custom Middleware Location

`src/middleware/` directory contains:

- `signed-in-access.ts` - Authentication guards
- `guard-sign-up-mode.ts` - Sign-up mode validation

### Middleware Application Order (in `index.ts`)

1. `secureHeaders` - Security headers
2. `csrf` - CSRF protection
3. `bodyLimit` - Request size limiting
4. `logger` - Request logging
5. `renderer` - JSX rendering setup
6. `validateEnvBindings` - Environment validation
7. DB client initialization per request
8. `setupBetterAuthMiddleware` - Auth middleware

## Form Validation

Validation schemas are in `src/lib/validators.ts` using custom validation patterns:

```typescript
export const SomeFormSchema = {
  field: (value: unknown) => boolean,
}
```

Use `validateRequest(body, Schema)` to validate form submissions.

## Styling

- **DaisyUI** components with **Tailwind CSS**
- Style overrides in `src/style.css`
- Use `data-testid` attributes for testing (kebab-case)

## Security Headers

Two header configurations in `constants.ts`:

- `STANDARD_SECURE_HEADERS` - Default secure headers
- `ALLOW_SCRIPTS_SECURE_HEADERS` - Allows inline scripts (used only where necessary)
