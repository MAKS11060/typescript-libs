import {hex} from "../deps.ts"

/** Import public key from `hex` string */
export const getCryptoKey = (public_key: string): Promise<CryptoKey> => {
  return crypto.subtle.importKey(
    'raw',
    hex.decodeHex(public_key),
    'Ed25519',
    true,
    ['verify'],
  )
}
