import {concat, hHelpers, hex} from "../deps.ts"

const encoder = new TextEncoder()

/**
 * Add signature to {@linkcode Response}.
 * - set header `X-Signature-Ed25519` (timestamp + body)
 * - set header `X-Signature-Timestamp`
 */
export const useSign = (key: CryptoKey) => {
  return hHelpers.createMiddleware(async (c, next) => {
    await next() // Response

    const body = await c.res.clone().arrayBuffer()
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const signature = await crypto.subtle.sign(
      'Ed25519',
      key,
      concat(encoder.encode(timestamp), new Uint8Array(body)) // (timestamp + body)
    )

    c.header('X-Signature-Ed25519', hex.encodeHex(signature))
    c.header('X-Signature-Timestamp', timestamp)
  })
}
