/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Read/write helpers for expense summaries.
 * @module lib/db/summary-access
 */
import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { Result } from 'true-myth'

import { category, expense, expenseTag, tag } from '../../db/schema'
import type { DrizzleClient } from '../../local-types'
import { withRetry } from '../db-helpers'
import { monthKeyEt, yearKeyEt } from '../et-date'

export interface SummaryRow {
  dateKey: string
  categoryName: string
  tagName: string
  totalCents: number
  count: number
}

export interface SummarizeFilters {
  groupBy: 'month' | 'year'
  from: string
  to: string
  categoryId?: string
  tagIds?: string[]
  tagMode?: 'or' | 'and'
}

export const summarize = (
  db: DrizzleClient,
  filters: SummarizeFilters,
): Promise<Result<SummaryRow[], Error>> =>
  withRetry('summarize', () => summarizeActual(db, filters))

const summarizeActual = async (
  db: DrizzleClient,
  filters: SummarizeFilters,
): Promise<Result<SummaryRow[], Error>> => {
  try {
    const keyFn = filters.groupBy === 'year' ? yearKeyEt : monthKeyEt

    const conditions = [
      gte(expense.date, filters.from),
      lte(expense.date, filters.to),
    ]
    if (filters.categoryId) {
      conditions.push(eq(expense.categoryId, filters.categoryId))
    }

    const expenseRows = await db
      .select({
        id: expense.id,
        date: expense.date,
        amountCents: expense.amountCents,
        categoryName: category.name,
      })
      .from(expense)
      .innerJoin(category, eq(category.id, expense.categoryId))
      .where(and(...conditions))
      .orderBy(asc(expense.date))

    const expenseIds = expenseRows.map((r) => r.id)
    let tagRows: { expenseId: string; tagName: string }[] = []
    if (expenseIds.length > 0) {
      tagRows = await db
        .select({
          expenseId: expenseTag.expenseId,
          tagName: tag.name,
        })
        .from(expenseTag)
        .innerJoin(tag, eq(expenseTag.tagId, tag.id))
        .where(inArray(expenseTag.expenseId, expenseIds))
    }

    const tagsByExpense = new Map<string, string[]>()
    for (const tr of tagRows) {
      const list = tagsByExpense.get(tr.expenseId)
      if (list) {
        list.push(tr.tagName)
      } else {
        tagsByExpense.set(tr.expenseId, [tr.tagName])
      }
    }

    // Resolve tag ID filters to tag names when needed
    let tagNameFilter: Set<string> | null = null
    if (filters.tagIds && filters.tagIds.length > 0) {
      const tagNameRows = await db
        .select({ name: tag.name })
        .from(tag)
        .where(inArray(tag.id, filters.tagIds))
      tagNameFilter = new Set(tagNameRows.map((r) => r.name))
    }
    const tagMode = filters.tagMode ?? 'or'

    const groupMap = new Map<string, SummaryRow>()

    for (const row of expenseRows) {
      const dateKey = keyFn(row.date)
      const catName = row.categoryName
      const expenseTags = tagsByExpense.get(row.id) ?? []

      // Apply tag filtering
      if (tagNameFilter) {
        if (tagMode === 'or') {
          if (!expenseTags.some((t) => tagNameFilter!.has(t))) {
            continue
          }
        } else {
          // AND mode: expense must have ALL filter tags
          const expenseTagSet = new Set(expenseTags)
          let hasAll = true
          for (const fn of tagNameFilter) {
            if (!expenseTagSet.has(fn)) {
              hasAll = false
              break
            }
          }
          if (!hasAll) {
            continue
          }
        }
      }

      if (expenseTags.length === 0) {
        const key = `${dateKey}|${catName}|`
        const existing = groupMap.get(key)
        if (existing) {
          existing.totalCents += row.amountCents
          existing.count += 1
        } else {
          groupMap.set(key, {
            dateKey,
            categoryName: catName,
            tagName: '',
            totalCents: row.amountCents,
            count: 1,
          })
        }
      } else {
        for (const tagName of expenseTags) {
          const key = `${dateKey}|${catName}|${tagName}`
          const existing = groupMap.get(key)
          if (existing) {
            existing.totalCents += row.amountCents
            existing.count += 1
          } else {
            groupMap.set(key, {
              dateKey,
              categoryName: catName,
              tagName,
              totalCents: row.amountCents,
              count: 1,
            })
          }
        }
      }
    }

    const sorted = Array.from(groupMap.values()).sort((a, b) => {
      if (a.dateKey !== b.dateKey) {
        return a.dateKey < b.dateKey ? -1 : 1
      }
      if (a.categoryName !== b.categoryName) {
        return a.categoryName < b.categoryName ? -1 : 1
      }
      if (a.tagName !== b.tagName) {
        return a.tagName < b.tagName ? -1 : 1
      }
      return 0
    })

    return Result.ok(sorted)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}
