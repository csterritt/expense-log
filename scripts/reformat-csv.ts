#!/usr/bin/env -S npx tsx

/**
 * Reads CSV from stdin where each row has three or four non-blank fields:
 *   description, amount, date[, category]
 *
 * Dates are of the form M/D/YY or M/D; output is MM/DD/YYYY with the
 * year assumed to be in the 2000s (M/D dates get 2026).
 *
 * Writes CSV to stdout with reordered fields:
 *   amount, date, description[, category]
 */

export {}

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

const csvField = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

const normalizeDate = (date: string): string | null => {
  const match = date.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}))?$/)
  if (!match) {
    return null
  }
  const [, month, day, year] = match
  return `${month.padStart(2, '0')}/${day.padStart(2, '0')}/20${year ?? '26'}`
}

const main = async (): Promise<void> => {
  const chunks: string[] = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk.toString())
  }

  const lines = chunks.join('').split('\n')
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

    const [description, amount, date, category] = fields
    const normalizedDate = normalizeDate(date)
    if (normalizedDate === null) {
      console.error(`line ${i + 1}: invalid date '${date}'`)
      hadErrors = true
      continue
    }

    const out = [amount, normalizedDate, description]
    if (category) {
      out.push(category)
    }
    console.log(out.map(csvField).join(','))
  }

  if (hadErrors) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
