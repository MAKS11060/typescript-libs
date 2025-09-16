import {concat} from '@std/bytes/concat'
import {decodeCbor} from '@std/cbor/decode-cbor'
import {timingSafeEqual} from '@std/crypto/timing-safe-equal'
import {decodeBase64Url, encodeBase64Url} from '@std/encoding/base64url'
import {asn1Parse} from './asn1.ts'
import type {
  AttestationObject,
  AuthenticatorData,
  AuthnPublicKeyCredential,
  AuthnPublicKeyCredentialAssertion,
  AuthnPublicKeyCredentialAttestation,
  ClientDataJSON,
  PublicKeyCredentialJSON,
  PublicKeyCredentialResponseAssertion,
  PublicKeyCredentialResponseAttestation,
  Uint8Array_,
} from './types.ts'

/**
 * Default `pubKeyCredParams` for `navigator.credentials.create()`
 *
 * - Ed25519
 * - ECDSA P-256
 * - RSASSA-PKCS1-v1_5 SHA-256
 *
 * {@link MDN https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialCreationOptions#pubkeycredparams}
 */
export const PubKeyCredParams = [
  {type: 'public-key', alg: -8}, //   Ed25519
  {type: 'public-key', alg: -7}, //   ECDSA              P-256
  {type: 'public-key', alg: -257}, // RSASSA-PKCS1-v1_5  SHA-256
] as PublicKeyCredentialParameters[]

const alg = new Map([
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

const verifyOptionsByKey = new Map([
  ['Ed25519', {name: 'Ed25519'}],
  ['ECDSA', {name: 'ECDSA', hash: 'SHA-256'}],
  ['RSASSA-PKCS1-v1_5', {name: 'RSASSA-PKCS1-v1_5'}],
])

const encoder = new TextEncoder()

const toUint8Array = (source: BufferSource | Uint8Array_): Uint8Array_ => {
  if (source instanceof Uint8Array) {
    return source as Uint8Array_ // Already a Uint8Array
  } else if (source instanceof ArrayBuffer || source instanceof SharedArrayBuffer) {
    return new Uint8Array(source) as Uint8Array_
  } else if (ArrayBuffer.isView(source)) { // Covers other TypedArrays and DataView
    return new Uint8Array(source.buffer, source.byteOffset, source.byteLength)
  }

  throw new Error('Unsupported BufferSource type')
}

const sha256 = async (input: string | Uint8Array_) => {
  return new Uint8Array(
    await crypto.subtle.digest(
      'SHA-256',
      typeof input === 'string' ? encoder.encode(input) : input,
    ),
  )
}

/**
 * @example
 * ```ts
 * // Server
 * const options = publicKeyCreateOptionsToJSON({})
 *
 * // Client
 * await navigator.credentials.create({
 *   publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(options),
 * })
 * ```
 */
export const publicKeyCreateOptionsToJSON = (
  options: PublicKeyCredentialCreationOptions,
): PublicKeyCredentialCreationOptionsJSON => {
  const {
    challenge,
    user,
    excludeCredentials,
    ...rest
  } = options

  return {
    challenge: encodeBase64Url(toUint8Array(challenge)),
    user: {
      ...options.user,
      id: encodeBase64Url(toUint8Array(user.id)),
    },
    excludeCredentials: excludeCredentials?.map((v) => ({
      ...v,
      id: encodeBase64Url(toUint8Array(v.id)),
    })),
    ...rest,
  }
}

/**
 * @example
 * ```ts
 * // Server
 * const options = publicKeyRequestOptionsToJSON({})
 *
 * // Client
 * await navigator.credentials.create({
 *   publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(options),
 * })
 * ```
 */
export const publicKeyRequestOptionsToJSON = (
  options: PublicKeyCredentialRequestOptions,
): PublicKeyCredentialRequestOptionsJSON => {
  const {challenge, allowCredentials, ...rest} = options

  return {
    challenge: encodeBase64Url(toUint8Array(challenge)),
    allowCredentials: allowCredentials?.map((v) => ({
      ...v,
      id: encodeBase64Url(toUint8Array(v.id)),
    })),
    ...rest,
  }
}

// Parse PublicKeyCredentialJSON
const parseClientDataJSON = (clientDataJSON: string) => {
  const clientDataText = new TextDecoder().decode(decodeBase64Url(clientDataJSON))
  return JSON.parse(clientDataText) as ClientDataJSON
}

const parseAuthenticatorData = (_authenticatorData: string | Uint8Array): AuthenticatorData => {
  const authenticatorData = _authenticatorData instanceof Uint8Array
    ? new Uint8Array(_authenticatorData)
    : decodeBase64Url(_authenticatorData)

  const view = new DataView(authenticatorData.buffer)

  return {
    rpIdHash: authenticatorData.slice(0, 32),
    flags: {
      userPresent: !!(view.getUint8(32) & (1 << 0)),
      userVerified: !!(view.getUint8(32) & (1 << 2)),
      backupEligibility: !!(view.getUint8(32) & (1 << 3)),
      backupState: !!(view.getUint8(32) & (1 << 4)),
      attestedCredentialData: !!(view.getUint8(32) & (1 << 6)),
      extensionData: !!(view.getUint8(32) & (1 << 7)),
    },
    signCount: view.getUint32(33, false), // Big-endian
    get attestedCredentialData(): AuthenticatorData['attestedCredentialData'] {
      if (!this.flags.attestedCredentialData) return
      const credentialIdLength = view.getUint16(53) // 53,54
      return {
        aaguid: authenticatorData.slice(37, 53),
        credentialIdLength,
        credentialId: authenticatorData.slice(55, 55 + credentialIdLength),
        credentialPublicKey: authenticatorData.slice(55 + credentialIdLength),
      }
    },
    get extensions() {
      if (!this.flags.extensionData) return
      const credentialIdLength = this.flags.attestedCredentialData ? view.getUint16(53) : 0
      return authenticatorData.slice(37 + credentialIdLength)
    },
  }
}

/** https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorAttestationResponse/attestationObject#value */
const parseAttestation = (response: PublicKeyCredentialResponseAttestation) => {
  const attestationBuffer = decodeBase64Url(response.attestationObject)
  const attestation = decodeCbor(attestationBuffer) as AttestationObject

  return {
    ...attestation,
    get authData() {
      return parseAuthenticatorData(attestation.authData as unknown as Uint8Array)
    },
  }
}

/**
 * @example
 * ```ts
 * // Client
 * const cred = await navigator.credentials.get({
 *   publicKey: PublicKeyCredential.parseRequestOptionsFromJSON({}),
 * })
 * const data = cred.toJSON()
 *
 * // Server
 * const cred = publicKeyCredentialFromJSON(data)
 * console.log(cred)
 * console.log(cred.authData)
 *
 * if (isAttestation(cred)) {
 *   console.log(cred.authData.attestedCredentialData)
 *   const publicKey = await getPublicKey(cred)
 * }
 *
 * if (isAssertion(cred)) {
 *   console.log(cred)
 *   console.log(cred.authData)
 * }
 * ```
 */
export const publicKeyCredentialFromJSON = (cred: PublicKeyCredentialJSON): AuthnPublicKeyCredential => {
  return {
    authenticatorAttachment: cred.authenticatorAttachment,

    id: cred.id,

    get rawId() {
      return decodeBase64Url(cred.rawId)
    },

    get authData() {
      return parseAuthenticatorData(this.rawAuthData)
    },

    get rawAuthData() {
      return decodeBase64Url(cred.response.authenticatorData)
    },

    get clientData() {
      return parseClientDataJSON(cred.response.clientDataJSON)
    },

    get rawClientData() {
      return decodeBase64Url(cred.response.clientDataJSON)
    },

    // register data
    get attestation() {
      if (!(cred.response as PublicKeyCredentialResponseAttestation).attestationObject) return
      return parseAttestation(cred.response as PublicKeyCredentialResponseAttestation)
    },

    get publicKey() {
      const {publicKey} = cred.response as PublicKeyCredentialResponseAttestation
      return publicKey ? decodeBase64Url(publicKey) : undefined
    },

    get publicKeyAlgorithm() {
      return ((cred.response as PublicKeyCredentialResponseAttestation).publicKeyAlgorithm)
    },

    // login data
    get signature() {
      const {signature} = cred.response as PublicKeyCredentialResponseAssertion
      return signature ? decodeBase64Url(signature) : undefined
    },

    get userHandle() {
      const {userHandle} = cred.response as PublicKeyCredentialResponseAssertion
      return userHandle ? decodeBase64Url(userHandle) : null
    },

    clientExtensionResults: cred.clientExtensionResults,
    transports: (cred.response as PublicKeyCredentialResponseAttestation)?.transports,
    type: 'public-key',
  }
}

/**
 * type guard for `Attestation` (Register)
 * @example
 * ```ts
 * const cred = publicKeyCredentialFromJSON({})
 *
 * if (isAttestation(cred)) {
 *  cred.attestation
 *  cred.publicKey
 *  cred.publicKeyAlgorithm
 *  cred.transports
 * }
 * ```
 */
export const isAttestation = (
  cred: AuthnPublicKeyCredential,
): cred is
  & Omit<AuthnPublicKeyCredential, keyof AuthnPublicKeyCredentialAssertion>
  & AuthnPublicKeyCredentialAttestation => {
  return cred.clientData.type === 'webauthn.create'
}

/**
 * type guard for `Assertion` (Login)
 * @example
 * ```ts
 * const cred = publicKeyCredentialFromJSON({})
 *
 * if (isAssertion(cred)) {
 *   cred.assertion
 * }
 * ```
 */
export const isAssertion = (
  cred: AuthnPublicKeyCredential,
): cred is
  & Omit<AuthnPublicKeyCredential, keyof AuthnPublicKeyCredentialAttestation>
  & AuthnPublicKeyCredentialAssertion => {
  return cred.clientData.type === 'webauthn.get'
}

/**
 * @example
 * ```ts
 * const cred = publicKeyCredentialFromJSON({})
 *
 * const challenge = decodeBase64Url('CHALLENGE')
 * verifyChallenge(cred, challenge) // boolean
 * ```
 */
export const verifyChallenge = (cred: AuthnPublicKeyCredential, challenge: Uint8Array): boolean => {
  return timingSafeEqual(decodeBase64Url(cred.clientData.challenge), challenge)
}

/**
 * @example
 * ```ts
 * const cred = publicKeyCredentialFromJSON({})
 *
 * verifyRpIdHash(cred, 'example.com') // true
 * ```
 */
export const verifyRpIdHash = async (cred: AuthnPublicKeyCredential, rpId: string): Promise<boolean> => {
  return timingSafeEqual(cred.authData.rpIdHash, await sha256(rpId))
}

/**
 * @example
 * ```ts
 * const cred = publicKeyCredentialFromJSON({})
 *
 * if (isAssertion(cred)) {
 *   await verifySignature(cred, publicKey)
 * }
 * ```
 */
export const verifySignature = async (
  cred: Pick<AuthnPublicKeyCredential, 'rawClientData' | 'rawAuthData'> & AuthnPublicKeyCredentialAssertion,
  publicKey: CryptoKey,
): Promise<boolean> => {
  return await crypto.subtle.verify(
    verifyOptionsByKey.get(publicKey.algorithm.name)!,
    publicKey,
    publicKey.algorithm.name === 'ECDSA' //
      ? asn1Parse(cred.signature)
      : cred.signature,
    concat([cred.rawAuthData, await sha256(cred.rawClientData)]),
  )
}

/**
 * @example
 * ```ts
 * const cred = publicKeyCredentialFromJSON({})
 *
 * if (isAttestation(cred)) {
 *   const publicKey = await getPublicKey(cred)
 * }
 * ```
 */
export const getPublicKey = (
  cred: Pick<AuthnPublicKeyCredentialAttestation, 'publicKey' | 'publicKeyAlgorithm'>,
): Promise<CryptoKey> => {
  const algorithm = alg.get(cred.publicKeyAlgorithm)!
  if (!algorithm) throw new Error(`Unsupported algorithm: ${cred.publicKeyAlgorithm}`)

  return crypto.subtle.importKey(
    'spki', // (Subject Public Key Info)
    cred.publicKey,
    algorithm,
    true,
    ['verify'],
  )
}
