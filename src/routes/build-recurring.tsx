/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the recurring templates list page.
 * @module routes/buildRecurring
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS } from '../constants'
import { Bindings } from '../local-types'
import { createDbClient } from '../db/client'
import { useLayout } from './build-layout'
import { signedInAccess } from '../middleware/signed-in-access'
import { listRecurring } from '../lib/db/expense-access'
import { redirectWithError } from '../lib/redirects'
import { formatCents } from '../lib/money'
import { todayEt } from '../lib/et-date'
import { nextOccurrenceAfter } from '../lib/recurrence'

type RecurringListRow = {
  id: string
  description: string
  amountCents: number
  categoryName: string
  tagNames: string[]
  recurrence: 'Monthly' | 'Quarterly' | 'Yearly'
  anchorDate: string
}

const computeNextOccurrence = (row: RecurringListRow, today: string): string => {
  try {
    return nextOccurrenceAfter({
      recurrence: row.recurrence,
      anchorDate: row.anchorDate,
      after: today,
    })
  } catch {
    // TODO(Issue 14): Quarterly and Yearly not yet implemented
    return '—'
  }
}

const renderRecurringList = (rows: RecurringListRow[], today: string) => {
  return (
    <div data-testid='recurring-page'>
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-2xl font-bold'>Recurring</h1>
        <a href='/recurring/new' className='btn btn-primary' data-testid='recurring-new'>
          New recurring
        </a>
      </div>
      {rows.length === 0 ? (
        <p className='text-base-content/60' data-testid='recurring-empty'>No recurring templates yet.</p>
      ) : (
        <div className='overflow-x-auto'>
          <table className='table table-zebra w-full'>
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Tags</th>
                <th>Recurrence</th>
                <th>Anchor date</th>
                <th>Next occurrence</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} data-testid='recurring-row'>
                  <td data-testid='recurring-row-description'>{row.description}</td>
                  <td data-testid='recurring-row-amount'>{formatCents(row.amountCents)}</td>
                  <td data-testid='recurring-row-category'>{row.categoryName}</td>
                  <td data-testid='recurring-row-tags'>{row.tagNames.join(', ')}</td>
                  <td data-testid='recurring-row-recurrence'>{row.recurrence}</td>
                  <td data-testid='recurring-row-anchor-date'>{row.anchorDate}</td>
                  <td data-testid='recurring-row-next-occurrence'>{computeNextOccurrence(row, today)}</td>
                  <td>
                    <a
                      href={`/recurring/${row.id}/edit`}
                      className='btn btn-sm btn-ghost'
                      data-testid='recurring-row-edit'
                    >
                      Edit
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export const buildRecurring = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.RECURRING,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const db = createDbClient(c.env.PROJECT_DB)
      const result = await listRecurring(db)
      if (result.isErr) {
        return redirectWithError(c, PATHS.EXPENSES, 'Failed to load recurring templates. Please try again.')
      }
      const today = todayEt()
      return c.render(useLayout(c, renderRecurringList(result.value as RecurringListRow[], today)))
    },
  )
}
