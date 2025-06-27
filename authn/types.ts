//////////////////////////////// INPUT
export type PublicKeyCredentialJSON = {
  authenticatorAttachment: AuthenticatorAttachment
  clientExtensionResults: {}
  id: string
  rawId: string
  response:
    | PublicKeyCredentialResponseAttestation
    | PublicKeyCredentialResponseAssertion
  type: 'public-key'
}

export type PublicKeyCredentialResponseAttestation = { // Attestation
  attestationObject: string
  authenticatorData: string
  clientDataJSON: string
  publicKey: string
  publicKeyAlgorithm: number
  transports: AuthenticatorTransport[]
}

export type PublicKeyCredentialResponseAssertion = { // Assertion
  authenticatorData: string
  clientDataJSON: string
  signature: string
  userHandle?: string | null
}

//////////////////////////////// OUTPUT

/** https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorResponse/clientDataJSON */
export type ClientDataJSON = {
  type: 'webauthn.create' | 'webauthn.get'
  challenge: string
  crossOrigin: boolean
  origin: string
  /** @deprecated */
  tokenBinding?: {
    status: 'supported' | 'present'
    id: string
  }
  /**
   * Contains the fully qualified top-level origin of the relying party.
   *
   * It is set only if it {@linkcode ClientDataJSON.crossOrigin} is `true`.
   */
  topOrigin?: string
}

/** https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data */
export type AuthenticatorData = {
  /** https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data#rpidhash */
  rpIdHash: Uint8Array
  /** https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data#flags */
  flags: {
    /** User Present */
    up: boolean
    /** User Verified */
    uv: boolean
    /** Backup Eligibility */
    be: boolean
    /** Backup State */
    bs: boolean
    /** Attested credential data present */
    at: boolean
    /** Extension data present */
    ed: boolean
  }
  /** https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data#signcount */
  counter: number
  /** https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data#attestedcredentialdata */
  attestedCredentialData: null | {
    /** The Authenticator Attestation Globally Unique Identifier */
    AAGUID: Uint8Array
    credentialIdLength: number
    /**  A unique identifier for this credential so that it can be requested for future authentications */
    credentialId: Uint8Array
    /** A `COSE`-encoded public key */
    credentialPublicKey: Uint8Array
  }
  // if flags.ed === true
  // get extensions() {} // TODO: https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data#extensions
}

/** https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorAttestationResponse/attestationObject */
export type AttestationObject = {
  // authData: Uint8Array
  authData: AuthenticatorData
  /** https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorAttestationResponse/attestationObject#fmt */
  fmt: AttestationObjectFmt
  attStmt: {} | {
    alg: number
    sig: Uint8Array
    x5c: Uint8Array[]
    // attestnCert?: unknown
  }
}

export type AttestationObjectFmt = 'packed' | 'tpm' | 'android-key' | 'android-safetynet' | 'fido-u2f' | 'none'

export interface AuthnPublicKeyCredential {
  authenticatorAttachment: AuthenticatorAttachment
  clientExtensionResults: {}
  id: string
  rawId: Uint8Array

  // response
  /** https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data */
  authData: AuthenticatorData
  /** https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorResponse/clientDataJSON */
  clientData: ClientDataJSON
  rawAuthData: Uint8Array
  rawClientData: Uint8Array

  // Attestation (Optional)
  /** https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorAttestationResponse/attestationObject */
  attestation?: AttestationObject
  /**
   * Get `Attestation` publicKey
   */
  publicKey?: Uint8Array
  /** Get `Attestation` {@link https://www.iana.org/assignments/cose/cose.xhtml#algorithms COSE Algorithm Identifier} */
  publicKeyAlgorithm?: number
  transports?: AuthenticatorTransport[]

  // Assertion (Optional)
  /**
   * `Assertion` signature
   *
   * ## Notes
   * | alg  | alg name            | sign format |
   * | ---: | :---                | ---         |
   * | -7   | `ECDSA P-256`       | `ASN.1 DER` |
   * | -8   | `Ed25519`           | `RAW`       |
   * | -257 | `RSASSA-PKCS1-v1_5` | `RAW`       |
   */
  signature?: Uint8Array
  /** User identifier, specified as `user.id` in the options passed to the originating `navigator.credentials.create()` */
  userHandle?: Uint8Array | null

  type: 'public-key'
}

export interface AuthnPublicKeyCredentialAttestation {
  attestation: AttestationObject
  publicKey: Uint8Array
  publicKeyAlgorithm: number
  transports: AuthenticatorTransport[]
}

export interface AuthnPublicKeyCredentialAssertion {
  signature: Uint8Array
  userHandle: Uint8Array | null
}
