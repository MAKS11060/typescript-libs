import {concat, hHelpers, hex} from "../deps.ts"

const encoder = new TextEncoder()

/**
 * Verify {@linkcode Request} signature using `publicKey`.
 * - get header `X-Signature-Ed25519` (timestamp + body)
 * - get header `X-Signature-Timestamp`
 */
export const useVerify = (key: CryptoKey) => {
  return hHelpers.createMiddleware(async (c, next) => {
    const signature = c.req.raw.headers.get('X-Signature-Ed25519')
    const timestamp = c.req.raw.headers.get('X-Signature-Timestamp')
    const body = await c.req.raw.clone().arrayBuffer()

    if (signature === null || timestamp === null) {
      return c.json({error: 'Bad request signature'}, 401)
    }

    const valid = await crypto.subtle.verify(
      key.algorithm,
      key,
      hex.decodeHex(signature),
      concat(encoder.encode(timestamp), new Uint8Array(body)) // (timestamp + body)
    )

    if (!valid) return c.json({error: 'Bad request signature'}, 401)
    await next()
  })
}
