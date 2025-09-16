import {concat} from '@std/bytes/concat'
import {decodeCbor} from '@std/cbor/decode-cbor'
import {timingSafeEqual} from '@std/crypto/timing-safe-equal'
import {decodeBase64Url, encodeBase64Url} from '@std/encoding/base64url'
import {decodeAsn1} from './asn1.ts'
import {
  alg,
  type AttestationObject,
  type AuthenticatorData,
  type AuthnPublicKeyCredential,
  type AuthnPublicKeyCredentialAssertion,
  type AuthnPublicKeyCredentialAttestation,
  type ClientDataJSON,
  type CredentialCreationOptions,
  type CredentialRequestOptions,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type PublicKeyCredentialResponseAssertion,
  type PublicKeyCredentialResponseAttestation,
  type Uint8Array_,
  verifyOptionsByKey,
} from './types.ts'

// Credential
export const credentials = {
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
      type: 'public-key' as const,

      toJSON(): PublicKeyCredentialCreationOptionsJSON {
        if (!options.publicKey) throw new Error('Missing options.publicKey')

        return JSON.parse(JSON.stringify(options.publicKey, (_, val) => {
          if (val instanceof Uint8Array || val instanceof ArrayBuffer) {
            return encodeBase64Url(val)
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
      type: 'public-key' as const,

      toJSON(): PublicKeyCredentialRequestOptionsJSON {
        if (!options.publicKey) throw new Error('Missing options.publicKey')

        return JSON.parse(JSON.stringify(options.publicKey, (_, val) => {
          if (val instanceof Uint8Array || val instanceof ArrayBuffer) {
            return encodeBase64Url(val)
          }
          return val
        }))
      },
    }
  },
}

// PublicKeyCredential
const parseClientDataJSON = (clientDataJSON: string) => {
  const clientDataText = new TextDecoder().decode(decodeBase64Url(clientDataJSON))
  return JSON.parse(clientDataText) as ClientDataJSON
}

const parseAuthenticatorData = (authData: string | Uint8Array_): AuthenticatorData => {
  const authenticatorData = authData instanceof Uint8Array ? new Uint8Array(authData) : decodeBase64Url(authData)
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
      return parseAuthenticatorData(attestation.authData as unknown as Uint8Array_)
    },
  }
}

/**
 * The interface provides reverse methods for working with browser-based
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential PublicKeyCredential}
 */
export const publicKeyCredential = {
  /**
   * @param cred - JSON representation of the PublicKeyCredential object
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
  fromJSON(cred: PublicKeyCredentialJSON): AuthnPublicKeyCredential {
    return {
      authenticatorAttachment: cred.authenticatorAttachment,
      id: cred.id,
      clientExtensionResults: cred.clientExtensionResults,
      transports: (cred.response as PublicKeyCredentialResponseAttestation)?.transports,
      type: 'public-key',

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
        return (cred.response as PublicKeyCredentialResponseAttestation).publicKeyAlgorithm
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
    }
  },

  /**
   * type guard for `Attestation` (Register)
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
    & AuthnPublicKeyCredentialAttestation {
    return cred.clientData.type === 'webauthn.create'
  },

  /**
   * type guard for `Assertion` (Login)
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
    & AuthnPublicKeyCredentialAssertion {
    return cred.clientData.type === 'webauthn.get'
  },

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
  async verifyRpIdHash(cred: AuthnPublicKeyCredential, rpId: string): Promise<boolean> {
    return timingSafeEqual(cred.authData.rpIdHash, await sha256(rpId))
  },

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

const encoder = new TextEncoder()

const sha256 = async (input: string | Uint8Array_) => {
  return new Uint8Array(
    await crypto.subtle.digest(
      'SHA-256',
      typeof input === 'string' ? encoder.encode(input) : input,
    ),
  )
}
