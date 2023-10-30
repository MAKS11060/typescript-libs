import {hHelpers, hex} from "./deps.ts"

export const getCryptoKey = (verify_key: string): Promise<CryptoKey> => {
  return crypto.subtle.importKey(
    'raw',
    hex.decodeHex(verify_key),
    'Ed25519',
    true,
    ['verify'],
  )
}

export const verify = async (request: Request, key: CryptoKey) => {
  const signature = request.headers.get('X-Signature-Ed25519')
  const timestamp = request.headers.get('X-Signature-Timestamp')
  const body = await request.clone().text()

  if (signature === null || timestamp === null || !body) {
    return false
  }

  return crypto.subtle.verify(
    key.algorithm,
    key,
    hex.decodeHex(signature),
    new TextEncoder().encode(timestamp + body)
  )
}

export const useVerify = (key: CryptoKey) => {
  return hHelpers.createMiddleware(async (c, next) => {
    if (!await verify(c.req.raw, key)) return c.json({error: 'Bad request signature'}, 401)
    await next()
  })
}
