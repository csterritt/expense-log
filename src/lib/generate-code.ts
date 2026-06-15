/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export const generateToken = async () => {
  // Generate a cryptographically secure random token
  // 8 alphanumeric characters = 62^8 ≈ 218 trillion possibilities
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  let token = ''
  for (const byte of bytes) {
    token += chars[byte % chars.length]
  }
  return token
}
