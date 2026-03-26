# Expenses Web App - Implementation Plan

## Overview

Build an expense tracking application following the existing Hono + Cloudflare Workers + D1 + Drizzle architecture. All users share the same expense pool (no per-user isolation).

---

## Phase 1: Database Schema

### Files to Modify

**`src/db/schema.ts`**

Add new tables following existing patterns:

```typescript
// New tables to add
export const category = sqliteTable('category', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color'),
  sortOrder: integer('sort_order').default(0),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
})

export const tag = sqliteTable('tag', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
})

export const expense = sqliteTable('expense', {
  id: text('id').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  amountCents: integer('amount_cents').notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  description: text('description').notNull(),
  categoryId: text('categoryId').references(() => category.id, {
    onDelete: 'set null',
  }),
  recurringType: text('recurring_type'), // 'weekly' | 'monthly' | 'yearly' | null
  recurringInterval: integer('recurring_interval').default(1),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
})

// Add indexes for query performance
export const expenseDateIdx = sqliteTable('expense', {
  date: integer('date', { mode: 'timestamp' }),
})

export const expenseCategoryIdx = sqliteTable('expense', {
  categoryId: text('categoryId'),
})

export const expenseUserIdx = sqliteTable('expense', {
  userId: text('userId'),
})

// Many-to-many: expense <-> tag
export const expenseTag = sqliteTable('expenseTag', {
  expenseId: text('expenseId')
    .notNull()
    .references(() => expense.id, { onDelete: 'cascade' }),
  tagId: text('tagId')
    .notNull()
    .references(() => tag.id, { onDelete: 'cascade' }),
})
```

Export types for all new tables.

---

## Phase 2: Constants and Paths

### Files to Modify

**`src/constants.ts`**

Add expense-related paths:

```typescript
export const PATHS = {
  // ... existing paths
  EXPENSES: {
    ROOT: '/expenses' as const,
    NEW: '/expenses/new' as const,
    EDIT: '/expenses/:id/edit' as const,
    DELETE: '/expenses/:id/delete' as const,
  },
  CATEGORIES: '/categories' as const,
  TAGS: '/tags' as const,
  SUMMARY: '/summary' as const,
}
```

Add validation constants:

```typescript
export const VALIDATION = {
  // ... existing
  AMOUNT_MAX_CENTS: 100000000, // $1M max
  DESCRIPTION_MAX_LENGTH: 200,
  CATEGORY_NAME_MAX_LENGTH: 50,
  TAG_NAME_MAX_LENGTH: 30,
}
```

Add messages:

```typescript
export const MESSAGES = {
  // ... existing
  EXPENSE_CREATED: 'Expense added successfully.',
  EXPENSE_UPDATED: 'Expense updated successfully.',
  EXPENSE_DELETED: 'Expense deleted successfully.',
  CATEGORY_CREATED: 'Category created successfully.',
  TAG_CREATED: 'Tag created successfully.',
  INVALID_AMOUNT: 'Please enter a valid amount.',
}
```

---

## Phase 3: Database Access Layer

### New Files

**`src/lib/expense-db-access.ts`**

Follow `db-access.ts` pattern with `Result<T, Error>` types and retry logic.

**`src/lib/expense-utils.ts`**

Mirror `sign-up-utils.ts` structure with helper functions:

```typescript
export const dollarsToCents = (dollars: number): number =>
  Math.round(dollars * 100)

export const centsToDollars = (cents: number): number => cents / 100

export const formatAmount = (cents: number): string =>
  `$${(cents / 100).toFixed(2)}`

export const getCurrentMonthRange = (): { start: Date; end: Date } => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start, end }
}
```

### Database Functions

```typescript
export const createExpense = (
  db: DrizzleClient,
  data: NewExpense & { tagIds?: string[] }
): Promise<Result<Expense, Error>>

export const getExpenses = (
  db: DrizzleClient,
  options: {
    limit?: number
    offset?: number
    sortBy?: 'date' | 'amount' | 'category'
    sortOrder?: 'asc' | 'desc'
    categoryId?: string
    tagIds?: string[]
    searchDescription?: string
    startDate?: Date
    endDate?: Date
  }
): Promise<Result<ExpenseWithDetails[], Error>>

export const getExpenseById = (
  db: DrizzleClient,
  id: string
): Promise<Result<ExpenseWithDetails | null, Error>>

export const updateExpense = (
  db: DrizzleClient,
  id: string,
  data: Partial<NewExpense> & { tagIds?: string[] }
): Promise<Result<Expense, Error>>

export const deleteExpense = (
  db: DrizzleClient,
  id: string
): Promise<Result<boolean, Error>>

export const getCategories = (
  db: DrizzleClient
): Promise<Result<Category[], Error>>

export const createCategory = (
  db: DrizzleClient,
  data: NewCategory
): Promise<Result<Category, Error>>

export const getTags = (
  db: DrizzleClient
): Promise<Result<Tag[], Error>>

export const createTag = (
  db: DrizzleClient,
  data: NewTag
): Promise<Result<Tag, Error>>

export const getSummaryByCategory = (
  db: DrizzleClient,
  options: {
    startDate?: Date
    endDate?: Date
    categoryIds?: string[]
    tagIds?: string[]
  }
): Promise<Result<CategorySummary[], Error>>

export const getSummaryByTag = (
  db: DrizzleClient,
  options: {
    startDate?: Date
    endDate?: Date
    tagIds?: string[]
  }
): Promise<Result<TagSummary[], Error>>
```

---

## Phase 4: Validation

### Files to Modify

**`src/lib/validators.ts`**

Add expense form validation schemas:

```typescript
export const ExpenseFormSchema = {
  amount: (value: unknown) => isValidAmount(value),
  description: (value: unknown) =>
    isNonEmptyString(value) &&
    String(value).length <= VALIDATION.DESCRIPTION_MAX_LENGTH,
  date: (value: unknown) => isValidDate(value),
  categoryId: (value: unknown) =>
    value === undefined || value === '' || isValidUuid(value),
  tagIds: (value: unknown) => value === undefined || Array.isArray(value),
  recurringType: (value: unknown) =>
    value === undefined ||
    ['weekly', 'monthly', 'yearly'].includes(String(value).toLocaleLowerCase()),
  recurringInterval: (value: unknown) =>
    value === undefined || (typeof value === 'number' && value >= 1),
}

export const CategoryFormSchema = {
  name: (value: unknown) =>
    isNonEmptyString(value) &&
    String(value).length <= VALIDATION.CATEGORY_NAME_MAX_LENGTH,
  color: (value: unknown) => value === undefined || isValidHexColor(value),
}

export const TagFormSchema = {
  name: (value: unknown) =>
    isNonEmptyString(value) &&
    String(value).length <= VALIDATION.TAG_NAME_MAX_LENGTH,
  color: (value: unknown) => value === undefined || isValidHexColor(value),
}
```

---

## Phase 5: Routes - GET Pages

### New Files

**`src/routes/expenses/build-expense-list.tsx`**

Main expenses page showing entry form + history.

```typescript
export const buildExpenseList = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.EXPENSES.ROOT,
    secureHeaders(STANDARD_SECURE_HEADERS),
    async (c) => {
      const db = c.get('db')
      const user = c.get('user')

      const [expensesResult, categoriesResult, tagsResult] = await Promise.all([
        getExpenses(db, { limit: 50, sortBy: 'date', sortOrder: 'desc' }),
        getCategories(db),
        getTags(db),
      ])

      // Render page with:
      // - Expense entry form (top)
      // - History list with month separators
      // - Filters for category/tag/search
    }
  )
}
```

**`src/routes/expenses/build-expense-edit.tsx`**

Edit expense page at `/expenses/:id/edit`.

**`src/routes/summary/build-summary.tsx`**

Summary/analytics page with category/tag breakdowns at `/summary`.

**`src/routes/categories/build-categories.tsx`**

Category management page at `/categories`.

**`src/routes/categories/build-category-edit.tsx`**

Edit category page at `/categories/:id/edit`.

**`src/routes/tags/build-tags.tsx`**

Tag management page at `/tags`.

**`src/routes/tags/build-tag-edit.tsx`**

Edit tag page at `/tags/:id/edit`.

---

## Phase 6: Routes - POST Handlers

### New Files

**`src/routes/expenses/handle-create-expense.ts`**

```typescript
export const handleCreateExpense = (
  app: Hono<{ Bindings: Bindings }>
): void => {
  app.post(
    PATHS.EXPENSES.ROOT,
    secureHeaders(STANDARD_SECURE_HEADERS),
    async (c) => {
      const body = await c.req.parseBody()
      const [ok, data, err] = validateRequest(body, ExpenseFormSchema)

      if (!ok) {
        return redirectWithError(
          c,
          PATHS.EXPENSES.ROOT,
          err || MESSAGES.INVALID_INPUT
        )
      }

      const db = c.get('db')
      const user = c.get('user')

      const result = await createExpense(db, {
        ...data,
        userId: user.id,
        amountCents: dollarsToCents(data.amount),
        date: data.date || new Date(),
      })

      if (result.isErr) {
        return redirectWithError(
          c,
          PATHS.EXPENSES.ROOT,
          MESSAGES.GENERIC_ERROR_TRY_AGAIN
        )
      }

      return redirectWithMessage(
        c,
        PATHS.EXPENSES.ROOT,
        MESSAGES.EXPENSE_CREATED
      )
    }
  )
}
```

**`src/routes/expenses/handle-update-expense.ts`**

**`src/routes/expenses/handle-delete-expense.ts`**

**`src/routes/categories/handle-create-category.ts`**

**`src/routes/categories/handle-update-category.ts`**

**`src/routes/categories/handle-delete-category.ts`**

**`src/routes/tags/handle-create-tag.ts`**

**`src/routes/tags/handle-update-tag.ts`**

**`src/routes/tags/handle-delete-tag.ts`**

---

## Phase 7: Components

### New Files

**`src/components/expense-form.tsx`**

Reusable expense entry form with:

- Amount input (dollars, 2 decimal places)
- Date picker (default today)
- Description textarea
- Category dropdown
- Tag multi-select
- Recurring options (type + interval)

**`src/components/expense-list.tsx`**

History list with:

- Month separator headers (different background)
- Sortable columns
- Edit/delete actions
- Responsive layout

**`src/components/expense-filters.tsx`**

Filter panel with:

- Category multi-select
- Tag multi-select
- Description search input
- Date range picker

**`src/components/summary-chart.tsx`**

Simple bar/pie chart for category breakdown (can use CSS or minimal JS).

**`src/components/category-badge.tsx`**

Colored category display.

**`src/components/tag-badge.tsx`**

Colored tag display.

---

## Phase 8: Middleware & Main Application

### New Files

**`src/middleware/require-expense-access.ts`**

Dedicated middleware for expense route authentication:

```typescript
export const requireExpenseAccess = async (
  c: Context<{ Bindings: Bindings }>,
  next: Next
) => {
  const session = c.get('session')
  if (!session) {
    return redirectWithError(c, PATHS.AUTH.SIGN_IN, MESSAGES.UNAUTHORIZED)
  }
  await next()
}
```

### Files to Modify

**`src/index.ts`**

Import and register new routes with middleware:

```typescript
// Add imports
import { requireExpenseAccess } from './middleware/require-expense-access'
import { buildExpenseList } from './routes/expenses/build-expense-list'
import { buildExpenseEdit } from './routes/expenses/build-expense-edit'
import { handleCreateExpense } from './routes/expenses/handle-create-expense'
import { handleUpdateExpense } from './routes/expenses/handle-update-expense'
import { handleDeleteExpense } from './routes/expenses/handle-delete-expense'
import { buildSummary } from './routes/summary/build-summary'
import { buildCategories } from './routes/categories/build-categories'
import { buildCategoryEdit } from './routes/categories/build-category-edit'
import { handleCreateCategory } from './routes/categories/handle-create-category'
import { handleUpdateCategory } from './routes/categories/handle-update-category'
import { handleDeleteCategory } from './routes/categories/handle-delete-category'
import { buildTags } from './routes/tags/build-tags'
import { buildTagEdit } from './routes/tags/build-tag-edit'
import { handleCreateTag } from './routes/tags/handle-create-tag'
import { handleUpdateTag } from './routes/tags/handle-update-tag'
import { handleDeleteTag } from './routes/tags/handle-delete-tag'

// Apply middleware to expense routes
app.use(PATHS.EXPENSES.ROOT, requireExpenseAccess)
app.use(PATHS.EXPENSES.EDIT, requireExpenseAccess)
app.use(PATHS.SUMMARY, requireExpenseAccess)
app.use(PATHS.CATEGORIES, requireExpenseAccess)
app.use(PATHS.TAGS, requireExpenseAccess)

// Register routes
buildExpenseList(app)
buildExpenseEdit(app)
handleCreateExpense(app)
handleUpdateExpense(app)
handleDeleteExpense(app)
buildSummary(app)
buildCategories(app)
buildCategoryEdit(app)
handleCreateCategory(app)
handleUpdateCategory(app)
handleDeleteCategory(app)
buildTags(app)
buildTagEdit(app)
handleCreateTag(app)
handleUpdateTag(app)
handleDeleteTag(app)
```

**`src/local-types.ts`**

Add to `Variables` type:

```typescript
export type Variables = {
  db: DrizzleClient
  user: User
  session: Session
}
```

---

## Phase 9: Database Migration

Use Drizzle Kit for migrations. Update `drizzle.config.ts` and run:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

The migration will be auto-generated from the schema changes in `src/db/schema.ts`. No manual SQL needed.

### Indexes Added

The schema includes these indexes for query performance:

- `idx_expense_date` - For date range queries and sorting
- `idx_expense_category` - For category filtering
- `idx_expense_user` - For user-based lookups

---

## Phase 10: Testing

### E2E Test Files to Create

Create the following test files in `e2e-tests/`:

- `expense-list.spec.ts` - Test expense list page, filters, sorting
- `expense-create.spec.ts` - Test creating expenses with all field combinations
- `expense-edit.spec.ts` - Test editing existing expenses
- `expense-delete.spec.ts` - Test deleting expenses
- `category-management.spec.ts` - Test CRUD operations for categories
- `tag-management.spec.ts` - Test CRUD operations for tags
- `summary-view.spec.ts` - Test summary page with category/tag breakdowns

### Test Scenarios

**`expense-list.spec.ts`:**

- View list with default sort (date descending)
- Change sort order (date/amount/category)
- Filter by category
- Filter by tag
- Search by description
- View month separators with different backgrounds

**`expense-create.spec.ts`:**

- Create with amount + description only
- Create with all fields (category, tags, recurring)
- Validation errors for invalid amount
- Validation errors for missing description

**`expense-edit.spec.ts`:**

- Edit all fields
- Remove category
- Add/remove tags
- Change recurring settings

**`expense-delete.spec.ts`:**

- Delete from list view
- Delete from edit page
- Confirm deletion

**`category-management.spec.ts`:**

- Create category with color
- Edit category name/color
- Delete unused category
- Attempt to delete category with expenses

**`tag-management.spec.ts`:**

- Create tag with color
- Edit tag name/color
- Delete unused tag
- Attempt to delete tag with expenses

**`summary-view.spec.ts`:**

- View summary by category
- View summary by tag
- Filter summary by date range
- Filter summary by specific categories
- Filter summary by specific tags

---

## Implementation Order

1. Database schema additions
2. Constants and paths
3. Database access functions
4. Validators
5. GET routes (list, edit, summary pages)
6. POST handlers (create, update, delete)
7. Components
8. Wire up in index.ts
9. Migration
10. E2E tests

---

## Open Questions

1. **Recurring expenses**: Should the app auto-generate future expense records, or just mark them as recurring for reference?
2. **Default categories/tags**: Should we seed the database with common categories (Food, Transport, Utilities)?
3. **Summary date range**: Default to current month, last 30 days, or custom range?
