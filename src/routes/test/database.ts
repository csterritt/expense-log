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
} from '../../db/schema'
import { STANDARD_SECURE_HEADERS } from '../../constants'
import { toResult } from '../../lib/db-helpers'

/**
 * Run a database operation through `toResult` and throw on error so the
 * surrounding try/catch in each handler can report it uniformly.
 * Satisfies the database-access rule requiring all DB access to go
 * through the helpers in `src/lib/db-helpers.ts`.
 */
const runDb = async <T>(fn: () => Promise<T>): Promise<T> => {
  const result = await toResult(fn)
  if (result.isErr) {
    throw result.error
  }
  return result.value
}

/**
 * Test-only database manipulation endpoints
 * These endpoints should ONLY be available in development/test environments
 */

const testDatabaseRouter = new Hono<{ Bindings: { PROJECT_DB: D1Database } }>()

/**
 * Clear all authentication data from the database
 * DELETE /test/database/clear
 */
testDatabaseRouter.delete('/clear', secureHeaders(STANDARD_SECURE_HEADERS), async (c) => {
  try {
    const db = createDbClient(c.env.PROJECT_DB)

    // Delete in order to avoid foreign key constraints
    await runDb(() => db.delete(expenseTag))
    await runDb(() => db.delete(expense))
    await runDb(() => db.delete(tag))
    await runDb(() => db.delete(category))
    await runDb(() => db.delete(session))
    await runDb(() => db.delete(account))
    await runDb(() => db.delete(user))
    await runDb(() => db.delete(singleUseCode))
    await runDb(() => db.delete(interestedEmail))

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
    const db = createDbClient(c.env.PROJECT_DB)

    // Delete in order to avoid foreign key constraints
    await runDb(() => db.delete(session))

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
    const db = createDbClient(c.env.PROJECT_DB)

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
      await runDb(() => db.insert(user).values(userData))
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
      await runDb(() => db.insert(account).values(accountData))
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
      await runDb(() => db.insert(singleUseCode).values(codeData))
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
    const db = createDbClient(c.env.PROJECT_DB)

    // Count records in each table
    const userCount = await runDb(() => db.select().from(user))
    const accountCount = await runDb(() => db.select().from(account))
    const sessionCount = await runDb(() => db.select().from(session))
    const singleUseCodeCount = await runDb(() => db.select().from(singleUseCode))
    const interestedEmailCount = await runDb(() => db.select().from(interestedEmail))

    return c.json({
      success: true,
      counts: {
        users: userCount.length,
        accounts: accountCount.length,
        sessions: sessionCount.length,
        singleUseCodes: singleUseCodeCount.length,
        interestedEmail: interestedEmailCount.length,
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
    const db = createDbClient(c.env.PROJECT_DB)

    const result = await runDb(() =>
      db
        .select({ code: singleUseCode.code })
        .from(singleUseCode)
        .where(and(eq(singleUseCode.code, code), isNull(singleUseCode.email))),
    )

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
 * Seed the database with expenses for testing list rendering
 * POST /test/database/seed-expenses
 */
// PRODUCTION:REMOVE
interface SeedExpenseInput {
  date: string
  description: string
  amountCents: number
  categoryName: string
  tagNames?: string[]
}

testDatabaseRouter.post('/seed-expenses', secureHeaders(STANDARD_SECURE_HEADERS), async (c) => {
  try {
    const db = createDbClient(c.env.PROJECT_DB)

    const body = (await c.req.json()) as SeedExpenseInput[]
    if (!Array.isArray(body)) {
      return c.json({ success: false, error: 'Body must be a JSON array' }, 400)
    }

    const now = new Date()
    const categoryIdByLower = new Map<string, string>()
    const tagIdByLower = new Map<string, string>()

    const existingCategories = await runDb(() => db.select().from(category))
    for (const row of existingCategories) {
      categoryIdByLower.set(row.name.toLowerCase(), row.id)
    }
    const existingTags = await runDb(() => db.select().from(tag))
    for (const row of existingTags) {
      tagIdByLower.set(row.name.toLowerCase(), row.id)
    }

    let created = 0
    for (const row of body) {
      const catKey = row.categoryName.toLowerCase()
      let categoryId = categoryIdByLower.get(catKey)
      if (!categoryId) {
        categoryId = crypto.randomUUID()
        await runDb(() =>
          db
            .insert(category)
            .values({ id: categoryId!, name: row.categoryName, createdAt: now, updatedAt: now }),
        )
        categoryIdByLower.set(catKey, categoryId)
      }

      const expenseId = crypto.randomUUID()
      await runDb(() =>
        db.insert(expense).values({
          id: expenseId,
          description: row.description,
          amountCents: row.amountCents,
          categoryId,
          date: row.date,
          createdAt: now,
          updatedAt: now,
        }),
      )

      const tagNames = row.tagNames ?? []
      for (const tagName of tagNames) {
        const tagKey = tagName.toLowerCase()
        let tagId = tagIdByLower.get(tagKey)
        if (!tagId) {
          tagId = crypto.randomUUID()
          await runDb(() =>
            db.insert(tag).values({ id: tagId!, name: tagName, createdAt: now, updatedAt: now }),
          )
          tagIdByLower.set(tagKey, tagId)
        }
        await runDb(() => db.insert(expenseTag).values({ expenseId, tagId }))
      }

      created += 1
    }

    return c.json({ success: true, created })
  } catch (error) {
    console.error('Failed to seed expenses:', error)
    return c.json(
      {
        success: false,
        error: 'Failed to seed expenses',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

export { testDatabaseRouter }
