/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Read helpers for expense summaries.
 * @module lib/db/summary-access
 */
import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { Result } from 'true-myth'

import { category, expense, expenseTag, tag } from '../../db/schema'
import type { DrizzleClient } from '../../local-types'
import { withRetry } from '../db-helpers'
import { monthKeyEt, quarterKeyEt, yearKeyEt } from '../et-date'

export type SummaryDimension = 'time' | 'category' | 'tag' | 'category-tag'
export type SummaryGranularity = 'month' | 'quarter' | 'year'

export interface SummarizeFilters {
  from?: string
  to?: string
  tagIds?: string[]
}

export interface SummarizeSort {
  column: string
  direction: 'asc' | 'desc'
}

export interface SummarizeInput {
  dimension: SummaryDimension
  granularity: SummaryGranularity
  filters: SummarizeFilters
  sort?: SummarizeSort[]
}

export interface SummaryRow {
  timePeriod: string
  categoryName?: string
  tagName?: string
  count: number
  totalCents: number
}

/** Return WHERE conditions for the date bounds in `filters`. */
const buildDateConditions = (filters: SummarizeFilters): ReturnType<typeof eq>[] => {
  const conditions: ReturnType<typeof eq>[] = []
  if (filters.from && filters.from.length > 0) {
    conditions.push(gte(expense.date, filters.from))
  }
  if (filters.to && filters.to.length > 0) {
    conditions.push(lte(expense.date, filters.to))
  }
  return conditions
}

/** Return the time-period key function for the given granularity. */
const pickTimePeriodFn = (granularity: SummaryGranularity): ((ymd: string) => string) =>
  granularity === 'year' ? yearKeyEt : granularity === 'quarter' ? quarterKeyEt : monthKeyEt

/**
 * Resolve tag-AND filter: return the expense ids that carry ALL `tagIds`, or
 * `null` when no filter is active, or an empty array when the filter matches
 * nothing (allowing the caller to short-circuit).
 */
const resolveTagAndIds = async (
  db: DrizzleClient,
  tagIds: string[] | undefined,
): Promise<string[] | null> => {
  if (!Array.isArray(tagIds) || tagIds.length === 0) {
    return null
  }
  const rows = await db
    .select({ expenseId: expenseTag.expenseId })
    .from(expenseTag)
    .where(inArray(expenseTag.tagId, tagIds))
    .groupBy(expenseTag.expenseId)
    .having(sql`count(distinct ${expenseTag.tagId}) = ${tagIds.length}`)
  return rows.map((r) => r.expenseId)
}

/** Mutable accumulator matching `SummaryRow` used only inside `summarizeActual`. */
type MutableRow = {
  timePeriod: string
  categoryName?: string
  tagName?: string
  count: number
  totalCents: number
}

const accumulate = (map: Map<string, MutableRow>, key: string, row: MutableRow): void => {
  const existing = map.get(key)
  if (existing) {
    existing.totalCents += row.totalCents
    existing.count += row.count
  } else {
    map.set(key, row)
  }
}

/**
 * Aggregate expenses into summary rows for the given dimension and granularity.
 */
export const summarize = (
  db: DrizzleClient,
  input: SummarizeInput,
): Promise<Result<SummaryRow[], Error>> =>
  withRetry('summarize', () => summarizeActual(db, input))

const summarizeActual = async (
  db: DrizzleClient,
  input: SummarizeInput,
): Promise<Result<SummaryRow[], Error>> => {
  try {
    const { dimension, granularity, filters, sort } = input

    const conditions = buildDateConditions(filters)

    const tagAndIds = await resolveTagAndIds(db, filters.tagIds)
    if (tagAndIds !== null) {
      if (tagAndIds.length === 0) return Result.ok([])
      conditions.push(inArray(expense.id, tagAndIds))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const expenseRows = await db
      .select({
        id: expense.id,
        date: expense.date,
        amountCents: expense.amountCents,
        categoryName: category.name,
      })
      .from(expense)
      .innerJoin(category, eq(category.id, expense.categoryId))
      .where(whereClause)
      .orderBy(asc(expense.date))

    if (expenseRows.length === 0) {
      return Result.ok([])
    }

    const needsTags = dimension === 'tag' || dimension === 'category-tag'
    const tagsByExpense = new Map<string, string[]>()
    if (needsTags) {
      const expenseIds = expenseRows.map((r) => r.id)
      const tagRows = await db
        .select({ expenseId: expenseTag.expenseId, tagName: tag.name })
        .from(expenseTag)
        .innerJoin(tag, eq(tag.id, expenseTag.tagId))
        .where(inArray(expenseTag.expenseId, expenseIds))
      for (const tr of tagRows) {
        const bucket = tagsByExpense.get(tr.expenseId)
        if (bucket) {
          bucket.push(tr.tagName)
        } else {
          tagsByExpense.set(tr.expenseId, [tr.tagName])
        }
      }
    }

    const timePeriodFn = pickTimePeriodFn(granularity)
    const groupMap = new Map<string, MutableRow>()

    for (const row of expenseRows) {
      const timePeriod = timePeriodFn(row.date)
      const catName = row.categoryName

      if (dimension === 'time') {
        accumulate(groupMap, timePeriod, { timePeriod, count: 1, totalCents: row.amountCents })
      } else if (dimension === 'category') {
        accumulate(groupMap, `${catName}\0${timePeriod}`, {
          timePeriod,
          categoryName: catName,
          count: 1,
          totalCents: row.amountCents,
        })
      } else {
        const expenseTags = tagsByExpense.get(row.id)
        if (!expenseTags || expenseTags.length === 0) continue
        for (const tagName of expenseTags) {
          const key =
            dimension === 'tag'
              ? `${tagName}\0${timePeriod}`
              : `${catName}\0${tagName}\0${timePeriod}`
          accumulate(groupMap, key, {
            timePeriod,
            tagName,
            ...(dimension === 'category-tag' ? { categoryName: catName } : {}),
            count: 1,
            totalCents: row.amountCents,
          })
        }
      }
    }

    let rows = Array.from(groupMap.values()) as SummaryRow[]

    if (sort && sort.length > 0) {
      rows = rows.sort((a, b) => {
        for (const s of sort) {
          const av = (a as unknown as Record<string, unknown>)[s.column]
          const bv = (b as unknown as Record<string, unknown>)[s.column]
          if (av === bv) continue
          const cmp =
            typeof av === 'number' && typeof bv === 'number'
              ? av - bv
              : String(av ?? '').localeCompare(String(bv ?? ''))
          return s.direction === 'desc' ? -cmp : cmp
        }
        return 0
      })
    } else {
      rows = rows.sort((a, b) => {
        const catCmp = (a.categoryName ?? '').localeCompare(b.categoryName ?? '')
        if (catCmp !== 0) return catCmp
        const tagCmp = (a.tagName ?? '').localeCompare(b.tagName ?? '')
        if (tagCmp !== 0) return tagCmp
        return a.timePeriod.localeCompare(b.timePeriod)
      })
    }

    return Result.ok(rows)
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)))
  }
}
