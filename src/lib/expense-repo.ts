/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Read/write helpers for the `expense` table and its joins.
 * @module lib/expense-repo
 */
import { Context } from 'hono'
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm'

import { createDbClient } from '../db/client'
import { category, expense, expenseTag, tag } from '../db/schema'
import type { Bindings } from '../local-types'

export interface ExpenseRow {
  id: string
  date: string
  description: string
  categoryName: string
  amountCents: number
  tagNames: string[]
}

export interface ListExpenseFilters {
  from: string
  to: string
}

/**
 * List expenses whose `date` is within `[from, to]` inclusive.
 *
 * Results are sorted by `date DESC` then case-insensitive `description ASC`.
 * Tag names (if any) are returned alongside each row in their natural
 * ordering from the join (no duplication).
 */
export const listExpenses = async (
  c: Context<{ Bindings: Bindings }>,
  filters: ListExpenseFilters,
): Promise<ExpenseRow[]> => {
  const db = createDbClient(c.env.PROJECT_DB)

  const rows = await db
    .select({
      id: expense.id,
      date: expense.date,
      description: expense.description,
      amountCents: expense.amountCents,
      categoryName: category.name,
    })
    .from(expense)
    .innerJoin(category, eq(category.id, expense.categoryId))
    .where(and(gte(expense.date, filters.from), lte(expense.date, filters.to)))
    .orderBy(desc(expense.date), asc(sql`lower(${expense.description})`))

  if (rows.length === 0) {
    return []
  }

  const tagsByExpenseId = new Map<string, string[]>()
  const tagRows = await db
    .select({ expenseId: expenseTag.expenseId, tagName: tag.name })
    .from(expenseTag)
    .innerJoin(tag, eq(tag.id, expenseTag.tagId))

  for (const row of tagRows) {
    const bucket = tagsByExpenseId.get(row.expenseId)
    if (bucket) {
      bucket.push(row.tagName)
    } else {
      tagsByExpenseId.set(row.expenseId, [row.tagName])
    }
  }

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    description: row.description,
    categoryName: row.categoryName,
    amountCents: row.amountCents,
    tagNames: tagsByExpenseId.get(row.id) ?? [],
  }))
}
