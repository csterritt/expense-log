import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'

import { HTML_STATUS } from '../src/constants'
import { renderer } from '../src/renderer'
import { renderExpenseLoadError } from '../src/routes/expenses/expense-get-handler'

describe('expense list load failure', () => {
  it('renders a terminal error response instead of redirecting to sign-in', async () => {
    const app = new Hono()
    app.use(renderer)
    app.get('/', (c) => renderExpenseLoadError(c))

    const response = await app.request('/')

    expect(response.status).toBe(HTML_STATUS.INTERNAL_SERVER_ERROR)
    expect(response.headers.get('location')).toBeNull()
    expect(await response.text()).toContain('Failed to load expenses. Please try again.')
  })
})
