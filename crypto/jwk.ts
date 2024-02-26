import {concat} from 'https://deno.land/std/bytes/concat.ts'
import {encodeHex, decodeHex} from 'https://deno.land/std/encoding/hex.ts'
import {
  decodeBase64Url,
  encodeBase64Url,
} from 'https://deno.land/std/encoding/base64url.ts'

export type KeyAlg = 'Ed25519' | 'P-256' | 'P-384' | 'ES256' | 'ES384'

export type DecodePubKeyHex = {
  alg: KeyAlg
  public: string
}

export type DecodeKeyHex = {
  alg: KeyAlg
  public: string
  private?: string
  extractable?: boolean
}

export const keyAlg = (alg: KeyAlg) => {
  switch (alg) {
    case 'Ed25519':
      return {name: 'Ed25519'}
    case 'P-256':
    case 'ES256':
      return {name: 'ECDSA', namedCurve: 'P-256'}
    case 'P-384':
    case 'ES384':
      return {name: 'ECDSA', namedCurve: 'P-384'}
    default:
      throw new Error(`key algorithm not supported ${alg}`)
  }
}

/**
 * @example
 * ```
 * const keys = await generateKeyPair('P-256')
 * const keysHex = encodeKeyHex(keys.private)
 *
 * console.log(keysHex.private)
 * console.log(keysHex.public)
 * ```
 */
export const encodeKeyHex = async (key: CryptoKey) => {
  if (key.type !== 'private') throw new Error(`the key type must be 'private'`)
  // https://openid.net/specs/draft-jones-json-web-key-03.html#anchor7
  const jwk = await crypto.subtle.exportKey('jwk', key)

  if (key.algorithm.name === 'ECDSA') {
    const x = decodeBase64Url(jwk.x!)
    const y = decodeBase64Url(jwk.y!)
    const d = decodeBase64Url(jwk.d!)
    const xy = concat([x, y])
    return {
      public: encodeHex(xy),
      private: encodeHex(d),
    }
  }

  if (key.algorithm.name === 'Ed25519') {
    const x = decodeBase64Url(jwk.x!)
    const d = decodeBase64Url(jwk.d!)
    return {
      public: encodeHex(x),
      private: encodeHex(d),
    }
  }

  throw new Error('Unsupported key algorithm')
}

const decodePubKeyHex = (options: DecodePubKeyHex) => {
  switch (options.alg) {
    case 'Ed25519': {
      const xy = decodeHex(options.public)
      if (xy.byteLength !== 32) {
        throw new Error('public key length must be 32 bytes')
      }
      const x = encodeBase64Url(xy)
      return {x}
    }
    case 'P-256':
    case 'ES256': {
      const xy = decodeHex(options.public)
      if (xy.byteLength !== 64) {
        throw new Error('public key length must be 64 bytes')
      }
      const x = encodeBase64Url(xy.slice(0, 32))
      const y = encodeBase64Url(xy.slice(32))
      return {x, y}
    }
    case 'P-384':
    case 'ES384': {
      const xy = decodeHex(options.public)
      if (xy.byteLength !== 96) {
        throw new Error('public key length must be 96 bytes')
      }
      const x = encodeBase64Url(xy.slice(0, 48))
      const y = encodeBase64Url(xy.slice(48))
      return {x, y}
    }
    default:
      throw new Error(`key algorithm not supported ${options.alg}`)
  }
}

export const decodeKeyHex = (options: DecodeKeyHex) => {
  options.extractable ??= false

  const getD = (keyLen: number) => {
    if (!options.private) return {}
    const buf = decodeHex(options.private)
    if (buf.byteLength !== keyLen) {
      throw new Error(`private key length must be ${keyLen} bytes`)
    }
    return {d: encodeBase64Url(buf)}
  }

  switch (options.alg) {
    case 'Ed25519':
      return crypto.subtle.importKey(
        'jwk',
        {kty: 'OKP', crv: 'Ed25519', ...decodePubKeyHex(options), ...getD(32)},
        {name: 'Ed25519'},
        options.extractable,
        [options.private ? 'sign' : 'verify']
      )
    case 'P-256':
    case 'ES256':
      return crypto.subtle.importKey(
        'jwk',
        {kty: 'EC', crv: 'P-256', ...decodePubKeyHex(options), ...getD(32)},
        {name: 'ECDSA', namedCurve: 'P-256'},
        options.extractable,
        [options.private ? 'sign' : 'verify']
      )
    case 'P-384':
    case 'ES384':
      return crypto.subtle.importKey(
        'jwk',
        {kty: 'EC', crv: 'P-384', ...decodePubKeyHex(options), ...getD(48)},
        {name: 'ECDSA', namedCurve: 'P-384'},
        options.extractable,
        [options.private ? 'sign' : 'verify']
      )
    default:
      throw new Error(`key algorithm not supported ${options.alg}`)
  }
}
