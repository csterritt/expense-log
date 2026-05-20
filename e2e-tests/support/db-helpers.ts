/**
 * Clear all data from authentication-related tables
 * Calls test-only server endpoint to clear database
 */
export const clearDatabase = async (): Promise<void> => {
  try {
    const response = await fetch('http://localhost:3000/test/database/clear', {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = (await response.json()) as {
      success: boolean
      error?: string
    }

    if (!result.success) {
      throw new Error(result.error || 'Failed to clear database')
    }

    console.log('Database cleared successfully')
  } catch (error) {
    console.error('Failed to clear database:', error)
    throw error
  }
}

/**
 * Clear all data from authentication session table
 * Calls test-only server endpoint to clear database
 */
export const clearSessions = async (): Promise<void> => {
  try {
    const response = await fetch('http://localhost:3000/test/database/clear-sessions', {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = (await response.json()) as {
      success: boolean
      error?: string
    }

    if (!result.success) {
      throw new Error(result.error || 'Failed to clear sessions')
    }

    console.log('Database sessions cleared successfully')
  } catch (error) {
    console.error('Failed to clear sessions:', error)
    throw error
  }
}

/**
 * Check if a single-use code exists in the database
 * @param code - The code to check
 * @returns Promise<boolean> - true if code exists, false otherwise
 */
export const checkCodeExists = async (code: string): Promise<boolean> => {
  try {
    const response = await fetch(
      `http://localhost:3000/test/database/code-exists/${encodeURIComponent(code)}`,
      { method: 'GET' },
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = (await response.json()) as {
      success: boolean
      exists: boolean
      error?: string
    }

    if (!result.success) {
      throw new Error(result.error || 'Failed to check code existence')
    }

    return result.exists
  } catch (error) {
    console.error('Failed to check code existence:', error)
    throw error
  }
}

export interface SeedCategoryRow {
  name: string
}

/**
 * Seed database with a list of categories.
 * Calls test-only server endpoint to insert rows directly.
 */
export const seedCategories = async (rows: SeedCategoryRow[]): Promise<void> => {
  try {
    const response = await fetch('http://localhost:3000/test/database/seed-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = (await response.json()) as {
      success: boolean
      created?: number
      error?: string
    }

    if (!result.success) {
      throw new Error(result.error || 'Failed to seed categories')
    }

    console.log(`Categories seeded successfully: ${result.created} created`)
  } catch (error) {
    console.error('Failed to seed categories:', error)
    throw error
  }
}

export interface SeedExpenseRow {
  date: string
  description: string
  amountCents: number
  categoryName: string
  tagNames?: string[]
}

/**
 * Seed database with a list of expenses (plus any needed categories/tags)
 * Calls test-only server endpoint to insert rows directly.
 */
export const seedExpenses = async (rows: SeedExpenseRow[]): Promise<void> => {
  try {
    const response = await fetch('http://localhost:3000/test/database/seed-expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = (await response.json()) as {
      success: boolean
      created?: number
      error?: string
    }

    if (!result.success) {
      throw new Error(result.error || 'Failed to seed expenses')
    }

    console.log(`Expenses seeded successfully: ${result.created} created`)
  } catch (error) {
    console.error('Failed to seed expenses:', error)
    throw error
  }
}

export interface SeedTagRow {
  name: string
}

/**
 * Seed database with a list of tags.
 * Calls test-only server endpoint to insert rows directly.
 */
export const seedTags = async (rows: SeedTagRow[]): Promise<void> => {
  try {
    const response = await fetch('http://localhost:3000/test/database/seed-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = (await response.json()) as {
      success: boolean
      created?: number
      error?: string
    }

    if (!result.success) {
      throw new Error(result.error || 'Failed to seed tags')
    }

    console.log(`Tags seeded successfully: ${result.created} created`)
  } catch (error) {
    console.error('Failed to seed tags:', error)
    throw error
  }
}

export interface SeedRecurringRow {
  description: string
  amountCents: number
  categoryName: string
  tagNames?: string[]
  recurrence: 'Monthly' | 'Quarterly' | 'Yearly'
  anchorDate: string
  createdAtIso?: string
}

/**
 * Seed database with recurring templates (plus any needed categories/tags).
 * Returns the id of each created template in order.
 */
export const seedRecurringTemplates = async (rows: SeedRecurringRow[]): Promise<string[]> => {
  try {
    const response = await fetch('http://localhost:3000/test/database/seed-recurring-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = (await response.json()) as {
      success: boolean
      ids?: string[]
      error?: string
    }

    if (!result.success) {
      throw new Error(result.error || 'Failed to seed recurring templates')
    }

    console.log(`Recurring templates seeded successfully: ${result.ids?.length} created`)
    return result.ids ?? []
  } catch (error) {
    console.error('Failed to seed recurring templates:', error)
    throw error
  }
}

/**
 * Seed a single generated expense row linked to a recurring template.
 * Returns the new expense id.
 */
export const seedGeneratedExpense = async (input: {
  recurringId: string
  date: string
  occurrenceDate: string
  description?: string
  amountCents?: number
  categoryId?: string
}): Promise<string> => {
  try {
    const response = await fetch('http://localhost:3000/test/database/seed-generated-expense', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = (await response.json()) as {
      success: boolean
      id?: string
      error?: string
    }

    if (!result.success) {
      throw new Error(result.error || 'Failed to seed generated expense')
    }

    console.log(`Generated expense seeded successfully: ${result.id}`)
    return result.id ?? ''
  } catch (error) {
    console.error('Failed to seed generated expense:', error)
    throw error
  }
}

/**
 * Seed database with test data
 * Calls test-only server endpoint to seed database
 */
export const seedDatabase = async (): Promise<void> => {
  try {
    const response = await fetch('http://localhost:3000/test/database/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = (await response.json()) as {
      success: boolean
      error?: string
      usersCreated?: number
      accountsCreated?: number
      singleUseCodesCreated?: number
    }

    if (!result.success) {
      throw new Error(result.error || 'Failed to seed database')
    }

    console.log(
      `Database seeded successfully: ${result.usersCreated} users, ${result.accountsCreated} accounts, ${result.singleUseCodesCreated} codes`,
    )
  } catch (error) {
    console.error('Failed to seed database:', error)
    throw error
  }
}
