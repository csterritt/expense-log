import { describe, expect, it } from 'bun:test'

import { isTestRouteEnabled } from '../src/lib/test-routes'

const TEST_ROUTE_CONFIGS = [
  {
    name: 'disabled by default in development',
    config: { nodeEnv: 'development' },
    expected: false,
  },
  {
    name: 'enabled by the explicit development flag',
    config: { nodeEnv: 'development', enableTestRoutes: 'true' },
    expected: true,
  },
  {
    name: 'enabled by the Playwright flag outside production',
    config: { nodeEnv: 'test', playwright: '1' },
    expected: true,
  },
  {
    name: 'disabled in production despite the explicit flag',
    config: { nodeEnv: 'production', enableTestRoutes: 'true' },
    expected: false,
  },
  {
    name: 'disabled in production despite the Playwright flag',
    config: { nodeEnv: 'production', playwright: '1' },
    expected: false,
  },
] as const

describe('isTestRouteEnabled', () => {
  for (const { name, config, expected } of TEST_ROUTE_CONFIGS) {
    it(name, () => {
      expect(isTestRouteEnabled(config)).toBe(expected)
    })
  }
})
