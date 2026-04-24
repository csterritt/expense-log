/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Route builder for the expenses list page.
 * @module routes/expenses/buildExpenses
 */
import { Context, Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'

import { PATHS, STANDARD_SECURE_HEADERS } from '../../constants'
import { Bindings } from '../../local-types'
import { useLayout } from '../build-layout'
import { signedInAccess } from '../../middleware/signed-in-access'
import { defaultRangeEt } from '../../lib/et-date'
import { listExpenses, type ExpenseRow } from '../../lib/expense-repo'
import { formatCents } from '../../lib/money'

const renderExpenseTable = (rows: ExpenseRow[]) => {
  return (
    <div className='overflow-x-auto'>
      <table className='table table-zebra w-full' data-testid='expenses-table'>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Tags</th>
            <th className='text-right'>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr data-testid='expense-row' data-expense-id={row.id}>
              <td data-testid='expense-row-date'>{row.date}</td>
              <td data-testid='expense-row-description'>{row.description}</td>
              <td data-testid='expense-row-category'>{row.categoryName}</td>
              <td data-testid='expense-row-tags'>{row.tagNames.join(', ')}</td>
              <td className='text-right' data-testid='expense-row-amount'>
                {formatCents(row.amountCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const renderExpenses = (rows: ExpenseRow[]) => {
  return (
    <div data-testid='expenses-page'>
      <h1 className='text-2xl font-bold mb-4'>Expenses</h1>
      {rows.length === 0 ? (
        <p className='text-gray-600' data-testid='expenses-empty-state'>
          No expenses yet
        </p>
      ) : (
        renderExpenseTable(rows)
      )}
    </div>
  )
}

export const buildExpenses = (app: Hono<{ Bindings: Bindings }>): void => {
  app.get(
    PATHS.EXPENSES,
    secureHeaders(STANDARD_SECURE_HEADERS),
    signedInAccess,
    async (c: Context<{ Bindings: Bindings }>) => {
      const range = defaultRangeEt()
      const rows = await listExpenses(c, range)
      return c.render(useLayout(c, renderExpenses(rows)))
    },
  )
}
