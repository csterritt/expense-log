/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Submission idempotency backbone.
 *
 * `withIdempotency` records a committing mutation's server-generated
 * `submissionKey` (a ULID) alongside the write and detects replays: a fresh,
 * well-formed key runs the work and stores its outcome; a duplicate key
 * short-circuits to the previously stored outcome without repeating the
 * write; an absent or malformed key runs the work exactly once with no dedupe
 * so a legitimate submit is never blocked.
 *
 * @module lib/submission-idempotency
 */
import { eq, lt } from 'drizzle-orm'
import { Result } from 'true-myth'

import { submissionKey } from '../db/schema'
import type { DrizzleClient } from '../local-types'
import { toResult } from './db-helpers'

// Ledger rows older than this are pruned opportunistically so the table does
// not grow unbounded. A short window is enough: retries happen within seconds.
const LEDGER_TTL_MS = 24 * 60 * 60 * 1000 // ~24 hours

/**
 * The persisted result of a committing submission — enough to replay the
 * original post-redirect-get (its redirect target plus flash message).
 */
export interface SubmissionOutcome {
  path: string
  message: string
}

/**
 * Arguments for {@link withIdempotency}.
 *
 * `run` performs the mutation and returns the outcome to persist. It must
 * return `Result.err` to signal a validation/commit failure, in which case
 * no ledger row is recorded and the key remains resubmittable.
 */
export interface WithIdempotencyArgs {
  key: string
  userId: string
  run: () => Promise<Result<SubmissionOutcome, Error>>
}

/**
 * Ledger values that a mutation must include in its atomic D1 batch.
 */
export interface AtomicSubmission {
  key: string
  userId: string
  outcome: SubmissionOutcome
  createdAt: Date
}

/**
 * Arguments for {@link withAtomicIdempotency}.
 */
export interface WithAtomicIdempotencyArgs {
  key: string
  userId: string
  outcome: SubmissionOutcome
  run: (submission?: AtomicSubmission) => Promise<Result<unknown, Error>>
}

// Crockford base32 ULID: 26 chars, excluding I, L, O, U. Case-insensitive.
const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/i

/**
 * True when `key` is a well-formed Crockford-base32 ULID and therefore safe
 * to use as an idempotency ledger key.
 */
const isValidSubmissionKey = (key: unknown): key is string =>
  typeof key === 'string' && ULID_PATTERN.test(key)

/**
 * Parse a stored `outcome` string back into a {@link SubmissionOutcome}.
 * Returns `null` when the stored value is missing or malformed.
 */
const parseOutcome = (raw: string): SubmissionOutcome | null => {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as SubmissionOutcome).path === 'string' &&
      typeof (parsed as SubmissionOutcome).message === 'string'
    ) {
      const { path, message } = parsed as SubmissionOutcome
      return { path, message }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Build the ledger insert appended to the mutation's atomic D1 batch.
 */
export const buildAtomicSubmissionStatement = (db: DrizzleClient, submission: AtomicSubmission) =>
  db.insert(submissionKey).values({
    key: submission.key,
    userId: submission.userId,
    outcome: JSON.stringify(submission.outcome),
    createdAt: submission.createdAt,
  })

/**
 * Best-effort prune of ledger rows older than {@link LEDGER_TTL_MS}.
 *
 * Runs opportunistically after a successful write. Any failure is swallowed
 * and logged so a housekeeping problem can never turn a legitimate submission
 * into a failure.
 */
const pruneStaleLedgerRows = async (db: DrizzleClient): Promise<void> => {
  const cutoff = new Date(Date.now() - LEDGER_TTL_MS)
  const pruned = await toResult(() =>
    db.delete(submissionKey).where(lt(submissionKey.createdAt, cutoff)),
  )
  if (pruned.isErr) {
    console.log('submission-idempotency prune error:', pruned.error)
  }
}

/**
 * Run `run` idempotently, keyed off `key` for `userId`.
 *
 * - Fresh, well-formed key: runs `run`, records the ledger row on success,
 *   and returns the outcome.
 * - Duplicate key: returns the stored outcome without re-running `run`.
 * - `run` returns `Result.err`: no ledger row is recorded; the key stays
 *   resubmittable.
 * - Absent / malformed key: runs `run` exactly once with no dedupe.
 *
 * @param db - Drizzle database client (HTTP-agnostic; not a Hono context)
 * @param args - `{ key, userId, run }`
 * @returns The outcome to replay, or the error `run` reported
 */
export const withIdempotency = async (
  db: DrizzleClient,
  { key, userId, run }: WithIdempotencyArgs,
): Promise<Result<SubmissionOutcome, Error>> => {
  // Absent or malformed key: never dedupe, never block — just run once.
  if (!isValidSubmissionKey(key)) {
    return run()
  }

  // Replay check: return the stored outcome for an already-recorded key.
  const existing = await toResult(() =>
    db
      .select({ outcome: submissionKey.outcome })
      .from(submissionKey)
      .where(eq(submissionKey.key, key))
      .limit(1),
  )
  if (existing.isOk && existing.value.length > 0) {
    const stored = parseOutcome(existing.value[0].outcome)
    if (stored !== null) {
      return Result.ok(stored)
    }
    // Corrupt stored outcome — fall through and re-run the mutation.
  }

  // Fresh key (or unreadable ledger): perform the mutation.
  const result = await run()
  if (result.isErr) {
    // Validation / commit failure: record nothing, stay resubmittable.
    return result
  }

  // Record the key + its outcome so a later replay short-circuits here.
  await toResult(() =>
    db.insert(submissionKey).values({
      key,
      userId,
      outcome: JSON.stringify(result.value),
      createdAt: new Date(),
    }),
  )

  // Opportunistically prune stale rows (best-effort, never blocks the submit).
  await pruneStaleLedgerRows(db)

  return Result.ok(result.value)
}

/**
 * Run a mutation with its submission ledger insert in the same atomic batch.
 *
 * The supplied `run` callback must append the provided submission statement to
 * the same D1 batch as its mutation. When the key is absent or malformed, the
 * callback receives no submission and performs the mutation without dedupe.
 */
export const withAtomicIdempotency = async (
  db: DrizzleClient,
  { key, userId, outcome, run }: WithAtomicIdempotencyArgs,
): Promise<Result<SubmissionOutcome, Error>> => {
  if (!isValidSubmissionKey(key)) {
    const result = await run()
    return result.isErr ? Result.err(result.error) : Result.ok(outcome)
  }

  const readOutcome = () =>
    toResult(() =>
      db
        .select({ outcome: submissionKey.outcome })
        .from(submissionKey)
        .where(eq(submissionKey.key, key))
        .limit(1),
    )

  const existing = await readOutcome()
  if (existing.isErr) {
    return Result.err(existing.error)
  }
  if (existing.value.length > 0) {
    const stored = parseOutcome(existing.value[0].outcome)
    if (stored !== null) {
      return Result.ok(stored)
    }
  }

  const result = await run({ key, userId, outcome, createdAt: new Date() })
  if (result.isErr) {
    const raced = await readOutcome()
    if (raced.isOk && raced.value.length > 0) {
      const stored = parseOutcome(raced.value[0].outcome)
      if (stored !== null) {
        return Result.ok(stored)
      }
    }
    return Result.err(result.error)
  }

  await pruneStaleLedgerRows(db)
  return Result.ok(outcome)
}
