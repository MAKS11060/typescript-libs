import {COSEAlgorithmIdentifier, PublicKeyCredentialParameters} from './types.ts'

/**
 * A recommended set of algorithms that covers all devices. The list is taken from
 * [MDN](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialCreationOptions#pubkeycredparams)
 *
 * |    alg | name                        |
 * | -----: | --------------------------- |
 * |   `-8` | `Ed25519`                   |
 * |   `-7` | `ECDSA P-256`               |
 * | `-257` | `RSASSA-PKCS1-v1_5 SHA-256` |
 *
 * @example
 * ```ts
 * const cred = credentials.create({
 *   publicKey: {
 *     pubKeyCredParams
 *   }
 * })
 * ```
 */
export const pubKeyCredParams = [
  {type: 'public-key', alg: -8}, //   Ed25519
  {type: 'public-key', alg: -7}, //   ECDSA              P-256
  {type: 'public-key', alg: -257}, // RSASSA-PKCS1-v1_5  SHA-256
] as PublicKeyCredentialParameters[]

export const verifyOptionsByKey = new Map([
  ['Ed25519', {name: 'Ed25519'}],
  ['ECDSA', {name: 'ECDSA', hash: 'SHA-256'}],
  ['RSASSA-PKCS1-v1_5', {name: 'RSASSA-PKCS1-v1_5'}],
])

export const alg: Map<
  COSEAlgorithmIdentifier,
  AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams
> = new Map([
  [-7, {name: 'ECDSA', namedCurve: 'P-256'}], // ECDSA with P-256 and SHA-256
  [-8, {name: 'Ed25519'}], // EdDSA with Ed25519
  // [-35, {name: 'ECDSA', namedCurve: 'P-384'}], // ECDSA with P-384 and SHA-384
  // [-36, {name: 'ECDSA', namedCurve: 'P-521'}], // ECDSA with P-521 and SHA-512

  // [-40, {name: 'EdDSA', namedCurve: 'Ed448'}], // TODO: TEST
  // [-47, {name: 'ECDSA', namedCurve: 'secp256k1'}], // TODO: TEST

  [-257, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'}], // RSASSA-PKCS1-v1_5 with SHA-256
  // [-258, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-384'}], // RSASSA-PKCS1-v1_5 with SHA-384
  // [-259, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512'}], // RSASSA-PKCS1-v1_5 with SHA-512

  // [-260, {name: 'RSA_PSS', hash: 'SHA-256'}], // TODO: TEST
  // [-261, {name: 'RSA_PSS', hash: 'SHA-384'}], // TODO: TEST
  // [-262, {name: 'RSA_PSS', hash: 'SHA-512'}], // TODO: TEST
])
