/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Centralized origin configuration for auth, CSRF, CSP, and cookie settings.
 * All host-specific values are defined here and derived from a single source
 * of truth, eliminating the duplication and inconsistency described in
 * review Finding 7.
 * @module lib/origin-config
 */
import type { Bindings } from '../local-types'

/**
 * The canonical production origin for the application.
 * This is the primary domain used for Better Auth baseURL, CSP, and cookie settings.
 */
export const CANONICAL_ORIGIN = 'https://expenses.cls.cloud'

/**
 * Static list of always-trusted origins (canonical + Workers hostname).
 * These are origins that the application is known to serve from.
 */
export const STATIC_TRUSTED_ORIGINS: readonly string[] = [
  CANONICAL_ORIGIN,
  'https://expense-log.cleverfox.workers.dev',
] as const

/**
 * Returns the canonical origin for the application.
 * In production this is the primary domain; in development it falls back
 * to the canonical origin since Better Auth and CSRF use the trusted origins list.
 * @returns The canonical origin URL string
 */
export const getCanonicalOrigin = (): string => CANONICAL_ORIGIN

/**
 * Returns the full list of trusted origins, including any dynamic
 * ALTERNATE_ORIGIN from environment bindings.
 * @param env - Cloudflare environment bindings
 * @returns Array of trusted origin URL strings
 */
export const getTrustedOrigins = (env: Bindings): string[] => {
  const origins = [...STATIC_TRUSTED_ORIGINS]

  if (env.ALTERNATE_ORIGIN) {
    const cleaned = env.ALTERNATE_ORIGIN.replace(/^\$/, '')
    if (cleaned) {
      origins.push(cleaned)
    }
  }

  return origins
}

/**
 * Returns a predicate function that checks whether a given origin is allowed.
 * Used by Hono's CSRF middleware.
 * @param env - Cloudflare environment bindings
 * @returns A function that returns true if the origin is trusted
 */
export const isOriginAllowed = (env: Bindings): ((origin: string) => boolean) => {
  const trusted = getTrustedOrigins(env)
  return (origin: string): boolean => {
    if (!origin) {
      return false
    }
    return trusted.includes(origin)
  }
}
