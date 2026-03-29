/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { eq, and, isNull } from 'drizzle-orm'

import { createDbClient } from '../../db/client'
import {
  user,
  account,
  session,
  singleUseCode,
  interestedEmail,
  category,
  tag,
  expense,
  expenseTag,
  recurringExpense,
} from '../../db/schema'
import { STANDARD_SECURE_HEADERS } from '../../constants'

/**
 * Test-only database manipulation endpoints
 * These endpoints should ONLY be available in development/test environments
 */

const testDatabaseRouter = new Hono<{
  Bindings: { EXPENSE_LOG_DB: D1Database }
}>()

/**
 * Clear all authentication data from the database
 * DELETE /test/database/clear
 */
testDatabaseRouter.delete('/clear', secureHeaders(STANDARD_SECURE_HEADERS), async (c) => {
  try {
    const db = createDbClient(c.env.EXPENSE_LOG_DB)

    // Delete in order to avoid foreign key constraints
    await db.delete(expenseTag)
    await db.delete(recurringExpense)
    await db.delete(expense)
    await db.delete(category)
    await db.delete(tag)
    await db.delete(session)
    await db.delete(account)
    await db.delete(user)
    await db.delete(singleUseCode)
    await db.delete(interestedEmail)

    console.log('Test database cleared successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Database cleared successfully',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Failed to clear test database:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error clearing test database',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
})

/**
 * Clear all authentication data from the database
 * DELETE /test/database/clear
 */
testDatabaseRouter.delete('/clear-sessions', secureHeaders(STANDARD_SECURE_HEADERS), async (c) => {
  try {
    const db = createDbClient(c.env.EXPENSE_LOG_DB)

    // Delete in order to avoid foreign key constraints
    await db.delete(session)

    console.log('Test database sessions cleared successfully')

    return c.json({
      success: true,
      message: 'Database sessions cleared successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to clear test database sessions:', error)

    return c.json(
      {
        success: false,
        error: 'Failed to clear database sessions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

/**
 * Seed the database with test data
 * POST /test/database/seed
 */
testDatabaseRouter.post('/seed', secureHeaders(STANDARD_SECURE_HEADERS), async (c) => {
  try {
    const db = createDbClient(c.env.EXPENSE_LOG_DB)

    // Insert test users
    const testUsers = [
      {
        id: 'gv9HBfkV7WbSSAkgVW0g5WtYf6hqaJyv',
        name: 'Chris',
        email: 'csterritt@gmail.com',
        emailVerified: true,
        image: null,
        createdAt: new Date(1754691970 * 1000),
        updatedAt: new Date(1754691970 * 1000),
      },
      {
        id: 'On2TgJxPrsP7McTAkYLxoEwsKSpTUldF',
        name: 'FredF',
        email: 'fredfred@team439980.testinator.com',
        emailVerified: true,
        image: null,
        createdAt: new Date(1754692362 * 1000),
        updatedAt: new Date(1754692362 * 1000),
      },
    ]

    for (const userData of testUsers) {
      await db.insert(user).values(userData)
    }

    // Insert test accounts with credentials
    const testAccounts = [
      {
        id: 'u95mdScYyupHDIAF76793YXkI8mDBxwf',
        userId: 'gv9HBfkV7WbSSAkgVW0g5WtYf6hqaJyv',
        accountId: 'gv9HBfkV7WbSSAkgVW0g5WtYf6hqaJyv',
        providerId: 'credential',
        accessToken: null,
        refreshToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        idToken: null,
        password:
          '9461538c8ed05944c1ff4744050320ec:7f25e93a4c138ce0dc5a0be87ca63ecdb2eb242d64a9270cb1c727114a2d55577b84d246c4b8e35cf804603df9917b854cbb61aec94cc3c7e6f29fb3502704d6',
        createdAt: new Date(1754691970 * 1000),
        updatedAt: new Date(1754691970 * 1000),
      },
      {
        id: 'HCRWSgAh2CAvHzT9JzvmJ1NVk2OQa75K',
        userId: 'On2TgJxPrsP7McTAkYLxoEwsKSpTUldF',
        accountId: 'On2TgJxPrsP7McTAkYLxoEwsKSpTUldF',
        providerId: 'credential',
        accessToken: null,
        refreshToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        idToken: null,
        password:
          '7e5d7c0ecefe406431c83511212f4432:81ee5ebdd4123c3d78037185ace585897b9c3465f33f7a9f3f8bec31b919f373054b861ba18f3c6952609abb71cd870e2d2a8f3f14566e910d4d5bf0ac5ba6d5',
        createdAt: new Date(1754692362 * 1000),
        updatedAt: new Date(1754692362 * 1000),
      },
    ]

    for (const accountData of testAccounts) {
      await db.insert(account).values(accountData)
    }

    // Insert test single-use codes for gated sign-up testing
    const testSingleUseCodes = [
      { code: 'WELCOME2024' },
      { code: 'BETA-ACCESS-123' },
      { code: 'EARLY-BIRD-456' },
      { code: 'TEST-CODE-789' },
      { code: 'DEMO-ACCESS-111' },
    ]

    for (const codeData of testSingleUseCodes) {
      await db.insert(singleUseCode).values(codeData)
    }

    console.log('Test database seeded successfully')

    return c.json({
      success: true,
      message: 'Database seeded successfully',
      usersCreated: testUsers.length,
      accountsCreated: testAccounts.length,
      singleUseCodesCreated: testSingleUseCodes.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to seed test database:', error)

    return c.json(
      {
        success: false,
        error: 'Failed to seed database',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

/**
 * Get database status for debugging
 * GET /test/database/status
 */
testDatabaseRouter.get('/status', secureHeaders(STANDARD_SECURE_HEADERS), async (c) => {
  try {
    const db = createDbClient(c.env.EXPENSE_LOG_DB)

    // Count records in each table
    const userCount = await db.select().from(user)
    const accountCount = await db.select().from(account)
    const sessionCount = await db.select().from(session)
    const singleUseCodeCount = await db.select().from(singleUseCode)
    const interestedEmailCount = await db.select().from(interestedEmail)
    const categoryCount = await db.select().from(category)
    const tagCount = await db.select().from(tag)
    const expenseCount = await db.select().from(expense)
    const expenseTagCount = await db.select().from(expenseTag)
    const recurringExpenseCount = await db.select().from(recurringExpense)

    return c.json({
      success: true,
      counts: {
        users: userCount.length,
        accounts: accountCount.length,
        sessions: sessionCount.length,
        singleUseCodes: singleUseCodeCount.length,
        interestedEmail: interestedEmailCount.length,
        categories: categoryCount.length,
        tags: tagCount.length,
        expenses: expenseCount.length,
        expenseTags: expenseTagCount.length,
        recurringExpenses: recurringExpenseCount.length,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to get database status:', error)

    return c.json(
      {
        success: false,
        error: 'Failed to get database status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

/**
 * Check if a single-use code exists in the database
 * GET /test/database/code-exists/:code
 */
testDatabaseRouter.get('/code-exists/:code', secureHeaders(STANDARD_SECURE_HEADERS), async (c) => {
  try {
    const code = c.req.param('code')
    const db = createDbClient(c.env.EXPENSE_LOG_DB)

    const result = await db
      .select({ code: singleUseCode.code })
      .from(singleUseCode)
      .where(and(eq(singleUseCode.code, code), isNull(singleUseCode.email)))

    return c.json({
      success: true,
      exists: result.length === 1,
      code,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to check code existence:', error)

    return c.json(
      {
        success: false,
        error: 'Failed to check code existence',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

/**
 * Seed expenses, categories, and tags for testing
 * POST /test/database/seed-expenses
 */
testDatabaseRouter.post('/seed-expenses', secureHeaders(STANDARD_SECURE_HEADERS), async (c) => {
  try {
    const db = createDbClient(c.env.EXPENSE_LOG_DB)

    // Test categories
    const testCategories = [
      {
        id: 'cat-food-001',
        name: 'Food',
        createdAt: new Date('2025-01-01'),
      },
      {
        id: 'cat-transport-001',
        name: 'Transport',
        createdAt: new Date('2025-01-01'),
      },
    ]
    for (const cat of testCategories) {
      await db.insert(category).values(cat)
    }

    // Test tags
    const testTags = [
      {
        id: 'tag-work-001',
        name: 'work',
        createdAt: new Date('2025-01-01'),
      },
      {
        id: 'tag-personal-001',
        name: 'personal',
        createdAt: new Date('2025-01-01'),
      },
    ]
    for (const t of testTags) {
      await db.insert(tag).values(t)
    }

    // Test expenses (requires user gv9HBfkV7WbSSAkgVW0g5WtYf6hqaJyv from seed)
    const testExpenses = [
      {
        id: 'exp-001',
        userId: 'gv9HBfkV7WbSSAkgVW0g5WtYf6hqaJyv',
        amountCents: 1250,
        date: '2025-01-15',
        description: 'Lunch at cafe',
        categoryId: 'cat-food-001',
        createdAt: new Date('2025-01-15'),
        updatedAt: new Date('2025-01-15'),
      },
      {
        id: 'exp-002',
        userId: 'gv9HBfkV7WbSSAkgVW0g5WtYf6hqaJyv',
        amountCents: 3500,
        date: '2025-01-20',
        description: 'Monthly bus pass',
        categoryId: 'cat-transport-001',
        createdAt: new Date('2025-01-20'),
        updatedAt: new Date('2025-01-20'),
      },
    ]
    for (const exp of testExpenses) {
      await db.insert(expense).values(exp)
    }

    // Link tags to expenses
    await db.insert(expenseTag).values({ expenseId: 'exp-001', tagId: 'tag-personal-001' })
    await db.insert(expenseTag).values({ expenseId: 'exp-002', tagId: 'tag-work-001' })

    console.log('Expense test data seeded successfully')

    return c.json({
      success: true,
      message: 'Expense test data seeded successfully',
      categoriesCreated: testCategories.length,
      tagsCreated: testTags.length,
      expensesCreated: testExpenses.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to seed expense test data:', error)

    return c.json(
      {
        success: false,
        error: 'Failed to seed expense test data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

/**
 * Clear expense-related tables only
 * DELETE /test/database/clear-expenses
 */
testDatabaseRouter.delete('/clear-expenses', secureHeaders(STANDARD_SECURE_HEADERS), async (c) => {
  try {
    const db = createDbClient(c.env.EXPENSE_LOG_DB)

    await db.delete(expenseTag)
    await db.delete(recurringExpense)
    await db.delete(expense)
    await db.delete(category)
    await db.delete(tag)

    console.log('Expense tables cleared successfully')

    return c.json({
      success: true,
      message: 'Expense tables cleared successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to clear expense tables:', error)

    return c.json(
      {
        success: false,
        error: 'Failed to clear expense tables',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

export { testDatabaseRouter }
