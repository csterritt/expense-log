/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * HMAC-SHA-256 signing utilities for expense confirmation payloads.
 *
 * Produces a hex signature over the canonical JSON representation of a
 * `ConfirmationPayload`. The caller stores the signature in a hidden form
 * field and the confirm handler verifies it before any further processing.
 *
 * Fail-closed: `verifyConfirmationPayload` returns `false` whenever the
 * signing key is absent or the crypto operation fails.
 *
 * @module lib/confirmation-hmac
 */

/**
 * The fields that are covered by the HMAC signature on the confirmation page.
 * Any hidden-field tampering outside this set is still caught by full
 * revalidation in the confirm handler.
 */
export type ConfirmationPayload = {
  description: string
  amount: string
  date: string
  category: string
  tagIds: string[]
  newTags: string
}

/**
 * Produce a deterministic canonical string for the payload so that tag-id
 * ordering is stable. Tags are sorted before serialisation.
 */
const canonicalize = (payload: ConfirmationPayload): string =>
  JSON.stringify({
    description: payload.description,
    amount: payload.amount,
    date: payload.date,
    category: payload.category,
    tagIds: payload.tagIds.slice().sort(),
    newTags: payload.newTags,
  })

const encodeKey = (key: string): Uint8Array => new TextEncoder().encode(key)
const encodeData = (data: string): Uint8Array => new TextEncoder().encode(data)

const importKey = (rawKey: string): Promise<CryptoKey> =>
  crypto.subtle.importKey(
    'raw',
    encodeKey(rawKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )

const toHex = (buf: ArrayBuffer): string =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

const signCanonical = async (canonical: string, key: string): Promise<string> => {
  const cryptoKey = await importKey(key)
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, encodeData(canonical))
  return toHex(sig)
}

const verifyCanonical = async (
  canonical: string,
  signature: string,
  key: string | undefined,
): Promise<boolean> => {
  if (!key) {
    return false
  }
  try {
    const cryptoKey = await importKey(key)
    const expectedHex = toHex(
      await crypto.subtle.sign('HMAC', cryptoKey, encodeData(canonical)),
    )
    if (expectedHex.length !== signature.length) {
      return false
    }
    let diff = 0
    for (let i = 0; i < expectedHex.length; i++) {
      diff |= expectedHex.charCodeAt(i) ^ signature.charCodeAt(i)
    }
    return diff === 0
  } catch {
    return false
  }
}

/**
 * Sign a `ConfirmationPayload` with HMAC-SHA-256 and return a hex string.
 *
 * @param payload - The fields to protect
 * @param key - The signing key (e.g. `CONFIRMATION_SIGNING_KEY` Worker secret)
 */
export const signConfirmationPayload = (
  payload: ConfirmationPayload,
  key: string,
): Promise<string> => signCanonical(canonicalize(payload), key)

/**
 * Verify that `signature` was produced by `signConfirmationPayload` over
 * `payload` with `key`. Returns `false` when the key is absent or any crypto
 * operation throws — fail-closed by design.
 *
 * @param payload - The fields to verify
 * @param signature - The hex signature from the hidden form field
 * @param key - The signing key; `undefined` causes an immediate `false` return
 */
export const verifyConfirmationPayload = (
  payload: ConfirmationPayload,
  signature: string,
  key: string | undefined,
): Promise<boolean> => verifyCanonical(canonicalize(payload), signature, key)

/**
 * The fields covered by the HMAC signature on the recurring confirmation page.
 * Uses `recurrence` and `anchorDate` instead of `date`.
 */
export type RecurringConfirmationPayload = {
  description: string
  amount: string
  recurrence: string
  anchorDate: string
  category: string
  tagIds: string[]
  newTags: string
}

const canonicalizeRecurring = (payload: RecurringConfirmationPayload): string =>
  JSON.stringify({
    description: payload.description,
    amount: payload.amount,
    recurrence: payload.recurrence,
    anchorDate: payload.anchorDate,
    category: payload.category,
    tagIds: payload.tagIds.slice().sort(),
    newTags: payload.newTags,
  })

/**
 * Sign a `RecurringConfirmationPayload` with HMAC-SHA-256 and return a hex string.
 *
 * @param payload - The fields to protect
 * @param key - The signing key (e.g. `CONFIRMATION_SIGNING_KEY` Worker secret)
 */
export const signRecurringConfirmationPayload = (
  payload: RecurringConfirmationPayload,
  key: string,
): Promise<string> => signCanonical(canonicalizeRecurring(payload), key)

/**
 * Verify that `signature` was produced by `signRecurringConfirmationPayload`
 * over `payload` with `key`. Returns `false` when the key is absent or any
 * crypto operation throws — fail-closed by design.
 *
 * @param payload - The fields to verify
 * @param signature - The hex signature from the hidden form field
 * @param key - The signing key; `undefined` causes an immediate `false` return
 */
export const verifyRecurringConfirmationPayload = (
  payload: RecurringConfirmationPayload,
  signature: string,
  key: string | undefined,
): Promise<boolean> => verifyCanonical(canonicalizeRecurring(payload), signature, key)
