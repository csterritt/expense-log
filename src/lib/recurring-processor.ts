/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Logic to create expenses from due recurring expense templates.
 * @module lib/recurringProcessor
 */
import {
  getDueRecurringExpenses,
  createExpense,
  advanceRecurringExpenseDate,
} from './expense-db-access'
import type { DrizzleClient } from '../local-types'

/**
 * Advance a date string by one period
 */
export const advanceByPeriod = (dateStr: string, period: string): string => {
  const d = new Date(dateStr + 'T00:00:00Z')
  switch (period) {
    case 'daily':
      d.setUTCDate(d.getUTCDate() + 1)
      break
    case 'weekly':
      d.setUTCDate(d.getUTCDate() + 7)
      break
    case 'monthly':
      d.setUTCMonth(d.getUTCMonth() + 1)
      break
    case 'yearly':
      d.setUTCFullYear(d.getUTCFullYear() + 1)
      break
    default:
      d.setUTCMonth(d.getUTCMonth() + 1)
  }
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Process all due recurring expenses:
 * - For each due recurring expense, create a real expense entry
 * - Advance the nextRunDate by one period
 * Returns the number of expenses created.
 */
export const processRecurringExpenses = async (
  db: DrizzleClient,
  today: string
): Promise<number> => {
  const dueResult = await getDueRecurringExpenses(db, today)
  if (dueResult.isErr) {
    console.error('Error fetching due recurring expenses:', dueResult.error)
    return 0
  }

  const due = dueResult.value
  let created = 0

  for (const recurring of due) {
    const expenseResult = await createExpense(db, {
      userId: recurring.userId,
      amountCents: recurring.amountCents,
      date: recurring.nextRunDate,
      description: recurring.description,
      categoryId: recurring.categoryId,
    })

    if (expenseResult.isErr) {
      console.error(`Failed to create expense for recurring ${recurring.id}:`, expenseResult.error)
      continue
    }

    const nextDate = advanceByPeriod(recurring.nextRunDate, recurring.period)
    const advanceResult = await advanceRecurringExpenseDate(db, recurring.id, nextDate)

    if (advanceResult.isErr) {
      console.error(`Failed to advance date for recurring ${recurring.id}:`, advanceResult.error)
    }

    created++
  }

  return created
}
