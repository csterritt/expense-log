#!/usr/bin/env -S npx tsx

/**
 * Reads a JSON array of expenses from stdin:
 *   [{ id, description, amountCents, categoryId, date: 'YYYY-MM-DD', ... }]
 *
 * Looks up category names in data/all-cat-remote.json ([{ id, name }])
 * and writes CSV to stdout:
 *   amount (dollars), date (MM/DD/YYYY), description, category name
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

interface Category {
  id: string
  name: string
}

interface Expense {
  description: string
  amountCents: number
  categoryId: string | null
  date: string
}

const csvField = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

const formatDate = (date: string): string | null => {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return null
  }
  const [, year, month, day] = match
  return `${month}/${day}/${year}`
}

const main = async (): Promise<void> => {
  const categoriesPath = join(import.meta.dirname, '..', 'data', 'all-cat-remote.json')
  const categories: Category[] = JSON.parse(await readFile(categoriesPath, 'utf-8'))
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]))

  const chunks: string[] = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk.toString())
  }
  const expenses: Expense[] = JSON.parse(chunks.join(''))

  process.stdout.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EPIPE') {
      process.exit(0)
    }
    throw err
  })

  let hadErrors = false

  expenses.forEach((expense, i) => {
    const date = formatDate(expense.date)
    if (date === null) {
      console.error(`expense ${i}: invalid date '${expense.date}'`)
      hadErrors = true
      return
    }

    let category = ''
    if (expense.categoryId !== null) {
      const name = categoryNames.get(expense.categoryId)
      if (name === undefined) {
        console.error(`expense ${i}: unknown categoryId '${expense.categoryId}'`)
        hadErrors = true
      } else {
        category = name
      }
    }

    const amount = (expense.amountCents / 100).toFixed(2)
    console.log([amount, date, expense.description, category].map(csvField).join(','))
  })

  if (hadErrors) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
