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
  /**
   * SHA-256 hash of the `RP ID`
   *
   * [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data#rpidhash)
   */
  rpIdHash: Uint8Array_
  /** https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data#flags */
  flags: {
    /** `UP` User Present */
    userPresent: boolean
    /** `UV` User Verified */
    userVerified: boolean
    /** `BE` Backup Eligibility */
    backupEligibility: boolean
    /** `BS` Backup State */
    backupState: boolean
    /** `AT` Attested credential Data */
    attestedCredentialData: boolean
    /** `ED` Extension data */
    extensionData: boolean
  }
  /** https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data#signcount */
  signCount: number
  /** https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data#attestedcredentialdata */
  attestedCredentialData?: {
    /** The Authenticator Attestation Globally Unique Identifier */
    aaguid: Uint8Array_
    credentialIdLength: number
    /** A unique identifier for this credential so that it can be requested for future authentications */
    credentialId: Uint8Array_
    /** A `COSE`-encoded public key */
    credentialPublicKey: Uint8Array_
  }
  /**
   * An optional `CBOR` map containing the response outputs from extensions processed by the authenticator
   *
   * [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data#extensions)
   */
  extensions?: Uint8Array_
}

/** https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorAttestationResponse/attestationObject */
export type AttestationObject = {
  authData: AuthenticatorData
  /** https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorAttestationResponse/attestationObject#fmt */
  fmt: AttestationObjectFmt
  attStmt: {} | {
    alg: number
    sig: Uint8Array_
    x5c: Uint8Array_[]
    // attestnCert?: unknown
  }
}

export type AttestationObjectFmt = 'packed' | 'tpm' | 'android-key' | 'android-safetynet' | 'fido-u2f' | 'none'

export interface AuthnPublicKeyCredential {
  authenticatorAttachment: AuthenticatorAttachment
  clientExtensionResults: {}
  id: string
  rawId: Uint8Array_

  // response
  /** https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data */
  authData: AuthenticatorData
  /** https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorResponse/clientDataJSON */
  clientData: ClientDataJSON
  rawAuthData: Uint8Array_
  rawClientData: Uint8Array_

  // Attestation (Optional)
  /** https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorAttestationResponse/attestationObject */
  attestation?: AttestationObject
  /** Get `Attestation` publicKey */
  publicKey?: Uint8Array_
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
  signature?: Uint8Array_
  /** User identifier, specified as `user.id` in the options passed to the originating `navigator.credentials.create()` */
  userHandle?: Uint8Array_ | null

  type: 'public-key'
}

export interface AuthnPublicKeyCredentialAttestation {
  attestation: AttestationObject
  publicKey: Uint8Array_
  publicKeyAlgorithm: number
  transports: AuthenticatorTransport[]
}

export interface AuthnPublicKeyCredentialAssertion {
  signature: Uint8Array_
  userHandle: Uint8Array_ | null
}

export type Uint8Array_ = ReturnType<Uint8Array['slice']>

// Credentials
export interface CredentialCreationOptions {
  publicKey?: PublicKeyCredentialCreationOptions
  // signal?: AbortSignal
}

// Create
export interface PublicKeyCredentialCreationOptions {
  attestation?: AttestationConveyancePreference
  authenticatorSelection?: AuthenticatorSelectionCriteria
  challenge: Uint8Array_
  excludeCredentials?: PublicKeyCredentialDescriptor[]
  extensions?: AuthenticationExtensionsClientInputs
  pubKeyCredParams: PublicKeyCredentialParameters[]
  rp: PublicKeyCredentialRpEntity
  timeout?: number
  user: PublicKeyCredentialUserEntity
}

export interface AuthenticatorSelectionCriteria {
  authenticatorAttachment?: AuthenticatorAttachment
  requireResidentKey?: boolean
  residentKey?: ResidentKeyRequirement
  userVerification?: UserVerificationRequirement
}

export interface PublicKeyCredentialParameters {
  alg: COSEAlgorithmIdentifier
  type: PublicKeyCredentialType
}

export interface PublicKeyCredentialEntity {
  name: string
}

export interface PublicKeyCredentialRpEntity extends PublicKeyCredentialEntity {
  id?: string
}

export interface PublicKeyCredentialUserEntity extends PublicKeyCredentialEntity {
  displayName: string
  id: Uint8Array_
}

export interface PublicKeyCredentialDescriptor {
  id: Uint8Array_
  transports?: AuthenticatorTransport[]
  type: PublicKeyCredentialType
}

export interface AuthenticationExtensionsClientInputs {
  appid?: string
  credProps?: boolean
  credentialProtectionPolicy?: string
  enforceCredentialProtectionPolicy?: boolean
  hmacCreateSecret?: boolean
  largeBlob?: AuthenticationExtensionsLargeBlobInputs
  minPinLength?: boolean
  prf?: AuthenticationExtensionsPRFInputs
}

export interface AuthenticationExtensionsLargeBlobInputs {
  support?: 'preferred' | 'required'
  read?: boolean
  write?: Uint8Array_
}

export interface AuthenticationExtensionsPRFInputs {
  eval?: AuthenticationExtensionsPRFValues
  evalByCredential?: Record<string, AuthenticationExtensionsPRFValues>
}

export interface AuthenticationExtensionsPRFValues {
  first: Uint8Array_
  second?: Uint8Array_
}

// Create JSON
export interface PublicKeyCredentialCreationOptionsJSON {
  attestation?: string
  authenticatorSelection?: AuthenticatorSelectionCriteria
  challenge: string
  excludeCredentials?: PublicKeyCredentialDescriptorJSON[]
  extensions?: AuthenticationExtensionsClientInputsJSON
  hints?: string[]
  pubKeyCredParams: PublicKeyCredentialParameters[]
  rp: PublicKeyCredentialRpEntity
  timeout?: number
  user: PublicKeyCredentialUserEntityJSON
}
interface PublicKeyCredentialDescriptorJSON {
  id: string
  transports?: string[]
  type: string
}
interface AuthenticationExtensionsClientInputsJSON {
  appid?: string
  credProps?: boolean
  largeBlob?: AuthenticationExtensionsLargeBlobInputsJSON
  prf?: AuthenticationExtensionsPRFInputsJSON
}
interface AuthenticationExtensionsLargeBlobInputsJSON {
  read?: boolean
  support?: string
  write?: string
}
interface AuthenticationExtensionsPRFInputsJSON {
  eval?: AuthenticationExtensionsPRFValuesJSON
  evalByCredential?: Record<string, AuthenticationExtensionsPRFValuesJSON>
}
interface AuthenticationExtensionsPRFValuesJSON {
  first: string
  second?: string
}
interface PublicKeyCredentialUserEntityJSON {
  displayName: string
  id: string
  name: string
}

// Get
export interface CredentialRequestOptions {
  // mediation?: CredentialMediationRequirement;
  publicKey?: PublicKeyCredentialRequestOptions
  // signal?: AbortSignal;
}

export interface PublicKeyCredentialRequestOptions {
  allowCredentials?: PublicKeyCredentialDescriptor[]
  challenge: Uint8Array_
  extensions?: AuthenticationExtensionsClientInputs
  rpId?: string
  timeout?: number
  userVerification?: UserVerificationRequirement
}

// Get JSON
export interface PublicKeyCredentialRequestOptionsJSON {
  allowCredentials?: PublicKeyCredentialDescriptorJSON[]
  challenge: string
  extensions?: AuthenticationExtensionsClientInputsJSON
  hints?: string[]
  rpId?: string
  timeout?: number
  userVerification?: string
}

//
type AttestationConveyancePreference = 'direct' | 'enterprise' | 'indirect' | 'none'
type AuthenticatorAttachment = 'cross-platform' | 'platform'
type ResidentKeyRequirement = 'discouraged' | 'preferred' | 'required'
type UserVerificationRequirement = 'discouraged' | 'preferred' | 'required'
type COSEAlgorithmIdentifier = number
type PublicKeyCredentialType = 'public-key'
type AuthenticatorTransport = 'ble' | 'hybrid' | 'internal' | 'nfc' | 'usb'
