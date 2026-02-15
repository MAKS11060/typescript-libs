import {concat} from '@std/bytes/concat'
import {decodeCbor} from '@std/cbor/decode-cbor'
import {timingSafeEqual} from '@std/crypto/timing-safe-equal'
import {decodeAsn1} from './asn1.ts'
import {alg, verifyOptionsByKey} from './constants.ts'
import type {
  AttestationObject,
  AuthenticatorData,
  AuthenticatorDataFlags,
  AuthnPublicKeyCredential,
  AuthnPublicKeyCredentialAssertion,
  AuthnPublicKeyCredentialAttestation,
  ClientDataJSON,
  CredentialCreationOptions,
  CredentialRequestOptions,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialJSON,
  PublicKeyCredentialRequestOptionsJSON,
  PublicKeyCredentialResponseAssertionJSON,
  PublicKeyCredentialResponseAttestationJSON,
  Uint8Array_,
} from './types.ts'

const base64url = { // to base64url
  alphabet: 'base64url',
  omitPadding: true,
} satisfies Parameters<Uint8Array['toBase64']>[0]

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const sha256 = async (input: string | Uint8Array_) => {
  return new Uint8Array(
    await crypto.subtle.digest(
      'SHA-256',
      typeof input === 'string' ? encoder.encode(input) : input,
    ),
  )
}

interface Credential {
  /**
   * @example
   * ```ts
   * // Server
   * const cred = credentials.create({})
   * const options = cred.toJSON() // send to client
   *
   * // Client
   * await navigator.credentials.create({
   *   publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(options),
   * })
   * ```
   */
  create(options: CredentialCreationOptions): {
    type: 'public-key'
    toJSON(): PublicKeyCredentialCreationOptionsJSON
  }

  /**
   * @example
   * ```ts
   * // Server
   * const cred = credentials.get({})
   * const options = cred.toJSON() // send to client
   *
   * // Client
   * await navigator.credentials.get({
   *   publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(options),
   * })
   * ```
   */
  get(options: CredentialRequestOptions): {
    type: 'public-key'
    toJSON(): PublicKeyCredentialRequestOptionsJSON
  }
}

interface PublicKeyCredential {
  /**
   * @param cred - JSON representation of the PublicKeyCredential object
   *
   * @example
   * ```ts
   * // client (web)
   * const cred = await navigator.credentials.create({publicKey: {}})
   * if (cred instanceof PublicKeyCredential) {
   *   const data = cred.toJSON() // send to server
   * }
   *
   * // server
   * const cred = publicKeyCredential.fromJSON(data) // parse credential from client
   * ```
   */
  fromJSON(cred: PublicKeyCredentialJSON): AuthnPublicKeyCredential

  /**
   * type guard for `Attestation` (Register)
   *
   * @example
   * ```ts
   * const cred = publicKeyCredential.fromJSON(data) // parse credential from client
   *
   * if (publicKeyCredential.isAttestation(cred)) {
   *  cred.attestation
   *  cred.publicKey
   *  cred.publicKeyAlgorithm
   *  cred.transports
   * }
   * ```
   */
  isAttestation(cred: AuthnPublicKeyCredential): cred is
    & Omit<AuthnPublicKeyCredential, keyof AuthnPublicKeyCredentialAssertion>
    & AuthnPublicKeyCredentialAttestation

  /**
   * type guard for `Assertion` (Login)
   *
   * @example
   * ```ts
   * const cred = publicKeyCredential.fromJSON(data) // parse credential from client
   *
   * if (publicKeyCredential.isAssertion(cred)) {
   *   cred.assertion
   * }
   * ```
   */
  isAssertion(cred: AuthnPublicKeyCredential): cred is
    & Omit<AuthnPublicKeyCredential, keyof AuthnPublicKeyCredentialAttestation>
    & AuthnPublicKeyCredentialAssertion

  /**
   * The method extracts the public key from the `spki` format and converts it to {@linkcode CryptoKey}
   *
   * @example
   * ```ts
   * const cred = publicKeyCredential.fromJSON(data)
   *
   * if (isAttestation(cred)) {
   *   const publicKey = await publicKeyCredential.getPublicKey(cred)
   * }
   * ```
   */
  getPublicKey(
    cred: Pick<AuthnPublicKeyCredentialAttestation, 'publicKey' | 'publicKeyAlgorithm'>,
  ): Promise<CryptoKey>

  /**
   * The method compares the `rpId` hash received from the client
   *
   * @example
   * ```ts
   * const cred = publicKeyCredential.fromJSON(data)
   *
   * await publicKeyCredential.verifyRpIdHash(cred, 'example.com') // true
   * ```
   */
  verifyRpIdHash(cred: AuthnPublicKeyCredential, rpId: string): Promise<boolean>

  /**
   * The method verifies the `signature` using the public key obtained during `attestation`
   *
   * @example
   * ```ts
   * const cred = publicKeyCredential.fromJSON(data)
   *
   * if (publicKeyCredential.isAssertion(cred)) {
   *   await publicKeyCredential.verifySignature(cred, publicKey)
   * }
   * ```
   */
  verifySignature(
    cred: Pick<AuthnPublicKeyCredential, 'rawClientData' | 'rawAuthData'> & AuthnPublicKeyCredentialAssertion,
    publicKey: CryptoKey,
  ): Promise<boolean>
}

/**
 * The server version of the [Credential Management API](https://developer.mozilla.org/en-US/docs/Web/API/Credential_Management_API)
 * for working with [PublicKeyCredential](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential)
 */
export const credentials: Credential = {
  /**
   * @example
   * ```ts
   * // Server
   * const cred = credentials.create({})
   * const options = cred.toJSON() // send to client
   *
   * // Client
   * await navigator.credentials.create({
   *   publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(options),
   * })
   * ```
   */
  create(options: CredentialCreationOptions) {
    return {
      type: 'public-key',

      toJSON(): PublicKeyCredentialCreationOptionsJSON {
        if (!options.publicKey) throw new Error('Missing options.publicKey')

        return JSON.parse(JSON.stringify(options.publicKey, (_, val) => {
          if (val instanceof Uint8Array || val instanceof ArrayBuffer) {
            return new Uint8Array(val).toBase64(base64url)
          }
          return val
        }))
      },
    }
  },

  /**
   * @example
   * ```ts
   * // Server
   * const cred = credentials.get({})
   * const options = cred.toJSON() // send to client
   *
   * // Client
   * await navigator.credentials.get({
   *   publicKey: PublicKeyCredential.parseRequestOptionsFromJSON(options),
   * })
   * ```
   */
  get(options: CredentialRequestOptions) {
    return {
      type: 'public-key',

      toJSON(): PublicKeyCredentialRequestOptionsJSON {
        if (!options.publicKey) throw new Error('Missing options.publicKey')

        return JSON.parse(JSON.stringify(options.publicKey, (_, val) => {
          if (val instanceof Uint8Array || val instanceof ArrayBuffer) {
            return new Uint8Array(val).toBase64(base64url)
          }
          return val
        }))
      },
    }
  },
}

// PublicKeyCredential
const parseClientDataJSON = (clientDataJSON: string) => {
  const clientDataText = decoder.decode(Uint8Array.fromBase64(clientDataJSON, {alphabet: 'base64url'}))
  return JSON.parse(clientDataText) as ClientDataJSON
}

const parseAuthenticatorData = (authData: string | Uint8Array_): AuthenticatorData => {
  const authenticatorData = authData instanceof Uint8Array
    ? new Uint8Array(authData)
    : Uint8Array.fromBase64(authData, {alphabet: 'base64url'})
  const view = new DataView(authenticatorData.buffer)

  return {
    rpIdHash: authenticatorData.slice(0, 32),
    flags: parseAuthenticatorDataFlags(view.getUint8(32)),
    get rawFlags() {
      return view.getUint8(32)
    },
    signCount: view.getUint32(33),
    get attestedCredentialData() {
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

/**
 * The function converts `flags` to an object
 *
 * @param flags - A bitfield that indicates various attributes that were asserted by the authenticator
 * @returns Representation of `flags` as an object
 */
export const parseAuthenticatorDataFlags = (flags: number): AuthenticatorDataFlags => ({
  userPresent: !!(flags & (1 << 0)),
  userVerified: !!(flags & (1 << 2)),
  backupEligibility: !!(flags & (1 << 3)),
  backupState: !!(flags & (1 << 4)),
  attestedCredentialData: !!(flags & (1 << 6)),
  extensionData: !!(flags & (1 << 7)),
})

/** https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorAttestationResponse/attestationObject#value */
const parseAttestation = (response: PublicKeyCredentialResponseAttestationJSON) => {
  const attestationBuffer = Uint8Array.fromBase64(response.attestationObject, {alphabet: 'base64url'})
  const attestation = decodeCbor(attestationBuffer) as unknown as AttestationObject

  return {
    ...attestation,
    get authData() {
      return parseAuthenticatorData(attestation.authData as unknown as Uint8Array_)
    },
  }
}

/**
 * The interface provides reverse methods for working with browser-based
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential PublicKeyCredential}
 */
export const publicKeyCredential: PublicKeyCredential = {
  fromJSON(cred: PublicKeyCredentialJSON): AuthnPublicKeyCredential {
    return {
      authenticatorAttachment: cred.authenticatorAttachment,
      id: cred.id,
      clientExtensionResults: cred.clientExtensionResults,
      transports: (cred.response as PublicKeyCredentialResponseAttestationJSON)?.transports,
      type: 'public-key',

      get rawId() {
        return Uint8Array.fromBase64(cred.rawId, {alphabet: 'base64url'})
      },

      get authData() {
        return parseAuthenticatorData(this.rawAuthData)
      },

      get rawAuthData() {
        return Uint8Array.fromBase64(cred.response.authenticatorData, {alphabet: 'base64url'})
      },

      get clientData() {
        return parseClientDataJSON(cred.response.clientDataJSON)
      },

      get rawClientData() {
        return Uint8Array.fromBase64(cred.response.clientDataJSON, {alphabet: 'base64url'})
      },

      // register data
      get attestation() {
        if (!(cred.response as PublicKeyCredentialResponseAttestationJSON).attestationObject) return
        return parseAttestation(cred.response as PublicKeyCredentialResponseAttestationJSON)
      },

      get rawAttestation() {
        if (!(cred.response as PublicKeyCredentialResponseAttestationJSON).attestationObject) return
        return Uint8Array.fromBase64((cred.response as PublicKeyCredentialResponseAttestationJSON).attestationObject, {
          alphabet: 'base64url',
        })
      },

      get publicKey() {
        const {publicKey} = cred.response as PublicKeyCredentialResponseAttestationJSON
        return publicKey ? Uint8Array.fromBase64(publicKey, {alphabet: 'base64url'}) : undefined
      },

      get publicKeyAlgorithm() {
        return (cred.response as PublicKeyCredentialResponseAttestationJSON).publicKeyAlgorithm
      },

      // login data
      get signature() {
        const {signature} = cred.response as PublicKeyCredentialResponseAssertionJSON
        return signature ? Uint8Array.fromBase64(signature, {alphabet: 'base64url'}) : undefined
      },

      get userHandle() {
        const {userHandle} = cred.response as PublicKeyCredentialResponseAssertionJSON
        return userHandle ? Uint8Array.fromBase64(userHandle, {alphabet: 'base64url'}) : null
      },
    }
  },

  isAttestation(cred: AuthnPublicKeyCredential): cred is
    & Omit<AuthnPublicKeyCredential, keyof AuthnPublicKeyCredentialAssertion>
    & AuthnPublicKeyCredentialAttestation {
    return cred.clientData.type === 'webauthn.create'
  },

  isAssertion(cred: AuthnPublicKeyCredential): cred is
    & Omit<AuthnPublicKeyCredential, keyof AuthnPublicKeyCredentialAttestation>
    & AuthnPublicKeyCredentialAssertion {
    return cred.clientData.type === 'webauthn.get'
  },

  getPublicKey(
    cred: Pick<AuthnPublicKeyCredentialAttestation, 'publicKey' | 'publicKeyAlgorithm'>,
  ): Promise<CryptoKey> {
    const algorithm = alg.get(cred.publicKeyAlgorithm)!
    if (!algorithm) throw new Error(`Unsupported algorithm: ${cred.publicKeyAlgorithm}`)

    return crypto.subtle.importKey(
      'spki', // (Subject Public Key Info)
      cred.publicKey,
      algorithm,
      true,
      ['verify'],
    )
  },

  async verifyRpIdHash(cred: AuthnPublicKeyCredential, rpId: string): Promise<boolean> {
    return timingSafeEqual(cred.authData.rpIdHash, await sha256(rpId))
  },

  async verifySignature(
    cred: Pick<AuthnPublicKeyCredential, 'rawClientData' | 'rawAuthData'> & AuthnPublicKeyCredentialAssertion,
    publicKey: CryptoKey,
  ): Promise<boolean> {
    return await crypto.subtle.verify(
      verifyOptionsByKey.get(publicKey.algorithm.name)!,
      publicKey,
      publicKey.algorithm.name === 'ECDSA' //
        ? decodeAsn1.DER_ECDSA_Sign(cred.signature)
        : cred.signature,
      concat([cred.rawAuthData, await sha256(cred.rawClientData)]),
    )
  },
}
