import {createMiddleware} from 'npm:hono/factory'
import {decodeHex, encodeHex} from 'https://deno.land/std/encoding/hex.ts'
import {concat} from 'https://deno.land/std/bytes/concat.ts'

const encoder = new TextEncoder()

/**
 * Verify {@linkcode Request} signature using {@linkcode CryptoKey}(publicKey).
 * - header `X-Signature-Ed25519`
 * - header `X-Signature-Timestamp`
 * - payload (X-Signature-Timestamp + body)
 */
export const verifyRequestSignature = (key: CryptoKey) => {
  return createMiddleware(async (c, next) => {
    const signature = c.req.raw.headers.get('X-Signature-Ed25519')
    const timestamp = c.req.raw.headers.get('X-Signature-Timestamp')
    const body = new Uint8Array(await c.req.raw.clone().arrayBuffer())

    if (signature === null || timestamp === null) {
      return c.json({error: 'Bad request signature'}, 401)
    }

    const valid = await crypto.subtle.verify(
      key.algorithm,
      key,
      decodeHex(signature),
      concat([encoder.encode(timestamp), body]) // (timestamp + body)
    )
    if (!valid) return c.json({error: 'Bad request signature'}, 401)

    await next()
  })
}

/**
 * Add signature to {@linkcode Response}.
 * - set header `X-Signature-Ed25519` (timestamp + body)
 * - set header `X-Signature-Timestamp`
 */
export const signResponse = (key: CryptoKey) => {
  return createMiddleware(async (c, next) => {
    await next() // Response

    const body = new Uint8Array(await c.req.raw.clone().arrayBuffer())
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const signature = await crypto.subtle.sign(
      'Ed25519',
      key,
      concat([encoder.encode(timestamp), body]) // (timestamp + body)
    )

    c.header('X-Signature-Ed25519', encodeHex(signature))
    c.header('X-Signature-Timestamp', timestamp)
  })
}
