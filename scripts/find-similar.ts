#!/usr/bin/env -S npx tsx

/**
 * Reads CSV from stdin where each row has three or four fields:
 *   amount, date, description[, category]
 *
 * Dates are of the form MM/DD/YYYY (M/D/YY also accepted, year assumed
 * to be in the 2000s).
 *
 * Compares all rows pairwise; two rows are "similar" when their amounts
 * differ by at most MAX_AMOUNT_DIFF_CENTS and their dates differ by at most MAX_DATE_DIFF_DAYS days.
 * Description and category are ignored for comparison.
 *
 * Writes each matching pair to stdout as the two original CSV lines,
 * with a blank line between pairs.
 */

export {}

const MAX_AMOUNT_DIFF_CENTS = 20
const MAX_DATE_DIFF_DAYS = 4
const MS_PER_DAY = 24 * 60 * 60 * 1000

interface Row {
  line: string
  cents: number
  day: number
}

const parseCsvLine = (line: string): string[] => {
  const fields: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      fields.push(field)
      field = ''
    } else {
      field += c
    }
  }
  fields.push(field)
  return fields
}

const parseDate = (date: string): number | null => {
  const match = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  if (!match) {
    return null
  }
  const [, month, day, yearStr] = match
  const year = yearStr.length === 2 ? 2000 + Number(yearStr) : Number(yearStr)
  const ms = Date.UTC(year, Number(month) - 1, Number(day))
  return ms / MS_PER_DAY
}

const main = async (): Promise<void> => {
  const chunks: string[] = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk.toString())
  }

  const lines = chunks.join('').split('\n')
  const rows: Row[] = []
  let hadErrors = false

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].replace(/\r$/, '')
    if (!raw.trim()) {
      continue
    }

    const fields = parseCsvLine(raw).map((f) => f.trim())
    while (fields.length > 0 && fields[fields.length - 1] === '') {
      fields.pop()
    }

    if (fields.length !== 3 && fields.length !== 4) {
      console.error(`line ${i + 1}: expected 3 or 4 fields, got ${fields.length}: ${raw}`)
      hadErrors = true
      continue
    }

    const [amount, date] = fields
    const cents = Math.round(Number(amount) * 100)
    if (!Number.isFinite(cents)) {
      console.error(`line ${i + 1}: invalid amount '${amount}'`)
      hadErrors = true
      continue
    }

    const day = parseDate(date)
    if (day === null) {
      console.error(`line ${i + 1}: invalid date '${date}'`)
      hadErrors = true
      continue
    }

    rows.push({ line: raw, cents, day })
  }

  let firstPair = true
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const amountClose = Math.abs(rows[i].cents - rows[j].cents) <= MAX_AMOUNT_DIFF_CENTS
      const dateClose = Math.abs(rows[i].day - rows[j].day) <= MAX_DATE_DIFF_DAYS
      if (amountClose && dateClose) {
        if (!firstPair) {
          console.log('')
        }
        firstPair = false
        console.log(rows[i].line)
        console.log(rows[j].line)
      }
    }
  }

  if (hadErrors) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
